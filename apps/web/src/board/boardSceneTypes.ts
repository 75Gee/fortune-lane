import type { GameEvent, GameView } from '@fortune/game'
import type { ViewInsets } from './boardCameraRig.js'
export interface BoardSceneProps {
  game: GameView
  displayPositions: Record<string, number>
  selectedTile: number | null
  focusPlayerId: string | null
  teleportPlayerId?: string | null
  activeEvent?: GameEvent | null
  eventStartedAt?: number
  active?: boolean
  /** Canvas edges covered by the HUD, in CSS pixels; the camera centres on what is left. */
  viewInsets?: ViewInsets | undefined
  onSelectTile: (index: number) => void
  onCameraModeChange?: ((mode: CameraMode) => void) | undefined
}
export type CameraMode = 'follow' | 'free'
export type ViewAction = 'follow' | 'overview' | 'rotate-left' | 'rotate-right' | 'in' | 'out'
