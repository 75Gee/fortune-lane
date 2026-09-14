import { BOARD, getTile, isOwnable, MAX_PROPERTY_LEVEL } from '../board.js'
import { cardPropertyCandidates, getCard, shuffle } from '../cards.js'
import { rentForTile } from '../economy.js'
import { isDetained, ITEM_KINDS, ITEMS, TURTLE_ROLLS } from '../items.js'
import { type CardDeckKind, type GameEvent, type GameState, type PlayerState, type RandomSource } from '../types.js'

import { addEvent, playerById, roll } from './context.js'
import { createDebt } from './finance.js'
import { leaveDetention, moveBy, moveTo, sendToDetention, sendToJail } from './movement.js'
import { transitionTo } from './transitions.js'

export function finishLanding(state: GameState): void {
  if (state.phase === 'FINISHED' || state.pendingDecision || state.pendingCardChoice || state.pendingCardProperty || state.pendingWheel || state.pendingDebt || state.pendingAuction) return
  transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
}

export function openCardChoice(
  state: GameState,
  player: PlayerState,
  deckKind: CardDeckKind,
  depth: number,
  random: RandomSource,
): void {
  const deck = deckKind === 'chance' ? state.chanceDeck : state.fateDeck
  if (deck.order.length < 3) {
    deck.order.push(...shuffle(deck.discard, random))
    deck.discard = []
  }
  const cardIds = deck.order.slice(0, 3)
  const first = cardIds[0]
  const second = cardIds[1]
  const third = cardIds[2]
  if (!first || !second || !third) throw new Error(`Not enough cards in ${deckKind} deck`)
  transitionTo(state, { phase: 'WAITING_FOR_CARD_CHOICE', pendingCardChoice: {
    id: `card-${state.revision}-${depth}`,
    playerId: player.id,
    deck: deckKind,
    cardIds: [first, second, third],
    depth,
  } })
}

