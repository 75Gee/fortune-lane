import type { StockId, StockMarketState, StockMarketView, StockSaleSelection, StockSide, StockTrade } from './stockMarket/types.js'

export const PLAYER_COLORS = [
  '#df3f48',
  '#1976a3',
  '#2f8f62',
  '#e29d21',
  '#7b5caf',
  '#d96835',
] as const

export const TOKEN_IDS = [
  'suitcase',
  'camera',
  'compass',
  'train',
  'teapot',
  'kite',
] as const

export type TokenId = (typeof TOKEN_IDS)[number]
export type TileKind =
  | 'go'
  | 'property'
  | 'airport'
  | 'utility'
  | 'chance'
  | 'fate'
  | 'tax'
  | 'jail'
  | 'hospital'
  | 'item'
  | 'go_to_jail'

export type UtilityKind = 'electric' | 'water'
export type CardDeckKind = 'chance' | 'fate'
export type GamePhase =
  | 'WAITING_FOR_ROLL'
  | 'WAITING_FOR_PURCHASE'
  | 'WAITING_FOR_UPGRADE'
  | 'WAITING_FOR_CARD_CHOICE'
  | 'WAITING_FOR_CARD_PROPERTY'
  | 'WAITING_FOR_WHEEL'
  | 'WAITING_FOR_AUCTION'
  | 'WAITING_FOR_DEBT'
  | 'WAITING_FOR_END_TURN'
  | 'FINISHED'

export type DiceValues = readonly [number] | readonly [number, number]
export type ItemKind = 'turtle' | 'chosen-die' | 'roadblock' | 'bomb'

export interface BoardHazard {
  id: string
  kind: 'roadblock' | 'bomb'
  tileIndex: number
  ownerId: string
}

export interface TileDefinition {
  id: string
  index: number
  kind: TileKind
  name: string
  color?: string
  group?: string
  price?: number
  mortgage?: number
  buildCost?: number
  rents?: readonly number[]
  taxAmount?: number
  utilityKind?: UtilityKind
}

export interface TileState {
  ownerId: string | null
  level: number
  mortgaged: boolean
}

export interface HeldCard {
  deck: CardDeckKind
  cardId: string
}

export interface PlayerState {
  id: string
  name: string
  token: TokenId
  color: string
  cash: number
  position: number
  isInJail: boolean
  isInHospital: boolean
  items: ItemKind[]
  turtleRollsRemaining: number
  jailTurns: number
  heldCards: HeldCard[]
  isBankrupt: boolean
  surrendered?: boolean
  connected: boolean
}

export interface DiceRoll {
  dice: DiceValues
  total: number
  isDouble: boolean
}

export interface PendingDecision {
  type: 'purchase' | 'upgrade'
  playerId: string
  tileIndex: number
}

export interface PendingAuction {
  id: string
  tileIndex: number
  initiatorId: string
  participantIds: string[]
  bids: Record<string, number>
  deadline: number
}

export interface PendingCardChoice {
  id: string
  playerId: string
  deck: CardDeckKind
  cardIds: readonly [string, string, string]
  depth: number
}

export interface PendingCardProperty {
  id: string
  playerId: string
  cardId: string
}

export interface PlayerStatistics {
  peakNetWorth: number
  rentReceived: number
  rentPaid: number
  assetsAcquired: number
  steps: number
  itemUses: number
  doubles: number
  trapHits: number
  auctionWins: number
  bestAuctionSaving: number
  receivedFrom: Record<string, number>
  earnedByTile: Record<number, number>
}

export interface GameStatistics {
  startedAt: number
  finishedAt: number | null
  players: Record<string, PlayerStatistics>
  eliminations: { playerId: string; turnNumber: number; reason: 'bankruptcy' | 'surrender' }[]
  largestPayment: { payerId: string; receiverId: string; tileIndex: number; amount: number; turnNumber: number } | null
  bestAuction: { playerId: string; tileIndex: number; amount: number; saving: number; turnNumber: number } | null
}

