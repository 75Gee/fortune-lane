import type { GameEvent } from '@fortune/game'

export interface MoneyDelta {
  playerId: string
  amount: number
  /** Money moved between players (rent) or with the bank. */
  kind: 'rent' | 'bank' | 'purchase' | 'auction' | 'start'
}

/**
 * Cash movements an event causes, signed from each player's point of view.
 * Stock trades and asset liquidation are left out: the player started them and the panel
 * they used already reports the result.
 */
export function moneyDeltas(event: GameEvent): MoneyDelta[] {
  const amount = event.amount ?? 0
  if (!event.playerId || !amount) return []
  switch (event.type) {
    case 'RENT_PAID':
      return [
        { playerId: event.playerId, amount, kind: 'rent' },
        ...(event.targetPlayerId ? [{ playerId: event.targetPlayerId, amount: -amount, kind: 'rent' as const }] : []),
      ]
    case 'MONEY_CHANGED':
      return [{ playerId: event.playerId, amount, kind: 'bank' }]
    case 'PASSED_START':
      return [{ playerId: event.playerId, amount, kind: 'start' }]
    case 'AUCTION_RESOLVED':
      return [{ playerId: event.playerId, amount: -amount, kind: 'auction' }]
    case 'PROPERTY_PURCHASED':
    case 'PROPERTY_UPGRADED':
      return [{ playerId: event.playerId, amount: -amount, kind: 'purchase' }]
    default:
      return []
  }
}
