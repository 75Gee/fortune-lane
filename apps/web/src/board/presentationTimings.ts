import { LONG_MOVE_MS, MOVE_STEP_MS, type GameEvent } from '@fortune/game'
export { BOMB_EXPLOSION_MS, eventPresentationDuration as eventDuration } from '@fortune/game'

export function movementFrame(event: GameEvent, elapsed: number) {
  if (!event.path?.length) return null
  const path = event.path.length > 12 ? [event.to ?? event.path.at(-1)!] : event.path
  const stepMs = event.path.length > 12 ? LONG_MOVE_MS : MOVE_STEP_MS
  const step = Math.min(path.length - 1, Math.max(0, Math.floor(elapsed / stepMs)))
  return { from: step === 0 ? event.from ?? path[0]! : path[step - 1]!, to: path[step]!, progress: Math.min(1, Math.max(0, (elapsed - step * stepMs) / stepMs)), finalStep: step === path.length - 1 }
}
