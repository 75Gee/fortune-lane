import { STOCK_IDS, type StockId, type StockMarketView, type StockPortfolio, type StockSaleSelection } from './types.js'

/** Cash remains integer yuan throughout the existing game. Exact integer
 * arithmetic prevents fractional-share/rounding arbitrage and unsafe products. */
export function stockCashValue(priceCents: number, quantity: number, buying = false): number {
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0 || !Number.isSafeInteger(quantity) || quantity < 0) return NaN
  const cents = BigInt(priceCents) * BigInt(quantity)
  const amount = (cents + (buying ? 99n : 0n)) / 100n
  return amount > BigInt(Number.MAX_SAFE_INTEGER) ? NaN : Number(amount)
}

export function maximumStockQuantity(cash: number, priceCents: number): number {
  if (!Number.isSafeInteger(cash) || cash <= 0 || !Number.isSafeInteger(priceCents) || priceCents <= 0) return 0
  return Number((BigInt(cash) * 100n / BigInt(priceCents)) > BigInt(Number.MAX_SAFE_INTEGER)
    ? BigInt(Number.MAX_SAFE_INTEGER) : BigInt(cash) * 100n / BigInt(priceCents))
}

export function stockPositionValue(market: StockMarketView | undefined, playerId: string, stockId: StockId): number {
  const quantity = market?.portfolios[playerId]?.positions[stockId]?.quantity ?? 0
  if (!market || !quantity) return 0
  return stockCashValue(market.stocks[stockId].priceCents, quantity)
}

export function stockPortfolioSummary(market: StockMarketView | undefined, playerId: string) {
  const portfolio = market?.portfolios[playerId]
  const costBasis = STOCK_IDS.reduce((sum, id) => sum + (portfolio?.positions[id]?.costBasis ?? 0), 0)
  const marketValue = STOCK_IDS.reduce((sum, id) => sum + stockPositionValue(market, playerId, id), 0)
  const unrealizedProfit = marketValue - costBasis
  const realizedProfit = portfolio?.realizedProfit ?? 0
  return { costBasis, marketValue, unrealizedProfit, realizedProfit, totalProfit: realizedProfit + unrealizedProfit,
    returnRate: costBasis > 0 ? unrealizedProfit / costBasis : null }
}

/** Prefer one sale from the largest position; never sell more than needed. */
export function suggestStockSales(market: StockMarketView | undefined, playerId: string, cashNeeded: number): StockSaleSelection[] {
  if (!market || cashNeeded <= 0 || !Number.isSafeInteger(cashNeeded)) return []
  let remaining = cashNeeded
  const sales: StockSaleSelection[] = []
  for (const id of [...STOCK_IDS].sort((a, b) => stockPositionValue(market, playerId, b) - stockPositionValue(market, playerId, a))) {
    const held = market.portfolios[playerId]?.positions[id]?.quantity ?? 0
    if (!held || remaining <= 0) continue
    const price = market.stocks[id].priceCents
    const needed = (BigInt(remaining) * 100n + BigInt(price) - 1n) / BigInt(price)
    const quantity = Number(needed < BigInt(held) ? needed : BigInt(held))
    sales.push({ stockId: id, quantity })
    remaining -= stockCashValue(price, quantity)
  }
  return sales
}

/** Caller validates ownership, amount and cash before mutating its cloned state. */
export function sellStockPosition(portfolio: StockPortfolio, id: StockId, quantity: number, proceeds: number): void {
  const position = portfolio.positions[id]!
  const removedCost = quantity === position.quantity ? position.costBasis
    : Number(BigInt(position.costBasis) * BigInt(quantity) / BigInt(position.quantity))
  position.quantity -= quantity
  position.costBasis -= removedCost
  portfolio.realizedProfit += proceeds - removedCost
  if (position.quantity === 0) delete portfolio.positions[id]
}
