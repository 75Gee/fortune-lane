import { STOCKS } from '../stockMarket/catalog.js'
import { sellStockPosition, stockCashValue } from '../stockMarket/portfolio.js'
import { STOCK_IDS, type StockId, type StockSide } from '../stockMarket/types.js'
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
