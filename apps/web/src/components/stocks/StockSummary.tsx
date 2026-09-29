import { STOCKS, stockPortfolioSummary, stockPositionValue, type StockMarketView } from '@fortune/game'
import { stockMoney, stockPercent, stockTone } from './format.js'
import '../../styles/stocks.css'

export function StockHoldings({ market, playerId }: { market: StockMarketView | undefined; playerId: string }) {
  const summary = stockPortfolioSummary(market, playerId)
  if (!market || (!summary.costBasis && !summary.realizedProfit)) return null
  return (
    <section className="stock-holdings" aria-label="股票资产">
      <header>
        <strong>股票市值</strong>
        <b>{stockMoney(summary.marketValue)}</b>
      </header>
      {STOCKS.map((stock) => {
        const position = market.portfolios[playerId]?.positions[stock.id]
        return position ? (
          <div key={stock.id}>
            <span>
              {stock.name}
              <small>{position.quantity.toLocaleString('zh-CN')} 股</small>
            </span>
            <strong>{stockMoney(stockPositionValue(market, playerId, stock.id))}</strong>
          </div>
        ) : null
      })}
      <footer>
        <span>
          持仓盈亏 <b className={stockTone(summary.returnRate)}>{stockPercent(summary.returnRate)}</b>
        </span>
        <span>
          已实现{' '}
          <b className={stockTone(summary.realizedProfit)}>
            {summary.realizedProfit > 0 ? '+' : ''}
            {stockMoney(summary.realizedProfit)}
          </b>
        </span>
      </footer>
    </section>
  )
}
