import { STOCKS, maximumStockQuantity, stockAvailableCash, stockPortfolioSummary, stockPositionValue, stockTradeQuote, type GameCommand, type GameView, type StockId, type StockSide } from '@fortune/game'
import { ArrowDownUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Modal } from '../Modal.js'
import { StockChart, StockSparkline } from './StockChart.js'
import { stockMoney, stockPercent, stockPrice, stockProfit, stockTone } from './format.js'
import '../../styles/stocks.css'

export function StockMarketPanel({ game, playerId, available, onCommand, onClose }: { game: GameView; playerId: string; available: boolean; onCommand: (command: GameCommand) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<StockId>('civic')
  const [side, setSide] = useState<StockSide>('buy')
  const [quantity, setQuantity] = useState('')
  const [windowSize, setWindowSize] = useState(120)
  const [receipt, setReceipt] = useState<string | null>(null)
  const submitted = useRef<{ revision: number; stockId: StockId; side: StockSide; quantity: number } | null>(null)
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
  const change = quote.priceCents / quote.previousPriceCents - 1
  const points = windowSize ? quote.history.filter(point => point.turn >= market.updatedTurn - windowSize + 1) : quote.history
  const positionProfit = stockPositionValue(market, playerId, selected) - (position?.costBasis ?? 0)
  const chooseSide = (value: StockSide) => { setSide(value); setQuantity(''); setReceipt(null) }
  return <Modal label="股市" onDismiss={onClose}><button className="panel-backdrop" aria-label="关闭股市" onClick={onClose} /><section className="stock-panel">
    <header className="stock-panel-header"><div><ArrowDownUp size={18} /><h2>股市</h2><span>{game.phase === 'FINISHED' ? '本局已收盘' : `第 ${market.updatedTurn} 回合行情`}</span></div><button className="icon-command" onClick={onClose} aria-label="关闭股市"><X size={20} /></button></header>
    <div className="stock-panel-body">
      <section className="stock-overview" aria-label="我的持仓"><div className="stock-value"><small>持仓市值</small><div><strong>{stockMoney(summary.marketValue)}</strong><b className={stockTone(summary.returnRate)}>{stockPercent(summary.returnRate)}</b></div><span>持仓盈亏 <b className={stockTone(summary.unrealizedProfit)}>{stockProfit(summary.unrealizedProfit)}</b></span></div>
        <dl><div><dt>持仓本金</dt><dd>{stockMoney(summary.costBasis)}</dd></div><div><dt>已实现盈亏</dt><dd className={stockTone(summary.realizedProfit)}>{stockProfit(summary.realizedProfit)}</dd></div><div><dt>累计盈亏</dt><dd className={stockTone(summary.totalProfit)}>{stockProfit(summary.totalProfit)}</dd></div></dl>
      </section>
      <div className="stock-selector" role="group" aria-label="选择股票">{STOCKS.map(entry => {
        const price = market.stocks[entry.id], change = price.priceCents / price.previousPriceCents - 1
        return <button key={entry.id} className={entry.id === selected ? 'is-selected' : ''} aria-pressed={entry.id === selected} onClick={() => { setSelected(entry.id); setQuantity(''); setReceipt(null) }}><span><strong>{entry.name}</strong><small>{entry.style}</small></span><div><b>{stockPrice(price.priceCents)}</b><small className={stockTone(change)}>{stockPercent(change)}</small></div><StockSparkline points={price.history.slice(-30)} color={entry.color} /></button>
      })}</div>
      <div className="stock-workspace"><section className="stock-detail" aria-label={`${stock.name}行情`}>
        <header><div><h3>{stock.name}<small>{stock.symbol}</small></h3><p>{stock.description}</p></div><strong className={stockTone(change)}>{stockPercent(change)}<small>本回合</small></strong></header>
        <div className="stock-periods" role="group" aria-label="走势区间">{[[30, '近 30 回合'], [120, '近 120 回合'], [0, quote.history[0]?.turn === 1 ? '全部' : '近 600 回合']].map(([value, label]) => <button key={value} className={windowSize === value ? 'active' : ''} aria-pressed={windowSize === value} onClick={() => setWindowSize(Number(value))}>{label}</button>)}</div>
        <StockChart key={`${selected}:${windowSize}`} points={points} name={stock.name} color={stock.color} costCents={position ? position.costBasis * 100 / position.quantity : undefined} />
        <dl className="stock-position"><div><dt>持有股数</dt><dd>{(position?.quantity ?? 0).toLocaleString('zh-CN')}</dd></div><div><dt>平均成本</dt><dd>{position ? stockPrice(position.costBasis * 100 / position.quantity) : '—'}</dd></div><div><dt>持仓盈亏</dt><dd className={stockTone(positionProfit)}>{position ? stockProfit(positionProfit) : '—'}</dd></div></dl>
      </section>
      <form className="stock-order" onSubmit={event => { event.preventDefault(); if (available && order.allowed) { submitted.current = { revision: game.revision, ...trade }; setReceipt(null); onCommand(trade) } }}>
        <div className="stock-order-tabs" role="group" aria-label="交易方向"><button type="button" aria-pressed={side === 'buy'} className={side === 'buy' ? 'active' : ''} onClick={() => chooseSide('buy')}>买入</button><button type="button" aria-pressed={side === 'sell'} className={side === 'sell' ? 'active' : ''} onClick={() => chooseSide('sell')}>卖出</button></div>
        <div className="stock-order-available"><span>{side === 'buy' ? '可用现金' : '可卖股数'}</span><strong>{side === 'buy' ? stockMoney(availableCash) : `${maxQuantity.toLocaleString('zh-CN')} 股`}</strong></div>
        <label htmlFor="stock-quantity">{side === 'buy' ? '买入' : '卖出'}股数<span>每股 {stockPrice(quote.priceCents)}</span></label><input id="stock-quantity" type="number" inputMode="numeric" min={1} step={1} value={quantity} placeholder="输入股数" autoComplete="off" disabled={!available || readOnly || (inDebt && side === 'buy')} onChange={event => { setQuantity(event.target.value); setReceipt(null) }} />
        <div className="stock-order-shortcuts">{[.25, .5, 1].map(ratio => <button type="button" key={ratio} disabled={!available || readOnly || maxQuantity < 1 || (inDebt && side === 'buy')} onClick={() => { setQuantity(String(Math.max(1, Math.floor(maxQuantity * ratio)))); setReceipt(null) }}>{ratio === 1 ? '全部' : `${ratio * 100}%`}</button>)}</div>
        <dl className="stock-order-total"><div><dt>{side === 'buy' ? '预计支出' : '预计到账'}</dt><dd>{quantity && Number.isSafeInteger(order.amount) ? stockMoney(order.amount) : '—'}</dd></div><div><dt>交易后现金</dt><dd>{quantity && order.allowed ? stockMoney(order.balanceAfter) : '—'}</dd></div></dl>
        <button className="primary-command stock-submit" type="submit" disabled={!available || !order.allowed}>{!available ? '等待连接或确认…' : side === 'buy' ? '确认买入' : '确认卖出'}</button>
        <p className="stock-order-note" role="status">{receipt ?? (readOnly ? '当前可查看行情与持仓' : inDebt && side === 'buy' ? '筹款期间可以卖出股票' : quantity && !order.allowed ? order.reason : availableCash < (player?.cash ?? 0) && side === 'buy' ? '竞拍报价已预留，剩余现金可买股' : '按当前报价成交；价格更新后需重新确认')}</p>
      </form></div>
      <details className="stock-help"><summary>交易与盈亏说明</summary><p>行动交给下一位玩家时更新行情，其他人行动时也能交易。买卖不消耗回合，可用现金内自由买入，持有股数内自由卖出。</p><p>持仓本金是当前剩余股票的买入成本；卖出部分的盈亏记入已实现盈亏。累计盈亏 = 已实现盈亏 + 持仓盈亏。红色表示盈利，绿色表示亏损。</p><p>现金以整元结算：买入金额向上取整，卖出向下取整。走势图只展示历史报价，不表示下一回合的方向。</p></details>
    </div>
  </section></Modal>
}
