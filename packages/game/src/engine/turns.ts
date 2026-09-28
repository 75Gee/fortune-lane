import { RENT_GROWTH_START, WINNING_NET_WORTH, rentMultiplier } from '../economy.js'
import { playerNetWorth } from '../statistics.js'
import { type GameEvent, type GameState, type PlayerState } from '../types.js'

import { addEvent } from './context.js'
import { transitionTo } from './transitions.js'

export function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((player) => !player.isBankrupt)
}

export function checkWinner(state: GameState, events: GameEvent[]): boolean {
  if (state.phase === 'FINISHED') return true
  const remaining = activePlayers(state)
  // A quote update can put several players over the target at once. Highest
  // net worth wins; equal values retain the established starting turn order.
  const assetWinner = remaining
    .map(player => ({ player, worth: playerNetWorth(state, player.id) }))
    .filter(entry => entry.worth >= WINNING_NET_WORTH)
    .sort((a, b) => b.worth - a.worth)[0]
  const winner = assetWinner?.player ?? (remaining.length === 1 && state.players.length >= 2 ? remaining[0] : undefined)
  if (!winner) return false
  state.extraMove = null
  transitionTo(state, { phase: 'FINISHED', winnerPlayerId: winner.id })
  addEvent(state, events, {
    type: 'GAME_FINISHED',
    playerId: winner.id,
    message: assetWinner
      ? `${winner.name} 总资产达到 ${assetWinner.worth.toLocaleString('zh-CN')} 元，率先达成 ${WINNING_NET_WORTH.toLocaleString('zh-CN')} 元目标，赢得本局`
      : `${winner.name} 成为最后的大富翁`,
  })
  return true
}

export function advancePlayer(state: GameState, events: GameEvent[]): void {
  if (checkWinner(state, events)) return
  const currentIndex = state.players.findIndex((player) => player.id === state.currentPlayerId)
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const index = (currentIndex + offset) % state.players.length
    const candidate = state.players[index]
    if (candidate && !candidate.isBankrupt) {
      state.currentPlayerId = candidate.id
      state.turnNumber += 1
      transitionTo(state, { phase: 'WAITING_FOR_ROLL' })
      state.extraMove = null
      state.itemUsedThisTurn = false
      state.lastRoll = null
      state.consecutiveDoubles = 0
      state.pendingDecision = null
      state.pendingCardChoice = null
      state.pendingCardProperty = null
      state.pendingWheel = null
      state.pendingAuction = null
      addEvent(state, events, {
        type: 'TURN_CHANGED',
        playerId: candidate.id,
        message: `轮到 ${candidate.name}${state.turnNumber > RENT_GROWTH_START ? ` · 游览费 ×${rentMultiplier(state.turnNumber).toFixed(2)}` : ''}`,
      })
      return
    }
  }
}
