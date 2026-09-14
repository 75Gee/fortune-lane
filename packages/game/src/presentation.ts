import type { GameEvent } from './types.js'
import { DICE_ROLL_MS } from './wheel.js'

export const DICE_RESULT_MS = 250
export const CHOSEN_DIE_MS = 400
export const MOVE_STEP_MS = 160
export const LONG_MOVE_MS = 480
export const BOMB_EXPLOSION_MS = 1100

/** Shared with the server so a new decision gets its full budget after playback. */
export function eventPresentationDuration(event: GameEvent): number {
  if (event.type === 'DICE_ROLLED') return event.dicePurpose === 'chosen' ? CHOSEN_DIE_MS : DICE_ROLL_MS + DICE_RESULT_MS
  if (event.type === 'TOKEN_MOVED') return event.path.length > 12 ? LONG_MOVE_MS : Math.max(1, event.path.length) * MOVE_STEP_MS
  if (event.type === 'PLAYER_SENT_TO_JAIL' || event.type === 'PLAYER_SENT_TO_HOSPITAL') return 600
  if (event.type === 'HAZARD_TRIGGERED' && event.itemKind === 'bomb') return BOMB_EXPLOSION_MS
  return 0
}
