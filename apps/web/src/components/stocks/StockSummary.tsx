import { STOCKS, stockPortfolioSummary, stockPositionValue, type StockMarketView } from '@fortune/game'
import { ChartNoAxesCombined, ChevronRight } from 'lucide-react'
import { stockMoney, stockPercent, stockTone } from './format.js'
import '../../styles/stocks.css'

export function StockEntry({ market, playerId, onOpen }: { market: StockMarketView; playerId: string; onOpen: () => void }) {
  const summary = stockPortfolioSummary(market, playerId)
  return <button className="stock-entry" onClick={onOpen} aria-label={`打开股市，持仓市值 ${stockMoney(summary.marketValue)}，持仓涨跌 ${stockPercent(summary.returnRate)}`}>
    <ChartNoAxesCombined size={20} /><span><small>股市 · 持仓市值</small><span><strong>{stockMoney(summary.marketValue)}</strong><b className={stockTone(summary.returnRate)}>{stockPercent(summary.returnRate)}</b></span></span><ChevronRight size={15} />
  </button>
}

export function StockHoldings({ market, playerId }: { market: StockMarketView | undefined; playerId: string }) {
  const summary = stockPortfolioSummary(market, playerId)
  if (!market || (!summary.costBasis && !summary.realizedProfit)) return null
  return <section className="stock-holdings" aria-label="股票资产"><header><strong>股票市值</strong><b>{stockMoney(summary.marketValue)}</b></header>
    {STOCKS.map(stock => { const position = market.portfolios[playerId]?.positions[stock.id]; return position ? <div key={stock.id}><span>{stock.name}<small>{position.quantity.toLocaleString('zh-CN')} 股</small></span><strong>{stockMoney(stockPositionValue(market, playerId, stock.id))}</strong></div> : null })}
    <footer><span>持仓盈亏 <b className={stockTone(summary.returnRate)}>{stockPercent(summary.returnRate)}</b></span><span>已实现 <b className={stockTone(summary.realizedProfit)}>{summary.realizedProfit > 0 ? '+' : ''}{stockMoney(summary.realizedProfit)}</b></span></footer>
  </section>
}
