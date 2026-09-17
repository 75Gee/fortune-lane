export const STOCK_IDS = ['civic', 'transit', 'travel', 'tech'] as const
export type StockId = typeof STOCK_IDS[number]
export type StockTrend = 'up' | 'sideways' | 'down'
export type StockSide = 'buy' | 'sell'

export interface StockDefinition {
  id: StockId
  name: string
  symbol: string
  style: string
  description: string
  color: string
}

export interface StockPricePoint { turn: number; priceCents: number }
export interface StockQuote {
  priceCents: number
  previousPriceCents: number
  history: StockPricePoint[]
}
export interface StockPosition { quantity: number; costBasis: number }
export interface StockPortfolio {
  positions: Partial<Record<StockId, StockPosition>>
  realizedProfit: number
}
export interface StockProjectView {
  probability: number
  exposure: number
  revealTurn: number
}
export interface StockProjectNews {
  turn: number
  kind: 'start' | 'update' | 'success' | 'failure'
  probability: number
}
export interface StockMarketView {
  quoteRevision: number
  updatedTurn: number
  stocks: Record<StockId, StockQuote>
  portfolios: Record<string, StockPortfolio>
  project?: StockProjectView | null
  projectNews?: StockProjectNews | null
}
export interface StockModelState { price: number; fundamental: number }
export interface SentimentStockState extends StockModelState { sentiment: number; sentimentVariance: number }
export interface CycleStockState extends SentimentStockState { cycle: [number, number]; cycleVariance: number; period: number }
export interface TrendStockState extends SentimentStockState { trend: number; trendVariance: number; covariance: number }
export interface EventStockState extends StockModelState {
  projectValue: number
  nextProjectTurn: number
  project: (StockProjectView & { age: number; duration: number }) | null
}
export interface CurrentStockMarketState extends StockMarketView {
  modelVersion: 8
  nextUpdateTurn: number
  /** These fields never leave the authoritative engine. */
  internal: { civic: SentimentStockState; transit: CycleStockState; travel: TrendStockState; tech: EventStockState }
}
export interface LegacyStockMarketState extends StockMarketView {
  modelVersion?: 1 | 2 | 3 | 4 | 5 | 6 | 7
  internal: Record<StockId, { price: number; trend?: StockTrend; referencePrice?: number }>
}
export type StockMarketState = CurrentStockMarketState | LegacyStockMarketState
export interface StockSaleSelection { stockId: StockId; quantity: number }
export interface StockFunding { stockSales: StockSaleSelection[]; quoteRevision: number }
export interface StockTrade {
  type: 'TRADE_STOCK'
  stockId: StockId
  side: StockSide
  quantity: number
  quoteRevision: number
}
