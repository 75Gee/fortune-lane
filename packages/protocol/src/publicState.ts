import { STOCK_IDS, type GameState, type GameView, type StockMarketView } from '@fortune/game'

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
    ...(state.stockMarket ? { stockMarket: {
      quoteRevision: state.stockMarket.quoteRevision,
      updatedTurn: state.stockMarket.updatedTurn,
      stocks: Object.fromEntries(STOCK_IDS.map(id => {
        const quote = state.stockMarket!.stocks[id]
        return [id, { priceCents: quote.priceCents, previousPriceCents: quote.previousPriceCents, history: quote.history }]
      })) as StockMarketView['stocks'],
      portfolios: state.stockMarket.portfolios,
      project: state.stockMarket.project ? {
        probability: state.stockMarket.project.probability,
        exposure: state.stockMarket.project.exposure,
        revealTurn: state.stockMarket.project.revealTurn,
      } : null,
      projectNews: state.stockMarket.projectNews ? {
        turn: state.stockMarket.projectNews.turn,
        kind: state.stockMarket.projectNews.kind,
        probability: state.stockMarket.projectNews.probability,
      } : null,
    } } : {}),
  })
}
