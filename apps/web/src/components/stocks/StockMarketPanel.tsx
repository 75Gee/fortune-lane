import { STOCKS, maximumStockQuantity, stockAvailableCash, stockPortfolioSummary, stockPositionValue, stockTradeQuote, type GameCommand, type GameView, type StockId, type StockSide } from '@fortune/game'
import { ArrowDownUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Modal } from '../Modal.js'
import { StockChart } from './StockChart.js'
import { StockQuantitySlider } from './StockQuantitySlider.js'
import { stockMoney, stockPercent, stockPrice, stockProfit, stockTone } from './format.js'
import '../../styles/stocks.css'

export function StockMarketPanel({ game, playerId, available, onCommand, onClose }: { game: GameView; playerId: string; available: boolean; onCommand: (command: GameCommand) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<StockId>('civic')
  const [side, setSide] = useState<StockSide>('buy')
  const [quantity, setQuantity] = useState('')
  const [windowSize, setWindowSize] = useState(120)
  const [chartOpen, setChartOpen] = useState(() => window.matchMedia('(min-width: 601px)').matches)
  const [receipt, setReceipt] = useState<string | null>(null)
  const submitted = useRef<{ revision: number; stockId: StockId; side: StockSide; quantity: number } | null>(null)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 601px)')
    const resize = () => setChartOpen(media.matches)
    media.addEventListener('change', resize)
    return () => media.removeEventListener('change', resize)
  }, [])
  useEffect(() => {
    const order = submitted.current
    if (!order) return
    const event = game.actionLog.findLast(entry => entry.revision > order.revision && entry.type === 'STOCK_TRADED' && entry.playerId === playerId && entry.stockId === order.stockId && entry.stockSide === order.side && entry.quantity === order.quantity)
    if (event) { submitted.current = null; setQuantity(''); setReceipt(`已${order.side === 'buy' ? '买入' : '卖出'} ${order.quantity.toLocaleString('zh-CN')} 股 · ${stockMoney(Math.abs(event.amount ?? 0))}`) }
  }, [game.actionLog, playerId])
  const market = game.stockMarket
  if (!market) return null
  const stock = STOCKS.find(entry => entry.id === selected)!
  const quote = market.stocks[selected]
  const player = game.players.find(entry => entry.id === playerId)
  const position = market.portfolios[playerId]?.positions[selected]
  const summary = stockPortfolioSummary(market, playerId)
  const availableCash = stockAvailableCash(game, playerId)
  const maxQuantity = side === 'buy' ? maximumStockQuantity(availableCash, quote.priceCents) : position?.quantity ?? 0
  const trade = { type: 'TRADE_STOCK', stockId: selected, side, quantity: Number(quantity), quoteRevision: market.quoteRevision } as const
  const order = stockTradeQuote(game, playerId, trade)
  const readOnly = !player || player.isBankrupt || game.phase === 'FINISHED'
  const inDebt = game.pendingDebt?.debtorId === playerId
  const points = windowSize ? quote.history.slice(-windowSize) : quote.history
  const positionProfit = stockPositionValue(market, playerId, selected) - (position?.costBasis ?? 0)
  const orderNote = receipt ?? (readOnly ? '当前可查看行情与持仓' : inDebt && side === 'buy' ? '筹款期间可以卖出股票' : quantity && Number(quantity) !== 0 && !order.allowed ? order.reason : availableCash < (player?.cash ?? 0) && side === 'buy' ? '竞拍报价已预留，剩余现金可买股' : null)
  const chooseSide = (value: StockSide) => { setSide(value); setQuantity(''); setReceipt(null) }
  return <Modal label="股市" onDismiss={onClose}><button className="panel-backdrop" aria-label="关闭股市" onClick={onClose} /><section className="stock-panel">
    <header className="stock-panel-header"><div><ArrowDownUp size={18} /><h2>股市</h2><span>{game.phase === 'FINISHED' ? '本局已收盘' : `第 ${market.updatedTurn} 回合行情`}</span></div><button className="icon-command" onClick={onClose} aria-label="关闭股市"><X size={20} /></button></header>
    <div className="stock-panel-body">
      <section className="stock-account" aria-label="我的持仓">
        <div><span>持仓市值</span><strong>{stockMoney(summary.marketValue)}</strong></div>
        <div><span>持仓盈亏</span><strong className={stockTone(summary.unrealizedProfit)}>{stockProfit(summary.unrealizedProfit)} <small>{stockPercent(summary.returnRate)}</small></strong></div>
        <details className="stock-account-details"><summary>收益明细</summary><dl><div><dt>持仓本金</dt><dd>{stockMoney(summary.costBasis)}</dd></div><div><dt>已实现盈亏</dt><dd className={stockTone(summary.realizedProfit)}>{stockProfit(summary.realizedProfit)}</dd></div><div><dt>累计盈亏</dt><dd className={stockTone(summary.totalProfit)}>{stockProfit(summary.totalProfit)}</dd></div></dl></details>
      </section>
      <div className="stock-selector" role="group" aria-label="选择股票">{STOCKS.map(entry => {
        const price = market.stocks[entry.id]
        return <button key={entry.id} className={entry.id === selected ? 'is-selected' : ''} aria-pressed={entry.id === selected} onClick={() => { setSelected(entry.id); setQuantity(''); setReceipt(null) }}><strong>{entry.name}</strong><div><b>{stockPrice(price.priceCents)}</b><small className={stockTone(price.priceCents / price.previousPriceCents - 1)}>{stockPercent(price.priceCents / price.previousPriceCents - 1)}</small></div></button>
      })}</div>
      <header className="stock-selected"><div><h3>{stock.name}</h3><p>持有 {(position?.quantity ?? 0).toLocaleString('zh-CN')} 股{position && <> · 成本 {stockPrice(position.costBasis * 100 / position.quantity)} · 盈亏 <span className={stockTone(positionProfit)}>{stockProfit(positionProfit)}</span></>}</p></div><strong>{stockPrice(quote.priceCents)}</strong></header>
      {selected === 'tech' && market.project && <p className="stock-project-brief">项目成功概率 <strong>{Math.round(market.project.probability * 100)}%</strong> · 预计第 {market.project.revealTurn} 回合揭晓</p>}
      <div className="stock-workspace">
        <form className="stock-order" onSubmit={event => { event.preventDefault(); if (available && order.allowed) { submitted.current = { revision: game.revision, ...trade }; setReceipt(null); onCommand(trade) } }}>
          <div className="stock-order-tabs" role="group" aria-label="交易方向"><button type="button" aria-pressed={side === 'buy'} className={side === 'buy' ? 'active' : ''} onClick={() => chooseSide('buy')}>买入</button><button type="button" aria-pressed={side === 'sell'} className={side === 'sell' ? 'active' : ''} onClick={() => chooseSide('sell')}>卖出</button></div>
          <div className="stock-order-available"><span>{side === 'buy' ? '可用现金' : '当前现金'}</span><strong>{stockMoney(side === 'buy' ? availableCash : player?.cash ?? 0)}</strong></div>
          {side === 'sell' ? <>
            <div className="stock-quantity-heading"><span>卖出股数</span><span>可卖 {maxQuantity.toLocaleString('zh-CN')} 股</span></div>
            <StockQuantitySlider stockName={stock.name} value={quantity} max={maxQuantity} disabled={!available || readOnly} onChange={value => { setQuantity(value); setReceipt(null) }} />
          </> : <>
            <label htmlFor="stock-quantity">买入股数<span>可买 {maxQuantity.toLocaleString('zh-CN')} 股</span></label>
            <input id="stock-quantity" type="number" inputMode="numeric" min={1} max={maxQuantity} step={1} value={quantity} placeholder="输入股数" autoComplete="off" disabled={!available || readOnly || inDebt} onChange={event => { setQuantity(event.target.value); setReceipt(null) }} />
            <div className="stock-order-shortcuts">{[.25, .5, 1].map(ratio => <button type="button" key={ratio} disabled={!available || readOnly || maxQuantity < 1 || inDebt} onClick={() => { setQuantity(String(Math.max(1, Math.floor(maxQuantity * ratio)))); setReceipt(null) }}>{ratio === 1 ? '全部' : `${ratio * 100}%`}</button>)}</div>
          </>}
          <dl className="stock-order-total"><div><dt>{side === 'buy' ? '预计支出' : '预计到账'}</dt><dd>{Number(quantity) > 0 && Number.isSafeInteger(order.amount) ? stockMoney(order.amount) : '—'}</dd></div><div><dt>交易后现金</dt><dd>{quantity && order.allowed ? stockMoney(order.balanceAfter) : '—'}</dd></div></dl>
          <button className="primary-command stock-submit" type="submit" disabled={!available || !order.allowed}>{!available ? '等待连接或确认…' : side === 'buy' ? '确认买入' : '确认卖出'}</button>
          <p className="stock-order-note" role="status">{orderNote}</p>
        </form>
        <section className="stock-detail" aria-label={`${stock.name}行情`}>
          <details className="stock-chart-disclosure" open={chartOpen} onToggle={event => setChartOpen(event.currentTarget.open)}><summary>历史走势</summary>
            <div className="stock-periods" role="group" aria-label="走势区间">{[[30, '近 30 次'], [120, '近 120 次'], [0, quote.history[0]?.turn === 1 ? '全部' : '保留行情']].map(([value, label]) => <button key={value} className={windowSize === value ? 'active' : ''} aria-pressed={windowSize === value} onClick={() => setWindowSize(Number(value))}>{label}</button>)}</div>
            <StockChart key={`${selected}:${windowSize}`} points={points} name={stock.name} color={stock.color} costCents={position ? position.costBasis * 100 / position.quantity : undefined} />
          </details>
        </section>
      </div>
      <details className="stock-help"><summary>股票与交易说明</summary><div className="stock-help-content"><section><h3>{stock.name}</h3><p>{stock.description}</p>{selected === 'tech' && <p>{market.project ? `当前为${market.project.exposure > .2 ? '重大' : '普通'}项目；公开线索已计入价格，成功概率不等于收益率。` : market.projectNews ? `第 ${market.projectNews.turn} 回合${market.projectNews.kind === 'success' ? '项目成功' : market.projectNews.kind === 'failure' ? '项目未成功' : '项目消息更新'}，等待新项目。` : '暂无进行中的项目。'}</p>}</section><section><h3>成交规则</h3><p>按当前报价成交。每 5 个玩家回合更新行情，价格更新后需重新确认。其他人行动时也能交易，不消耗回合或延长倒计时。</p><p>买入金额向上取整到元，卖出向下取整到元。</p></section><section><h3>盈亏与走势</h3><p>持仓盈亏对应剩余股票；累计盈亏包含已实现盈亏。红色为盈利，绿色为亏损。历史走势不预示后续方向。</p></section></div></details>
    </div>
  </section></Modal>
}
