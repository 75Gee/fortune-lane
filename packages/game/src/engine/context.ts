import { type CommandResult, type DiceRoll, type GameEvent, type GameEventInput, type GameState, type PlayerState, type RandomSource } from '../types.js'

import { recordStatistics } from '../statistics.js'

export function randomDie(random: RandomSource): number {
  return Math.floor(random() * 6) + 1
}

export function roll(random: RandomSource): DiceRoll {
  const first = randomDie(random)
  const second = randomDie(random)
  return {
    dice: [first, second],
    total: first + second,
    isDouble: first === second,
  }
}

export function playerById(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player) throw new Error(`Unknown player: ${playerId}`)
  return player
}

export function addEvent(
  state: GameState,
  events: GameEvent[],
  event: GameEventInput,
): GameEvent {
  const next: GameEvent = {
    ...event,
    id: `${state.revision}-${events.length + 1}`,
    revision: state.revision,
    turnNumber: state.turnNumber,
  }
  events.push(next)
  state.actionLog.push(next)
  state.actionLog = state.actionLog.slice(-300)
  recordStatistics(state, next)
  return next
}

export function commandError(state: GameState, error: string): CommandResult {
  return { ok: false, state, events: [], error }
}
