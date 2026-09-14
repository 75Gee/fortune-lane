import { BOARD, getTile, isOwnable } from './board.js'
import type { GameState } from './types.js'

export const STARTING_CASH = 15_000
export const PASS_START_REWARD = 1_500
export const JAIL_FINE = 500
export const RENT_GROWTH_START = 300
export const AIRPORT_RENTS = [0, 300, 600, 1_000, 1_600] as const
export const UTILITY_MULTIPLIERS = [0, 50, 90] as const

// All auction entry points use the asset's mortgage value as the minimum bid.
export function auctionMinimumBid(tileIndex: number): number {
  const tile = getTile(tileIndex)
  if (!isOwnable(tile) || !tile.mortgage) throw new Error(`Tile ${tileIndex} has no auction value`)
  return tile.mortgage
}

export function rentMultiplier(turnNumber: number): number {
  return 1.01 ** Math.max(0, turnNumber - RENT_GROWTH_START)
}

export function scaleRent(base: number, turnNumber: number): number {
  if (base <= 0) return 0
  return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(base * rentMultiplier(turnNumber)))
}

// The same quote is used for settlement, deeds and prospective purchases.
export function rentForTile(
  state: Pick<GameState, 'tiles' | 'turnNumber'>,
  tileIndex: number,
  diceTotal: number,
  ownerId = state.tiles[tileIndex]?.ownerId,
): number {
  const tile = getTile(tileIndex)
  const asset = state.tiles[tileIndex]
  if (!ownerId || asset?.mortgaged) return 0
  let base = 0
  if (tile.kind === 'property') base = tile.rents?.[asset?.level ?? 0] ?? 0
  if (tile.kind === 'airport' || tile.kind === 'utility') {
    const count = BOARD.filter((definition) => {
      const current = state.tiles[definition.index]
      return definition.kind === tile.kind && (definition.index === tileIndex || (current?.ownerId === ownerId && !current.mortgaged))
    }).length
    base = tile.kind === 'airport'
      ? AIRPORT_RENTS[count] ?? 0
      : diceTotal * (UTILITY_MULTIPLIERS[count] ?? 0)
  }
  return scaleRent(base, state.turnNumber)
}

export function redeemCost(tileIndex: number): number {
  return Math.ceil((getTile(tileIndex).mortgage ?? 0) * 1.1)
}

export function buildingSaleValue(tileIndex: number): number {
  return Math.floor((getTile(tileIndex).buildCost ?? 0) / 2)
}
