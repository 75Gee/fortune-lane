import type { GameState, PendingAuction, PendingCardChoice, PendingCardProperty, PendingDebt, PendingDecision, PendingWheel } from '../types.js'

/** A new phase must carry its decision data; all previous decisions are cleared together. */
export type PhaseTransition =
  | { phase: 'WAITING_FOR_ROLL' | 'WAITING_FOR_END_TURN' }
  | { phase: 'FINISHED'; winnerPlayerId: string }
  | { phase: 'WAITING_FOR_PURCHASE'; pendingDecision: PendingDecision & { type: 'purchase' } }
  | { phase: 'WAITING_FOR_UPGRADE'; pendingDecision: PendingDecision & { type: 'upgrade' } }
  | { phase: 'WAITING_FOR_CARD_CHOICE'; pendingCardChoice: PendingCardChoice }
  | { phase: 'WAITING_FOR_CARD_PROPERTY'; pendingCardProperty: PendingCardProperty }
  | { phase: 'WAITING_FOR_WHEEL'; pendingWheel: PendingWheel }
  | { phase: 'WAITING_FOR_AUCTION'; pendingAuction: PendingAuction }
  | { phase: 'WAITING_FOR_DEBT'; pendingDebt: PendingDebt }

export function transitionTo(state: GameState, next: PhaseTransition): void {
  state.pendingDecision = null
  state.pendingCardChoice = null
  state.pendingCardProperty = null
  state.pendingWheel = null
  state.pendingAuction = null
  state.pendingDebt = null
  Object.assign(state, next)
}
