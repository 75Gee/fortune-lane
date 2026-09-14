import { getTile } from '../board.js'
import { type DebtContinuation, type GameEvent, type GameState, type PlayerState } from '../types.js'

import { updateNetWorthPeaks } from '../statistics.js'

import { addEvent, playerById } from './context.js'
import { leaveDetention, moveBy } from './movement.js'
import { transitionTo } from './transitions.js'

export function assetLiquidValue(state: GameState, playerId: string): number {
  return state.tiles.reduce((total, tileState, index) => {
    if (tileState.ownerId !== playerId) return total
    const definition = getTile(index)
    let value = 0
    if (definition.kind === 'property' && tileState.level > 0 && definition.buildCost) {
      value += tileState.level * Math.floor(definition.buildCost / 2)
    }
    if (!tileState.mortgaged) value += definition.mortgage ?? 0
    return total + value
  }, 0)
}

export function bankruptPlayer(
  state: GameState,
  player: PlayerState,
  creditorId: string | null,
  events: GameEvent[],
  surrender = false,
  rentTileIndex = state.pendingDebt?.tileIndex,
): void {
  updateNetWorthPeaks(state)
  if (creditorId && player.cash > 0) {
    const paid = player.cash
    playerById(state, creditorId).cash += paid
    player.cash = 0
    addEvent(state, events, {
      type: 'RENT_PAID', playerId: player.id, targetPlayerId: creditorId,
      ...(rentTileIndex !== undefined ? { tileIndex: rentTileIndex } : {}), amount: -paid,
      message: `${player.name} 清算剩余旅费，向 ${playerById(state, creditorId).name} 实付 ${paid} 元`,
    })
  }
  player.cash = 0
  player.isBankrupt = true
  player.surrendered = surrender
  player.isInJail = false
  player.isInHospital = false
  player.turtleRollsRemaining = 0
  player.items = []
  if (state.currentPlayerId === player.id) state.extraMove = null
  if (state.pendingWheel?.playerId === player.id) state.pendingWheel = null
  if (state.pendingCardProperty?.playerId === player.id) state.pendingCardProperty = null
  for (const held of player.heldCards) {
    const deck = held.deck === 'chance' ? state.chanceDeck : state.fateDeck
    deck.discard.push(held.cardId)
  }
  player.heldCards = []
  for (const tileState of state.tiles) {
    if (tileState.ownerId === player.id) {
      tileState.ownerId = null
      tileState.level = 0
      tileState.mortgaged = false
    }
  }
  if (state.pendingDecision?.playerId === player.id) state.pendingDecision = null
  if (state.pendingCardChoice?.playerId === player.id) {
    state.pendingCardChoice = null
  }
  if (state.pendingDebt?.debtorId === player.id) state.pendingDebt = null
  else if (state.pendingDebt?.creditorId === player.id) state.pendingDebt.creditorId = null
  addEvent(state, events, {
    type: surrender ? 'PLAYER_SURRENDERED' : 'PLAYER_BANKRUPT',
    playerId: player.id,
    ...(creditorId ? { targetPlayerId: creditorId } : {}),
    message: `${player.name} ${surrender ? '投降，转为观战' : '宣告破产'}，资产归还银行`,
  })
}

export function createDebt(
  state: GameState,
  debtor: PlayerState,
  creditorId: string | null,
  amount: number,
  reason: string,
  events: GameEvent[],
  continuation: DebtContinuation,
  tileIndex?: number,
): void {
  if (debtor.cash >= amount) {
    debtor.cash -= amount
    if (creditorId) playerById(state, creditorId).cash += amount
    addEvent(state, events, {
      type: creditorId ? 'RENT_PAID' : 'MONEY_CHANGED',
      playerId: debtor.id,
      ...(creditorId ? { targetPlayerId: creditorId } : {}),
      amount: -amount,
      ...(tileIndex !== undefined ? { tileIndex } : {}),
      message: creditorId
        ? `${debtor.name} 因${reason}向 ${playerById(state, creditorId).name} 支付 ${amount} 元`
        : `${debtor.name} 因${reason}支付 ${amount} 元`,
    })
    if (continuation.type === 'MOVE_AFTER_JAIL' && continuation.dice) {
      leaveDetention(state, debtor, events, '缴纳费用后')
      moveBy(state, debtor, continuation.dice.reduce((sum, value) => sum + value, 0), events)
    }
    return
  }

  if (debtor.cash + assetLiquidValue(state, debtor.id) < amount) {
    addEvent(state, events, {
      type: 'DEBT_CREATED', playerId: debtor.id, amount,
      ...(creditorId ? { targetPlayerId: creditorId } : {}),
      message: `${debtor.name} 需付${reason} ${amount} 元，现金和全部可变现资产仍不足，进入破产清算`,
    })
    bankruptPlayer(state, debtor, creditorId, events, false, tileIndex)
    return
  }

  transitionTo(state, { phase: 'WAITING_FOR_DEBT', pendingDebt: {
    debtorId: debtor.id,
    creditorId,
    amount,
    reason,
    continuation,
    ...(tileIndex !== undefined ? { tileIndex } : {}),
  } })
  addEvent(state, events, {
    type: 'DEBT_CREATED',
    playerId: debtor.id,
    ...(creditorId ? { targetPlayerId: creditorId } : {}),
    amount,
    message: `${debtor.name} 待付${reason} ${amount} 元，进入筹款阶段`,
  })
}
