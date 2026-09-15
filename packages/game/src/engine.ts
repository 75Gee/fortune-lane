import { createTileStates } from './board.js'
import { createDeck } from './cards.js'
import { STARTING_CASH } from './economy.js'
import { handleAssets } from './engine/commands/assets.js'
import { handleBidding } from './engine/commands/bidding.js'
import { handleCards } from './engine/commands/cards.js'
import { handleDebt } from './engine/commands/debt.js'
import { handleDetention } from './engine/commands/detention.js'
import { handleItems } from './engine/commands/items.js'
import { handleLiquidation } from './engine/commands/liquidation.js'
import { handleWheel } from './engine/commands/wheel.js'
import { handleStocks } from './engine/commands/stocks.js'
import { advanceStockMarket, createStockMarket } from './stockMarket/model.js'
import { isDetained } from './items.js'
import { assetActionQuote, canRollAgain, type AssetAction } from './queries.js'
import { PLAYER_COLORS, type CommandResult, type DiceRoll, type GameCommand, type GameEvent, type GamePlayerSetup, type GameState, type PlayerState, type RandomSource } from './types.js'

import { createStatistics, updateNetWorthPeaks } from './statistics.js'

import { finishAuction } from './engine/auction.js'
import { addEvent, commandError, playerById, randomDie, roll } from './engine/context.js'
import { bankruptPlayer } from './engine/finance.js'
import { resolveLanding } from './engine/landing.js'
import { moveBy, sendToJail } from './engine/movement.js'
import { transitionTo } from './engine/transitions.js'
import { advancePlayer, checkWinner } from './engine/turns.js'

export function createGame(
  setups: readonly GamePlayerSetup[],
  random: RandomSource = Math.random,
  now = Date.now(),
  marketRandom: RandomSource = random,
): GameState {
  if (setups.length < 2 || setups.length > 6) {
    throw new Error('Game requires 2 to 6 players')
  }
  let contenders = setups.map((_, index) => index)
  let tieBreaks = 0
  while (contenders.length > 1 && tieBreaks < 20) {
    const rolls = contenders.map((index) => ({ index, total: randomDie(random) + randomDie(random) }))
    const highest = Math.max(...rolls.map((result) => result.total))
    contenders = rolls.filter((result) => result.total === highest).map((result) => result.index)
    tieBreaks += 1
  }
  const firstIndex = contenders[0] ?? 0
  const order = [...setups.slice(firstIndex), ...setups.slice(0, firstIndex)]
  const players: PlayerState[] = order.map((setup, index) => ({
    id: setup.id,
    name: setup.name,
    token: setup.token,
    color: PLAYER_COLORS[index] ?? PLAYER_COLORS[0],
    cash: STARTING_CASH,
    position: 0,
    isInJail: false,
    isInHospital: false,
    turtleRollsRemaining: 0,
    items: [],
    jailTurns: 0,
    heldCards: [],
    isBankrupt: false,
    connected: setup.connected ?? true,
  }))
  const first = players[0]
  if (!first) throw new Error('Unable to choose the first player')

  const state: GameState = {
    revision: 1,
    phase: 'WAITING_FOR_ROLL',
    currentPlayerId: first.id,
    turnNumber: 1,
    consecutiveDoubles: 0,
    players,
    tiles: createTileStates(),
    chanceDeck: createDeck('chance', random),
    fateDeck: createDeck('fate', random),
    pendingDecision: null,
    pendingCardChoice: null,
    pendingCardProperty: null,
    pendingWheel: null,
    pendingAuction: null,
    pendingDebt: null,
    hazards: [],
    itemUsedThisTurn: false,
    extraMove: null,
    lastRoll: null,
    actionLog: [],
    winnerPlayerId: null,
    statistics: createStatistics(players, now),
    stockMarket: createStockMarket(players.map(player => player.id), 1, marketRandom),
  }
  const events: GameEvent[] = []
  addEvent(state, events, {
    type: 'GAME_STARTED',
    playerId: first.id,
    message: `游戏开始，${first.name} 先行动`,
  })
  return state
}