export function resolveChosenCard(
  state: GameState,
  player: PlayerState,
  deckKind: CardDeckKind,
  cardId: string,
  random: RandomSource,
  events: GameEvent[],
  depth: number,
): void {
  const card = getCard(cardId)
  const drawn = addEvent(state, events, {
    type: 'CARD_DRAWN', playerId: player.id, cardId, cardResult: card.description,
    message: `${player.name} 抽到「${card.title}」：${card.description}`,
  })
  const result = (text: string) => {
    drawn.cardResult = `${card.reason}，${text}。`
    drawn.message = `${player.name} 抽到「${card.title}」：${drawn.cardResult}`
  }
  const applyMoney = (amount: number) => {
    drawn.amount = amount
    result(amount > 0 ? `获得${amount}元` : amount < 0 ? `${player.cash >= -amount ? '支付' : '需支付'}${-amount}元` : '本次无需付费')
    if (amount >= 0) {
      player.cash += amount
      addEvent(state, events, {
        type: 'MONEY_CHANGED', playerId: player.id, amount,
        message: amount === 0 ? `${player.name} 无需支付${card.title}费用` : `${player.name} 因${card.title}获得 ${amount} 元`,
      })
    } else createDebt(state, player, null, -amount, card.title, events, { type: 'READY_TO_END' })
  }
  const describeMove = () => {
    const move = events.slice(events.indexOf(drawn) + 1).find((event) => event.type === 'TOKEN_MOVED')
    const subsidy = events.slice(events.indexOf(drawn) + 1).filter((event) => event.type === 'PASSED_START').reduce((sum, event) => sum + (event.amount ?? 0), 0)
    if (move?.to !== undefined) result(`${card.effect.type === 'move_steps' ? `${card.effect.steps > 0 ? '前进' : '后退'}${move.path?.length ?? 0}格，` : ''}抵达${getTile(move.to).name}${subsidy ? `，${move.to === 0 ? '' : '途经起点'}领取${subsidy}元` : ''}`)
  }

  switch (card.effect.type) {
    case 'wheel':
      transitionTo(state, { phase: 'WAITING_FOR_WHEEL', pendingWheel: { id: `wheel-${state.revision}`, playerId: player.id, deck: deckKind, stage: 'ready', outcome: null, startedAt: null, ballAngle: 0 } })
      break
    case 'money':
      applyMoney(card.effect.amount)
      break
    case 'repairs': {
      const effect = card.effect
      const amount = state.tiles.reduce((total, asset) => {
        if (asset.ownerId !== player.id || asset.mortgaged) return total
        const houses = Math.min(asset.level, MAX_PROPERTY_LEVEL - 1)
        return total + houses * effect.perHouse + (asset.level >= MAX_PROPERTY_LEVEL ? effect.perHotel : 0)
      }, 0)
      applyMoney(-Math.min(amount, effect.cap))
      break
    }
    case 'assessment':
    case 'asset_income': {
      const count = state.tiles.filter((asset) => asset.ownerId === player.id).length
      const effect = card.effect
      const amount = Math.min(count * effect.perAsset, effect.cap)
      applyMoney(effect.type === 'asset_income' ? Math.max(effect.minimum, amount) : -amount)
      break
    }
    case 'relief':
    case 'cash_relief': {
      const value = card.effect.type === 'cash_relief' ? player.cash : state.tiles.filter((asset) => asset.ownerId === player.id).length
      applyMoney(value <= card.effect.threshold ? card.effect.amount : card.effect.otherwise)
      break
    }
    case 'renovate': {
      const candidates = BOARD.filter((tile) => {
        const asset = state.tiles[tile.index]
        return tile.kind === 'property' && asset?.ownerId === player.id && !asset.mortgaged && asset.level < MAX_PROPERTY_LEVEL
      }).sort((a, b) => (state.tiles[a.index]!.level - state.tiles[b.index]!.level) || (a.price ?? 0) - (b.price ?? 0) || a.index - b.index)
      const tile = candidates[0]
      if (tile) {
        const asset = state.tiles[tile.index]!
        asset.level += 1
        result(`${tile.name}免费升至${asset.level}级`)
        drawn.tileIndex = tile.index
        addEvent(state, events, {
          type: 'PROPERTY_UPGRADED', playerId: player.id, tileIndex: tile.index, amount: 0,
          message: `${player.name} 因${card.title}将 ${tile.name} 免费升至 ${asset.level} 级`,
        })
      } else {
        applyMoney(card.effect.fallback)
        result(`本次改为发放${card.effect.fallback}元补助`)
      }
      break
    }
    case 'downgrade':
      if (cardPropertyCandidates(state, player.id).length) {
        transitionTo(state, { phase: 'WAITING_FOR_CARD_PROPERTY', pendingCardProperty: { id: `card-property-${state.revision}`, playerId: player.id, cardId } })
      } else result('当前没有需要整改的设施，本次无变化')
      break
    case 'item':
      player.items.push(card.effect.kind)
      addEvent(state, events, { type: 'ITEM_RECEIVED', playerId: player.id, itemKind: card.effect.kind, message: `${player.name} 获得${ITEMS[card.effect.kind].name}` })
      break
    case 'turtle':
      if (player.turtleRollsRemaining > 0) result(`已有慢行效果，仍剩${player.turtleRollsRemaining}次单骰行动`)
      else player.turtleRollsRemaining = TURTLE_ROLLS
      break
    case 'move_to':
      moveTo(state, player, card.effect.tileIndex, events, card.effect.collectStart)
      describeMove()
      resolveLanding(state, player, random, events, depth + 1)
      break
    case 'move_steps':
      moveBy(state, player, card.effect.steps, events, card.effect.steps > 0)
      describeMove()
      resolveLanding(state, player, random, events, depth + 1)
      break
    case 'nearest': {
      const tileKind = card.effect.tileKind
      const candidates = BOARD.filter((tile) => tile.kind === tileKind)
      const target = candidates.find((tile) => tile.index > player.position) ?? candidates[0]
      if (target) {
        moveTo(state, player, target.index, events, true)
        describeMove()
        resolveLanding(state, player, random, events, depth + 1, tileKind === 'utility')
      }
      break
    }
    case 'jail':
    case 'hospital':
      sendToDetention(state, player, events, card.effect.type, `抽到「${card.title}」`)
      break
    case 'get_out':
      player.heldCards.push({ deck: deckKind, cardId })
      break
  }
  // Direct effects share the card's reveal; landing effects retain their own presentation.
  if (!['move_to', 'move_steps', 'nearest'].includes(card.effect.type)) {
    for (const event of events.slice(events.indexOf(drawn) + 1)) event.sourceCardId = cardId
  }
}

