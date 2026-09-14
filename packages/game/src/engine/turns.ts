import { RENT_GROWTH_START, rentMultiplier } from '../economy.js'
import { type GameEvent, type GameState, type PlayerState } from '../types.js'

import { addEvent } from './context.js'
import { transitionTo } from './transitions.js'

export function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((player) => !player.isBankrupt)
}

export function checkWinner(state: GameState, events: GameEvent[]): boolean {
  const remaining = activePlayers(state)
  if (remaining.length !== 1 || state.players.length < 2) return false
  const winner = remaining[0]
  if (!winner) return false
  state.extraMove = null
  transitionTo(state, { phase: 'FINISHED', winnerPlayerId: winner.id })
  addEvent(state, events, {
    type: 'GAME_FINISHED',
    playerId: winner.id,
    message: `${winner.name} 成为最后的大富翁`,
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
