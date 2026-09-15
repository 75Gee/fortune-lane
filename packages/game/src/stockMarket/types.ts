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
export interface StockMarketView {
  quoteRevision: number
  updatedTurn: number
  stocks: Record<StockId, StockQuote>
  portfolios: Record<string, StockPortfolio>
}
export interface StockModelState {
  price: number
  referencePrice: number
  trend: StockTrend
  jumpBias: number
  /** Volatility state at the END of the last update, after a possible jump. */
  active: boolean
}
export interface CurrentStockMarketState extends StockMarketView {
  modelVersion: 2
  /** These fields never leave the authoritative engine. */
  internal: Record<StockId, StockModelState>
}
export interface LegacyStockMarketState extends StockMarketView {
  modelVersion?: 1
  internal: Record<StockId, { price: number; trend: StockTrend }>
}
export type StockMarketState = CurrentStockMarketState | LegacyStockMarketState
export interface StockSaleSelection { stockId: StockId; quantity: number }
export interface StockTrade {
  type: 'TRADE_STOCK'
  stockId: StockId
  side: StockSide
  quantity: number
  quoteRevision: number
}