export type WheelOutcome = 'gain_cash' | 'lose_cash' | 'gain_house' | 'lose_house'

export interface PendingWheel {
  id: string
  playerId: string
  deck: CardDeckKind
  stage: 'ready' | 'spinning' | 'choosing'
  outcome: WheelOutcome | null
  startedAt: number | null
  ballAngle: number
}

export interface DebtContinuation {
  type: 'READY_TO_END' | 'MOVE_AFTER_JAIL'
  dice?: DiceValues
}

export interface PendingDebt {
  debtorId: string
  creditorId: string | null
  amount: number
  reason: string
  continuation: DebtContinuation
  tileIndex?: number
}

export interface DeckState {
  order: string[]
  discard: string[]
}

export type GameEventType =
  | 'GAME_STARTED'
  | 'AUTO_PLAY'
  | 'DECISION_SKIPPED'
  | 'LANDING_RESOLVED'
  | 'DICE_ROLLED'
  | 'TOKEN_MOVED'
  | 'PASSED_START'
  | 'PROPERTY_PURCHASED'
  | 'PROPERTY_UPGRADED'
  | 'RENT_PAID'
  | 'MONEY_CHANGED'
  | 'CARD_DRAWN'
  | 'ITEM_RECEIVED'
  | 'ITEM_USED'
  | 'HAZARD_TRIGGERED'
  | 'EXTRA_MOVE_FINISHED'
  | 'PLAYER_SENT_TO_HOSPITAL'
  | 'PLAYER_LEFT_HOSPITAL'
  | 'WHEEL_SPUN'
  | 'WHEEL_RESOLVED'
  | 'AUCTION_STARTED'
  | 'AUCTION_BID'
  | 'AUCTION_RESOLVED'
  | 'PLAYER_SURRENDERED'
  | 'PLAYER_SENT_TO_JAIL'
  | 'PLAYER_LEFT_JAIL'
  | 'ASSET_MORTGAGED'
  | 'ASSET_REDEEMED'
  | 'BUILDING_SOLD'
  | 'DEBT_CREATED'
  | 'PLAYER_BANKRUPT'
  | 'TURN_CHANGED'
  | 'GAME_FINISHED'
  | 'STOCK_TRADED'

interface GameEventData {
  id: string
  revision: number
  turnNumber?: number
  type: GameEventType
  message: string
  playerId?: string
  targetPlayerId?: string
  tileIndex?: number
  amount?: number
  dice?: DiceValues
  dicePurpose?: 'movement' | 'jail' | 'hospital' | 'utility' | 'chosen'
  from?: number
  to?: number
  path?: number[]
  hazard?: BoardHazard
  itemKind?: ItemKind
  cardId?: string
  cardResult?: string
  sourceCardId?: string
  cardIndex?: 0 | 1 | 2
  wheel?: PendingWheel
  stockId?: StockId
  stockSide?: StockSide
  quantity?: number
}

/** Discriminated payloads require the data consumed by animation and result views. */
export type GameEvent = GameEventData & (
  | { type: 'DICE_ROLLED'; playerId: string; dice: DiceValues }
  | { type: 'TOKEN_MOVED'; playerId: string; from: number; to: number; path: number[] }
  | { type: 'CARD_DRAWN'; playerId: string; cardId: string }
  | { type: 'WHEEL_SPUN' | 'WHEEL_RESOLVED'; playerId: string; wheel: PendingWheel }
  | { type: 'HAZARD_TRIGGERED'; playerId: string; itemKind: ItemKind; hazard: BoardHazard; tileIndex: number }
  | { type: Exclude<GameEventType, 'DICE_ROLLED' | 'TOKEN_MOVED' | 'CARD_DRAWN' | 'WHEEL_SPUN' | 'WHEEL_RESOLVED' | 'HAZARD_TRIGGERED'> }
)
export type GameEventInput = GameEvent extends infer Event ? Event extends GameEvent ? Omit<Event, 'id' | 'revision'> : never : never

