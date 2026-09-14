import type { GameEvent, GameView } from '@fortune/game'
export interface BoardSceneProps {
  game: GameView
  displayPositions: Record<string, number>
  selectedTile: number | null
  focusPlayerId: string | null
  teleportPlayerId?: string | null
  activeEvent?: GameEvent | null
  eventStartedAt?: number
  active?: boolean
  onSelectTile: (index: number) => void
}
export type CameraMode = 'follow' | 'overview'
export type ViewAction = CameraMode | 'in' | 'out'
