import { cardPropertyCandidates, stockPortfolioSummary, suggestStockSales, wheelProperties, type GameCommand, type GameState } from '@fortune/game'
export const TURN_SECONDS = 30

export function decisionSeconds(game: GameState): number {
  if (game.phase === 'WAITING_FOR_DEBT') return 90
  if (game.phase === 'WAITING_FOR_CARD_CHOICE') return 15
  if (game.phase === 'WAITING_FOR_WHEEL' && game.pendingWheel?.stage === 'ready') return 15
  return TURN_SECONDS
}

export function decisionKey(game: GameState): string {
  return [game.currentPlayerId, game.turnNumber, game.phase,
    game.pendingCardChoice?.id, game.pendingCardProperty?.id,
    game.pendingWheel?.id, game.pendingWheel?.stage,
    game.pendingDecision?.tileIndex,
    game.extraMove ? 'extra' : 'regular'].join(':')
}

export function timeoutCommand(game: GameState, alreadyRolled: boolean): GameCommand | null {
    switch (game.phase) {
      case 'WAITING_FOR_ROLL': {
        if (alreadyRolled) return null
        const player = game.players.find((candidate) => candidate.id === game.currentPlayerId)
        return { type: (player?.isInJail || player?.isInHospital) ? 'TRY_JAIL_ROLL' : 'ROLL_DICE' }
      }
      case 'WAITING_FOR_PURCHASE':
        return { type: 'SKIP_PURCHASE' }
      case 'WAITING_FOR_UPGRADE':
        return { type: 'SKIP_UPGRADE' }
      case 'WAITING_FOR_CARD_CHOICE':
        return game.pendingCardChoice ? { type: 'CHOOSE_CARD', choiceId: game.pendingCardChoice.id, cardIndex: 0 } : null
      case 'WAITING_FOR_CARD_PROPERTY': {
        const choice = game.pendingCardProperty
        const tile = choice ? cardPropertyCandidates(game, choice.playerId)[0] : null
        return choice && tile ? { type: 'CHOOSE_CARD_PROPERTY', choiceId: choice.id, tileIndex: tile.index } : null
      }
      case 'WAITING_FOR_WHEEL': {
        const wheel = game.pendingWheel
        if (!wheel || wheel.stage === 'spinning') return null
        if (wheel.stage === 'ready') return { type: 'SPIN_WHEEL', wheelId: wheel.id }
        const tile = wheelProperties(game, wheel.playerId, wheel.outcome)[0]
        return tile ? { type: 'CHOOSE_WHEEL_PROPERTY', wheelId: wheel.id, tileIndex: tile.index } : null
      }
      case 'WAITING_FOR_DEBT': {
        const debt = game.pendingDebt
        if (!debt) return null
        const cash = game.players.find(player => player.id === debt.debtorId)?.cash ?? 0
        if (cash >= debt.amount) return { type: 'SETTLE_DEBT' }
        if (game.stockMarket && stockPortfolioSummary(game.stockMarket, debt.debtorId).marketValue >= debt.amount - cash) {
          return { type: 'LIQUIDATE_ASSETS', selections: [], stockSales: suggestStockSales(game.stockMarket, debt.debtorId, debt.amount - cash), quoteRevision: game.stockMarket.quoteRevision }
        }
        return { type: 'DECLARE_BANKRUPTCY' }
      }
      case 'WAITING_FOR_END_TURN':
        return { type: 'END_TURN' }
      case 'FINISHED':
      case 'WAITING_FOR_AUCTION':
        return null
    }
  }
