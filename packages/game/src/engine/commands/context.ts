import type { GameEvent, GameState, PlayerState, RandomSource } from '../../types.js'
export interface CommandContext { current: GameState; state: GameState; player: PlayerState; playerId: string; events: GameEvent[]; random: RandomSource; now: number }
