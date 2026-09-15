import type { GameView } from '../types.js'
import { STOCK_IDS, type StockSaleSelection, type StockTrade } from './types.js'
import { stockCashValue } from './portfolio.js'

type MarketContext = Pick<GameView, 'phase' | 'players' | 'pendingAuction' | 'pendingDebt' | 'stockMarket'>

export function stockAvailableCash(state: MarketContext, playerId: string): number {
  const cash = state.players.find(player => player.id === playerId)?.cash ?? 0
  return Math.max(0, cash - Math.max(0, state.pendingAuction?.bids[playerId] ?? 0))
}

export function stockTradeQuote(state: MarketContext, playerId: string, trade: StockTrade) {
  const player = state.players.find(entry => entry.id === playerId)
  const market = state.stockMarket
  const availableCash = stockAvailableCash(state, playerId)
  let amount = 0
  const result = (reason: string | null) => ({ allowed: reason === null, reason, amount, availableCash,
    balanceAfter: (player?.cash ?? 0) + (trade.side === 'buy' ? -amount : amount) })
  if (!market) return result('本局股市暂不可用')
  if (!player || player.isBankrupt || state.phase === 'FINISHED') return result('观战或对局结束后不能交易')
  if (trade.quoteRevision !== market.quoteRevision) return result('行情已更新，请查看新价格后重新提交')
  if (!STOCK_IDS.includes(trade.stockId) || (trade.side !== 'buy' && trade.side !== 'sell')
    || !Number.isSafeInteger(trade.quantity) || trade.quantity <= 0) return result('请选择有效的股票和交易股数')
  amount = stockCashValue(market.stocks[trade.stockId].priceCents, trade.quantity, trade.side === 'buy')
  if (!Number.isSafeInteger(amount)) return result('交易金额超出可结算范围')
  const position = market.portfolios[playerId]?.positions[trade.stockId]
  if (trade.side === 'buy') {
    if (state.pendingDebt?.debtorId === playerId) return result('请先偿还欠款；筹款期间可以卖出股票')
    if (amount > availableCash) return result('可用现金不足，已提交的竞拍报价会预留')
    if (!Number.isSafeInteger((position?.quantity ?? 0) + trade.quantity) || !Number.isSafeInteger((position?.costBasis ?? 0) + amount)) return result('持仓超出可结算范围')
  } else {
    if ((position?.quantity ?? 0) < trade.quantity) return result('持有股数不足')
    if (!Number.isSafeInteger(player.cash + amount)) return result('到账金额超出可结算范围')
  }
  return result(null)
}

export function stockLiquidationQuote(state: MarketContext, playerId: string, sales: readonly StockSaleSelection[], quoteRevision?: number) {
  let proceeds = 0
  const result = (reason: string | null) => ({ allowed: reason === null, reason, proceeds })
  if (!sales.length) return result(null)
  if (sales.length > STOCK_IDS.length) return result('股票选择无效')
  const seen = new Set<string>()
  for (const sale of sales) {
    if (seen.has(sale.stockId)) return result('股票选择重复')
    seen.add(sale.stockId)
    const quote = stockTradeQuote(state, playerId, { type: 'TRADE_STOCK', side: 'sell', ...sale, quoteRevision: quoteRevision ?? -1 })
    if (!quote.allowed) return result(quote.reason)
    proceeds += quote.amount
  }
  const cash = state.players.find(player => player.id === playerId)?.cash ?? 0
  return result(Number.isSafeInteger(proceeds + cash) ? null : '到账金额超出可结算范围')
}
