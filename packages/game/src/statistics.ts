import { getTile } from './board.js'
import type { GameEvent, GameState, GameStatistics, PlayerState } from './types.js'

export function createStatistics(players: readonly PlayerState[], now: number): GameStatistics {
  return {
    startedAt: now, finishedAt: null, eliminations: [], largestPayment: null, bestAuction: null,
    players: Object.fromEntries(players.map((player) => [player.id, {
      peakNetWorth: player.cash, rentReceived: 0, rentPaid: 0, assetsAcquired: 0,
      steps: 0, itemUses: 0, doubles: 0, trapHits: 0, auctionWins: 0,
      bestAuctionSaving: 0, receivedFrom: {}, earnedByTile: {},
    }])),
  }
}

export function playerNetWorth(state: Pick<GameState, 'players' | 'tiles'>, playerId: string): number {
  const player = state.players.find((entry) => entry.id === playerId)
  if (!player) return 0
  return player.cash + state.tiles.reduce((total, asset, index) => {
    if (asset.ownerId !== playerId) return total
    const tile = getTile(index)
    return total + (asset.mortgaged ? (tile.mortgage ?? 0) : (tile.price ?? 0))
      + (tile.kind === 'property' ? asset.level * (tile.buildCost ?? 0) : 0)
  }, 0)
}

export function updateNetWorthPeaks(state: GameState): void {
  for (const player of state.players) {
    const stats = state.statistics.players[player.id]
    if (stats) stats.peakNetWorth = Math.max(stats.peakNetWorth, playerNetWorth(state, player.id))
  }
}

/** Runs only for events committed to the cloned command state, never on transport/replay. */
export function recordStatistics(state: GameState, event: GameEvent): void {
  const stats = event.playerId ? state.statistics.players[event.playerId] : undefined
  const turnNumber = event.turnNumber ?? state.turnNumber
  if (stats && event.playerId) {
    if (event.type === 'TOKEN_MOVED') stats.steps += event.path?.length ?? 0
    if (event.type === 'DICE_ROLLED' && event.dicePurpose === 'movement' && event.dice?.length === 2 && event.dice[0] === event.dice[1]) stats.doubles += 1
    if (event.type === 'ITEM_USED') stats.itemUses += 1
    if (event.type === 'PROPERTY_PURCHASED') stats.assetsAcquired += 1
    if (event.type === 'AUCTION_RESOLVED' && event.tileIndex !== undefined && event.amount !== undefined) {
      stats.assetsAcquired += 1
      stats.auctionWins += 1
      const saving = Math.max(0, (getTile(event.tileIndex).price ?? 0) - event.amount)
      stats.bestAuctionSaving = Math.max(stats.bestAuctionSaving, saving)
      if (saving > (state.statistics.bestAuction?.saving ?? 0)) state.statistics.bestAuction = {
        playerId: event.playerId, tileIndex: event.tileIndex, amount: event.amount, saving, turnNumber,
      }
    }
    if (event.type === 'RENT_PAID' && event.targetPlayerId) {
      const receiver = state.statistics.players[event.targetPlayerId]
      const paid = Math.max(0, -(event.amount ?? 0))
      stats.rentPaid += paid
      if (receiver) {
        receiver.rentReceived += paid
        receiver.receivedFrom[event.playerId] = (receiver.receivedFrom[event.playerId] ?? 0) + paid
        if (event.tileIndex !== undefined) receiver.earnedByTile[event.tileIndex] = (receiver.earnedByTile[event.tileIndex] ?? 0) + paid
      }
      if (event.tileIndex !== undefined && paid > (state.statistics.largestPayment?.amount ?? 0)) state.statistics.largestPayment = {
        payerId: event.playerId, receiverId: event.targetPlayerId, tileIndex: event.tileIndex, amount: paid, turnNumber,
      }
    }
    if ((event.type === 'PLAYER_BANKRUPT' || event.type === 'PLAYER_SURRENDERED') && !state.statistics.eliminations.some((entry) => entry.playerId === event.playerId)) {
      state.statistics.eliminations.push({ playerId: event.playerId, turnNumber, reason: event.type === 'PLAYER_SURRENDERED' ? 'surrender' : 'bankruptcy' })
    }
  }
  if (event.type === 'HAZARD_TRIGGERED' && event.targetPlayerId && event.targetPlayerId !== event.playerId) {
    const owner = state.statistics.players[event.targetPlayerId]
    if (owner) owner.trapHits += 1
  }
  updateNetWorthPeaks(state)
}
