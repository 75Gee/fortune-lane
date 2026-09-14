import * as THREE from 'three'
import { BOARD, BOARD_GRID_SIZE, BOARD_SIDE_STEPS } from '@fortune/game'
import { boardPosition } from './boardPosition.js'

export const TILE_SIZE = 4
export const BOARD_SIZE = TILE_SIZE * BOARD_GRID_SIZE
export const WORLD_SIZE = TILE_SIZE * (BOARD_GRID_SIZE + 2)
export const TILE_TOP = .34

export function worldPosition(index: number) {
  const normalized = ((index % BOARD.length) + BOARD.length) % BOARD.length
  const { row, column } = boardPosition(normalized)
  return new THREE.Vector3((column - (BOARD_GRID_SIZE + 1) / 2) * TILE_SIZE, TILE_TOP, (row - (BOARD_GRID_SIZE + 1) / 2) * TILE_SIZE)
}

export function inwardAt(index: number) {
  const { x, z } = worldPosition(index)
  const edge = TILE_SIZE * BOARD_SIDE_STEPS / 2
  return new THREE.Vector3(Math.abs(x) === edge ? -Math.sign(x) : 0, 0, Math.abs(z) === edge ? -Math.sign(z) : 0).normalize()
}

// Outside lots share the board's grid; each corner L is anchored at its diagonal square.
export function landmarkPosition(index: number) {
  const position = worldPosition(index)
  const edge = TILE_SIZE * BOARD_SIDE_STEPS / 2
  if (Math.abs(position.x) === edge) position.x += Math.sign(position.x) * TILE_SIZE
  if (Math.abs(position.z) === edge) position.z += Math.sign(position.z) * TILE_SIZE
  position.y = .14
  return position
}