export interface GameState {
  revision: number
  phase: GamePhase
  currentPlayerId: string
  turnNumber: number
  consecutiveDoubles: number
  players: PlayerState[]
  tiles: TileState[]
  chanceDeck: DeckState
  fateDeck: DeckState
  pendingDecision: PendingDecision | null
  pendingCardChoice: PendingCardChoice | null
  pendingCardProperty: PendingCardProperty | null
  pendingWheel: PendingWheel | null
  pendingAuction: PendingAuction | null
  pendingDebt: PendingDebt | null
  hazards: BoardHazard[]
  itemUsedThisTurn: boolean
  extraMove: { returnPhase: 'WAITING_FOR_ROLL' | 'WAITING_FOR_END_TURN'; total: number } | null
  lastRoll: DiceRoll | null
  actionLog: GameEvent[]
  winnerPlayerId: string | null
  statistics: GameStatistics
  /** Optional for snapshots created before the stock market was introduced. */
  stockMarket?: StockMarketState
}

/** Public data consumed by the UI. Deck order and unrevealed identities stay in GameState. */
export interface GameView extends Pick<GameState,
  'revision' | 'phase' | 'currentPlayerId' | 'turnNumber' | 'consecutiveDoubles'
  | 'players' | 'tiles' | 'pendingDecision' | 'pendingCardProperty' | 'pendingWheel'
  | 'pendingAuction' | 'pendingDebt' | 'hazards' | 'itemUsedThisTurn' | 'extraMove'
  | 'lastRoll' | 'actionLog' | 'winnerPlayerId' | 'statistics'> {
  chanceDeck: { remaining: number; discarded: number }
  fateDeck: { remaining: number; discarded: number }
  pendingCardChoice: Pick<PendingCardChoice, 'id' | 'playerId' | 'deck'> & { count: 3 } | null
  stockMarket?: StockMarketView
}

export interface GamePlayerSetup {
  id: string
  name: string
  token: TokenId
  connected?: boolean
}

export interface LiquidationSelection {
  tileIndex: number
  sellLevels: number
  mortgage: boolean
}

export type GameCommand =
  | StockTrade
  | { type: 'ROLL_DICE' }
  | { type: 'ROLL_AGAIN' }
  | { type: 'USE_TURTLE'; targetPlayerId: string }
  | { type: 'USE_CHOSEN_DIE'; value: number }
  | { type: 'PLACE_ROADBLOCK'; tileIndex: number }
  | { type: 'PLACE_BOMB'; tileIndex: number }
  | { type: 'BUY_PROPERTY' }
  | { type: 'SKIP_PURCHASE' }
  | { type: 'BID_AUCTION'; auctionId: string; amount: number }
  | { type: 'RESOLVE_AUCTION'; auctionId: string }
  | { type: 'SURRENDER' }
  | { type: 'UPGRADE_PROPERTY' }
  | { type: 'SKIP_UPGRADE' }
  | { type: 'CHOOSE_CARD'; choiceId: string; cardIndex: 0 | 1 | 2 }
  | { type: 'CHOOSE_CARD_PROPERTY'; choiceId: string; tileIndex: number }
  | { type: 'SPIN_WHEEL'; wheelId: string }
  | { type: 'RESOLVE_WHEEL'; wheelId: string }
  | { type: 'CHOOSE_WHEEL_PROPERTY'; wheelId: string; tileIndex: number }
  | { type: 'MORTGAGE_ASSET'; tileIndex: number }
  | { type: 'REDEEM_ASSET'; tileIndex: number }
  | { type: 'SELL_BUILDING'; tileIndex: number }
  | { type: 'LIQUIDATE_ASSETS'; selections: LiquidationSelection[]; stockSales?: StockSaleSelection[] | undefined; quoteRevision?: number | undefined }
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'TRY_JAIL_ROLL' }
  | { type: 'SETTLE_DEBT' }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'END_TURN' }

export interface CommandResult {
  ok: boolean
  state: GameState
  events: GameEvent[]
  error?: string
}

export type RandomSource = () => number
