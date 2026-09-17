import { STOCKS } from '../stockMarket/catalog.js'
import { sellStockPosition, stockCashValue } from '../stockMarket/portfolio.js'
import { stockLiquidationQuote, stockPaymentQuote } from '../stockMarket/quotes.js'
import { STOCK_IDS, type StockFunding, type StockId, type StockSide } from '../stockMarket/types.js'
import type { GameEvent, GameState, PlayerState } from '../types.js'
import { addEvent } from './context.js'

/** Runs after validation, within the engine's atomic command clone. */
export function executeStockTrade(state: GameState, player: PlayerState, stockId: StockId, side: StockSide, quantity: number, amount: number, events: GameEvent[]): void {
  const market = state.stockMarket!
  const portfolio = market.portfolios[player.id] ??= { positions: {}, realizedProfit: 0 }
  if (side === 'buy') {
    const position = portfolio.positions[stockId] ??= { quantity: 0, costBasis: 0 }
    position.quantity += quantity
    position.costBasis += amount
    player.cash -= amount
  } else {
    sellStockPosition(portfolio, stockId, quantity, amount)
    player.cash += amount
  }
  const name = STOCKS.find(stock => stock.id === stockId)!.name
  addEvent(state, events, { type: 'STOCK_TRADED', playerId: player.id, stockId, stockSide: side, quantity,
    amount: side === 'buy' ? -amount : amount,
    message: `${player.name} ${side === 'buy' ? '买入' : '卖出'}${name} ${quantity} 股，${side === 'buy' ? '支付' : '到账'} ${amount} 元` })
}

export function liquidateStockPortfolio(state: GameState, player: PlayerState, events: GameEvent[]): void {
  const market = state.stockMarket
  if (!market) return
  for (const id of STOCK_IDS) {
    const quantity = market.portfolios[player.id]?.positions[id]?.quantity ?? 0
    if (quantity > 0) executeStockTrade(state, player, id, 'sell', quantity, stockCashValue(market.stocks[id].priceCents, quantity), events)
  }
}

/** Sale and payment share one command clone: a later rejection rolls both back. */
export function fundStockPayment(state: GameState, player: PlayerState, amount: number, funding: StockFunding | undefined, events: GameEvent[]): string | null {
  if (player.cash >= amount) return null
  if (!funding) return '现金不足，请使用卖股并支付，或先筹款'
  const quote = stockLiquidationQuote(state, player.id, funding.stockSales, funding.quoteRevision)
  if (!quote.allowed) return quote.reason
  const payment = stockPaymentQuote(state, player.id, amount)
  if (!payment.allowed) return payment.reason
  const expected = payment.stockFunding!.stockSales
  if (funding.stockSales.length !== expected.length || expected.some((sale, index) =>
    funding.stockSales[index]?.stockId !== sale.stockId || funding.stockSales[index]?.quantity !== sale.quantity)) {
    return '持仓或余额已变化，请查看新的卖股方案后重试'
  }
  for (const sale of expected) executeStockTrade(state, player, sale.stockId, 'sell', sale.quantity,
    stockCashValue(state.stockMarket!.stocks[sale.stockId].priceCents, sale.quantity), events)
  return null
}