export function applyCommand(
  current: GameState,
  playerId: string,
  command: GameCommand,
  random: RandomSource = Math.random,
  now = Date.now(),
  automatic = false,
  marketRandom: RandomSource = random,
): CommandResult {
  if (current.phase === 'FINISHED') return commandError(current, '游戏已经结束')
  if (!current.players.some((player) => player.id === playerId)) return commandError(current, '玩家不在本局中')
  if (current.currentPlayerId !== playerId && command.type !== 'BID_AUCTION' && command.type !== 'SURRENDER' && command.type !== 'TRADE_STOCK') return commandError(current, '还没有轮到你')

  const state = structuredClone(current)
  state.stockMarket ??= createStockMarket(state.players.map(player => player.id), state.turnNumber, marketRandom)
  state.revision += 1
  const events: GameEvent[] = []
  const player = playerById(state, playerId)
  if (player.isBankrupt && command.type !== 'RESOLVE_AUCTION') return commandError(current, '你正在观战，不能再进行本局操作')

  if (automatic) {
    const actions: Partial<Record<GameCommand['type'], string>> = {
      ROLL_DICE: '掷骰', TRY_JAIL_ROLL: `尝试掷对子${player.isInHospital ? '出院' : '出狱'}`, SKIP_PURCHASE: '放弃购买并发起竞拍',
      SKIP_UPGRADE: '跳过加盖', CHOOSE_CARD: '选择第 1 张卡', SPIN_WHEEL: '启动转盘',
      CHOOSE_CARD_PROPERTY: '选择一处城市降级', CHOOSE_WHEEL_PROPERTY: '选择符合条件的地产', DECLARE_BANKRUPTCY: '放弃筹款并清算',
      END_TURN: '结束本次行动', SETTLE_DEBT: '支付已筹齐的欠款',
      LIQUIDATE_ASSETS: '卖出股票并偿还欠款',
    }
    addEvent(state, events, { type: 'AUTO_PLAY', playerId, message: `${player.name} 操作超时，系统代为${actions[command.type] ?? '完成操作'}` })
  }

  if (['BUY_PROPERTY', 'UPGRADE_PROPERTY', 'MORTGAGE_ASSET', 'REDEEM_ASSET', 'SELL_BUILDING'].includes(command.type)) {
    const tileIndex = 'tileIndex' in command ? command.tileIndex : state.pendingDecision?.tileIndex ?? -1
    const quote = assetActionQuote(state, playerId, tileIndex, command.type as AssetAction)
    if (!quote.allowed) return commandError(current, quote.reason!)
  }

  let rejection: CommandResult | undefined
  const context = { current, state, player, playerId, events, random, now }
  switch (command.type) {
    case 'TRADE_STOCK':
      rejection = handleStocks(context, command)
      break
    case 'LIQUIDATE_ASSETS':
      rejection = handleLiquidation(context, command)
      break
    case 'SURRENDER': {
      const creditorId = state.pendingDebt?.debtorId === playerId ? state.pendingDebt.creditorId : null
      bankruptPlayer(state, player, creditorId, events, true)
      if (checkWinner(state, events)) break
      const auction = state.pendingAuction
      if (auction) {
        auction.participantIds = auction.participantIds.filter((id) => id !== playerId)
        delete auction.bids[playerId]
        finishAuction(state, random, events)
      }
      break
    }
    case 'BID_AUCTION':
    case 'RESOLVE_AUCTION':
      rejection = handleBidding(context, command)
      break
    case 'SPIN_WHEEL':
    case 'RESOLVE_WHEEL':
    case 'CHOOSE_WHEEL_PROPERTY':
      rejection = handleWheel(context, command)
      break
    case 'CHOOSE_CARD_PROPERTY':
    case 'CHOOSE_CARD':
      rejection = handleCards(context, command)
      break
    case 'USE_TURTLE':
    case 'USE_CHOSEN_DIE':
    case 'PLACE_ROADBLOCK':
    case 'PLACE_BOMB':
      rejection = handleItems(context, command)
      break
    case 'ROLL_AGAIN':
    case 'ROLL_DICE': {
      if (command.type === 'ROLL_AGAIN') {
        if (!canRollAgain(state, playerId)) return commandError(current, '当前没有对子追加行动')
        transitionTo(state, { phase: 'WAITING_FOR_ROLL' })
      }
      if (state.phase !== 'WAITING_FOR_ROLL') return commandError(current, '当前不能掷骰子')
      if (isDetained(player)) return commandError(current, '请先选择出狱或出院方式')
      const turtle = player.turtleRollsRemaining > 0
      const single = turtle ? randomDie(random) : null
      const dice: DiceRoll = single !== null ? { dice: [single], total: single, isDouble: false } : roll(random)
      if (turtle) player.turtleRollsRemaining -= 1
      state.lastRoll = dice
      state.consecutiveDoubles = dice.isDouble ? state.consecutiveDoubles + 1 : 0
      addEvent(state, events, {
        type: 'DICE_ROLLED',
        playerId,
        dice: dice.dice,
        dicePurpose: 'movement',
        message: `${player.name} ${turtle ? '受乌龟卡影响，使用单骰' : ''}掷出 ${dice.total} 点${dice.isDouble ? '，是对子' : ''}${turtle ? player.turtleRollsRemaining > 0 ? `，乌龟效果剩余 ${player.turtleRollsRemaining} 次` : '，乌龟效果已解除' : ''}`,
      })
      if (state.consecutiveDoubles >= 3) {
        sendToJail(state, player, events, '连续三次掷出对子')
        break
      }
      moveBy(state, player, dice.total, events)
      resolveLanding(state, player, random, events)
      break
    }
    case 'BUY_PROPERTY':
    case 'SKIP_PURCHASE':
    case 'UPGRADE_PROPERTY':
    case 'SKIP_UPGRADE':
    case 'MORTGAGE_ASSET':
    case 'REDEEM_ASSET':
    case 'SELL_BUILDING':
      rejection = handleAssets(context, command)
      break
    case 'PAY_JAIL_FINE':
    case 'USE_JAIL_CARD':
    case 'TRY_JAIL_ROLL':
      rejection = handleDetention(context, command)
      break
    case 'SETTLE_DEBT':
    case 'DECLARE_BANKRUPTCY':
      rejection = handleDebt(context, command)
      break
    case 'END_TURN':
      if (state.phase !== 'WAITING_FOR_END_TURN') return commandError(current, '当前不能结束回合')
      if (state.lastRoll?.isDouble && !isDetained(player)) {
        transitionTo(state, { phase: 'WAITING_FOR_ROLL' })
        state.lastRoll = null
      } else {
        advancePlayer(state, events)
      }
      break
  }
  if (rejection) return rejection

  if (state.extraMove && state.phase === 'WAITING_FOR_END_TURN'
      && !state.pendingDecision && !state.pendingCardChoice && !state.pendingCardProperty && !state.pendingWheel && !state.pendingAuction && !state.pendingDebt) {
    const returnPhase = state.extraMove.returnPhase
    transitionTo(state, { phase: returnPhase })
    state.extraMove = null
    const mover = playerById(state, state.currentPlayerId)
    addEvent(state, events, { type: 'EXTRA_MOVE_FINISHED', playerId: mover.id, message: `${mover.name} 的额外移动已结算，${returnPhase === 'WAITING_FOR_ROLL' ? '仍可进行原本的掷骰行动' : '本回合道具额度已用完，可结束本次行动'}` })
  }

  if (playerById(state, state.currentPlayerId).isBankrupt && state.phase !== 'FINISHED' && !state.pendingAuction) {
    if (!checkWinner(state, events)) advancePlayer(state, events)
  }
  if (state.phase === 'FINISHED' && state.statistics.finishedAt === null) state.statistics.finishedAt = now
  if (state.turnNumber !== current.turnNumber) advanceStockMarket(state.stockMarket, state.turnNumber, marketRandom)
  updateNetWorthPeaks(state)
  return { ok: true, state, events }
}

export { playerNetWorth } from './statistics.js'
