import type { GameState, GameView } from '@fortune/game'

/** Allowlist the wire representation; adding private state never adds it to a broadcast. */
export function publicGameState(state: GameState, viewerId?: string): GameView {
  const choice = state.pendingCardChoice
  const auction = state.pendingAuction
  return structuredClone({
    revision: state.revision,
    phase: state.phase,
    currentPlayerId: state.currentPlayerId,
    turnNumber: state.turnNumber,
    consecutiveDoubles: state.consecutiveDoubles,
    players: state.players,
    tiles: state.tiles,
    chanceDeck: { remaining: state.chanceDeck.order.length, discarded: state.chanceDeck.discard.length },
    fateDeck: { remaining: state.fateDeck.order.length, discarded: state.fateDeck.discard.length },
    pendingCardChoice: choice ? { id: choice.id, playerId: choice.playerId, deck: choice.deck, count: 3 as const } : null,
    pendingDecision: state.pendingDecision,
    pendingCardProperty: state.pendingCardProperty,
    pendingWheel: state.pendingWheel,
    pendingAuction: auction ? {
      ...auction,
      bids: Object.fromEntries(Object.entries(auction.bids).map(([id, amount]) => [id, id === viewerId ? amount : -1])),
    } : null,
    pendingDebt: state.pendingDebt,
    hazards: state.hazards,
    itemUsedThisTurn: state.itemUsedThisTurn,
    extraMove: state.extraMove,
    lastRoll: state.lastRoll,
    actionLog: state.actionLog,
    winnerPlayerId: state.winnerPlayerId,
    statistics: state.statistics,
  })
}
