import { BOARD, BOARD_GRID_SIZE, BOARD_SIDE_STEPS } from '@fortune/game'

export interface BoardPosition {
  row: number
  column: number
  side: 'bottom' | 'left' | 'top' | 'right' | 'corner'
}

export function boardPosition(value: number): BoardPosition {
  const index = ((value % BOARD.length) + BOARD.length) % BOARD.length
  const steps = BOARD_SIDE_STEPS, edge = BOARD_GRID_SIZE
  const side = Math.floor(index / steps), offset = index % steps
  const row = side === 0 ? edge : side === 1 ? edge - offset : side === 2 ? 1 : 1 + offset
  const column = side === 0 ? edge - offset : side === 1 ? 1 : side === 2 ? 1 + offset : edge
  return { row, column, side: offset === 0 ? 'corner' : (['bottom', 'left', 'top', 'right'] as const)[side]! }
}