export function resolveLanding(
  state: GameState,
  player: PlayerState,
  random: RandomSource,
  events: GameEvent[],
  depth = 0,
  rollUtilityDice = false,
): void {
  if (depth > 4 || state.phase === 'FINISHED' || player.isBankrupt || isDetained(player)) {
    finishLanding(state)
    return
  }
  const tile = getTile(player.position)
  const tileState = state.tiles[tile.index]
  if (!tileState) return

  if (isOwnable(tile)) {
    if (!tileState.ownerId) {
      transitionTo(state, { phase: 'WAITING_FOR_PURCHASE', pendingDecision: { type: 'purchase', playerId: player.id, tileIndex: tile.index } })
      return
    }
    if (tileState.ownerId === player.id) {
      if (
        tile.kind === 'property' &&
        !tileState.mortgaged &&
        tileState.level < MAX_PROPERTY_LEVEL &&
        player.cash >= (tile.buildCost ?? Number.POSITIVE_INFINITY)
      ) {
        transitionTo(state, { phase: 'WAITING_FOR_UPGRADE', pendingDecision: { type: 'upgrade', playerId: player.id, tileIndex: tile.index } })
        return
      }
      addEvent(state, events, { type: 'LANDING_RESOLVED', playerId: player.id, tileIndex: tile.index, message: `${player.name} 回到自己的 ${tile.name}，${tileState.mortgaged ? '已抵押，不能加盖' : tile.kind !== 'property' ? '无需付费' : tileState.level >= MAX_PROPERTY_LEVEL ? '已达到最高等级' : '现金不足，本次不加盖'}` })
      finishLanding(state)
      return
    }

    const utilityRoll = rollUtilityDice && tile.kind === 'utility' ? roll(random) : null
    if (utilityRoll) {
      addEvent(state, events, {
        type: 'DICE_ROLLED',
        playerId: player.id,
        dice: utilityRoll.dice,
        dicePurpose: 'utility',
        message: `${player.name} 为公用事业费用掷出 ${utilityRoll.total} 点`,
      })
    }
    const rent = rentForTile(state, tile.index, utilityRoll?.total ?? state.extraMove?.total ?? state.lastRoll?.total ?? 0)
    if (rent > 0) {
      createDebt(state, player, tileState.ownerId, rent, `${tile.name}游览费用`, events, {
        type: 'READY_TO_END',
      }, tile.index)
    } else addEvent(state, events, { type: 'LANDING_RESOLVED', playerId: player.id, tileIndex: tile.index, message: `${player.name} 到达 ${tile.name}，资产已抵押，无需付费` })
    finishLanding(state)
    return
  }

  switch (tile.kind) {
    case 'chance':
      openCardChoice(state, player, 'chance', depth, random)
      break
    case 'fate':
      openCardChoice(state, player, 'fate', depth, random)
      break
    case 'tax':
      createDebt(state, player, null, tile.taxAmount ?? 0, tile.name, events, {
        type: 'READY_TO_END',
      })
      break
    case 'go_to_jail':
      sendToJail(state, player, events)
      break
    case 'item': {
      const itemKind = ITEM_KINDS[Math.floor(random() * ITEM_KINDS.length)]!
      player.items.push(itemKind)
      addEvent(state, events, { type: 'ITEM_RECEIVED', playerId: player.id, tileIndex: tile.index, itemKind, message: `${player.name} 在道具补给站获得「${ITEMS[itemKind].name}」，已放入道具包` })
      break
    }
    case 'hospital':
    case 'jail':
      addEvent(state, events, { type: 'LANDING_RESOLVED', playerId: player.id, tileIndex: tile.index, message: `${player.name} ${tile.kind === 'jail' ? '路过监狱，只是探访，下回合可正常行动' : '到达医院探访，无需住院或付费，下回合可正常行动'}` })
      break
    default:
      break
  }
  finishLanding(state)
}

export function settleDebt(
  state: GameState,
  player: PlayerState,
  random: RandomSource,
  events: GameEvent[],
): string | null {
  const debt = state.pendingDebt
  if (!debt || debt.debtorId !== player.id) return '当前没有需要支付的债务'
  if (player.cash < debt.amount) return `仍需筹集 ${debt.amount - player.cash} 元`

  player.cash -= debt.amount
  if (debt.creditorId) playerById(state, debt.creditorId).cash += debt.amount
  addEvent(state, events, {
    type: debt.creditorId ? 'RENT_PAID' : 'MONEY_CHANGED',
    playerId: player.id,
    ...(debt.creditorId ? { targetPlayerId: debt.creditorId } : {}),
    amount: -debt.amount,
    ...(debt.tileIndex !== undefined ? { tileIndex: debt.tileIndex } : {}),
    message: `${player.name} 因${debt.reason}向 ${debt.creditorId ? playerById(state, debt.creditorId).name : '银行'} 支付 ${debt.amount} 元，欠款已结清`,
  })
  const continuation = debt.continuation
  state.pendingDebt = null
  if (continuation.type === 'MOVE_AFTER_JAIL' && continuation.dice) {
    leaveDetention(state, player, events, '缴纳费用后')
    moveBy(state, player, continuation.dice.reduce((sum, value) => sum + value, 0), events)
    resolveLanding(state, player, random, events)
  } else {
    transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
  }
  return null
}
