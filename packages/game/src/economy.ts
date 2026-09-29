import { BOARD, getTile, isOwnable } from './board.js'
import type { GameState } from './types.js'

export const STARTING_CASH = 15_000
export const PASS_START_REWARD = 4_000
export const PASS_START_DECREMENT = 400
export const PASS_START_MINIMUM = 2_000
export const JAIL_FINE = 500
export const ITEM_GRANT_INTERVAL = 25
export const AIRPORT_RENTS = [0, 300, 600, 1_000, 1_600] as const
export const UTILITY_MULTIPLIERS = [0, 50, 90] as const

// All auction entry points use the asset's mortgage value as the minimum bid.
export function auctionMinimumBid(tileIndex: number): number {
  const tile = getTile(tileIndex)
  if (!isOwnable(tile) || !tile.mortgage) throw new Error(`Tile ${tileIndex} has no auction value`)
  return tile.mortgage
}

export function passStartReward(receipts: number): number {
  return Math.max(PASS_START_MINIMUM, PASS_START_REWARD - PASS_START_DECREMENT * receipts)
}

export function rentGrowthStart(initialPlayerCount: number): number {
  return 100 + (initialPlayerCount - 2) * ITEM_GRANT_INTERVAL
}

export function rentMultiplier(turnNumber: number, initialPlayerCount: number): number {
  return 1.02 ** Math.max(0, turnNumber - rentGrowthStart(initialPlayerCount) + 1)
}

export function scaleRent(base: number, turnNumber: number, initialPlayerCount: number): number {
  if (base <= 0) return 0
  return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(base * rentMultiplier(turnNumber, initialPlayerCount)))
}

// The same quote is used for settlement, deeds and prospective purchases.
export function rentForTile(
  state: Pick<GameState, 'tiles' | 'turnNumber' | 'players'>,
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
  return scaleRent(base, state.turnNumber, state.players.length)
}

export function redeemCost(tileIndex: number): number {
  return Math.ceil((getTile(tileIndex).mortgage ?? 0) * 1.1)
}

export function buildingSaleValue(tileIndex: number): number {
  return Math.floor((getTile(tileIndex).buildCost ?? 0) / 2)
}
