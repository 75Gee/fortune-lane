import { STOCKS, buildingSaleValue, getTile, liquidationQuote, stockCashValue, suggestStockSales, type GameCommand, type GameView, type LiquidationSelection, type StockId } from '@fortune/game'
import { useContext, useState } from 'react'
import { CommandAvailabilityContext } from '../Modal.js'
import { stockPrice } from '../stocks/format.js'
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`

export function LiquidationPlanner({ game, playerId, onCommand }: { game: GameView; playerId: string; onCommand: (command: GameCommand) => void }) {
  const [plan, setPlan] = useState<Record<number, LiquidationSelection>>({})
  const available = useContext(CommandAvailabilityContext)
  const player = game.players.find(entry => entry.id === playerId)!
  const debt = game.pendingDebt!
  const [stockPlan, setStockPlan] = useState<Partial<Record<StockId, number>>>(() => Object.fromEntries(suggestStockSales(game.stockMarket, playerId, debt.amount - player.cash).map(sale => [sale.stockId, sale.quantity])))
  const cashEnough = player.cash >= debt.amount
  const selections = cashEnough ? [] : Object.values(plan).filter(entry => entry.sellLevels > 0 || entry.mortgage)
  const holdings = game.stockMarket?.portfolios[playerId]?.positions
  const stockSales = cashEnough ? [] : STOCKS.flatMap(stock => { const quantity = Math.min(stockPlan[stock.id] ?? 0, holdings?.[stock.id]?.quantity ?? 0); return quantity > 0 ? [{ stockId: stock.id, quantity }] : [] })
  const quote = liquidationQuote(game, playerId, selections, stockSales, game.stockMarket?.quoteRevision)
  const update = (tileIndex: number, change: Partial<LiquidationSelection>) => setPlan(current => ({ ...current, [tileIndex]: { tileIndex, sellLevels: 0, mortgage: false, ...current[tileIndex], ...change } }))
  return <section className="liquidation-planner" aria-label="筹款方案">
    <div className="portfolio-debt"><strong>待付 {money(debt.amount)}</strong><p>{debt.reason} · 现金 {money(player.cash)}</p><p>选好方案后一次付款；提交前可以调整。</p></div>
    {!cashEnough && holdings && Object.keys(holdings).length > 0 && <section className="liquidation-stocks" aria-label="卖出股票筹款"><header><strong>卖出股票</strong><button disabled={!available} onClick={() => setStockPlan({})}>保留全部股票</button></header>{STOCKS.map(stock => {
      const position = holdings[stock.id]
      if (!position) return null
      const quantity = Math.min(stockPlan[stock.id] ?? 0, position.quantity)
      const price = game.stockMarket!.stocks[stock.id].priceCents
      const proceeds = stockCashValue(price, quantity)
      return <label className="liquidation-stock" key={stock.id}><span>{stock.name}<small>持有 {position.quantity.toLocaleString('zh-CN')} 股 · {stockPrice(price)}</small><small>{Number.isSafeInteger(proceeds) ? `卖出可得 ${money(proceeds)}` : '请输入整数股数'}</small></span><input type="number" inputMode="numeric" min={0} max={position.quantity} step={1} aria-label={`卖出${stock.name}股数`} value={quantity} disabled={!available} onChange={event => setStockPlan(current => ({ ...current, [stock.id]: Math.max(0, Number(event.target.value)) }))} /><button type="button" disabled={!available} onClick={() => setStockPlan(current => ({ ...current, [stock.id]: position.quantity }))}>全部</button></label>
    })}</section>}
    {!cashEnough && game.tiles.map((asset, tileIndex) => {
      if (asset.ownerId !== playerId || asset.mortgaged) return null
      const tile = getTile(tileIndex)
      const selection = plan[tileIndex]
      const levels = selection?.sellLevels ?? 0
      const mortgage = selection?.mortgage ?? false
      const proceeds = levels * buildingSaleValue(tileIndex) + (mortgage ? tile.mortgage ?? 0 : 0)
      return <article className={`liquidation-asset ${proceeds ? 'is-selected' : ''}`} key={tileIndex}>
        <header><strong>{tile.name}</strong><span>{proceeds ? `+${money(proceeds)}` : `${asset.level} 级`}</span></header>
        {asset.level > 0 && <label className="liquidation-levels">出售建筑<select aria-label={`${tile.name}出售建筑数量`} value={levels} disabled={!available || mortgage} onChange={event => update(tileIndex, { sellLevels: Number(event.target.value) })}>
          {Array.from({ length: asset.level + 1 }, (_, value) => <option key={value} value={value}>{value === 0 ? '保留建筑' : `卖 ${value} 级 · +${money(value * buildingSaleValue(tileIndex))}`}</option>)}
        </select></label>}
        <label className="liquidation-mortgage"><input type="checkbox" aria-label={`抵押${tile.name}，获得${money(tile.mortgage ?? 0)}`} checked={mortgage} disabled={!available} onChange={event => update(tileIndex, { mortgage: event.target.checked, ...(event.target.checked ? { sellLevels: asset.level } : {}) })} /><span>抵押地产 · +{money(tile.mortgage ?? 0)}{asset.level > 0 && <small>抵押时先出售全部建筑</small>}</span></label>
        {proceeds > 0 && <p>{mortgage ? '出售后为 0 级，抵押期间不收取游览费' : `出售后降至 ${asset.level - levels} 级`}</p>}
      </article>
    })}
    <div className="liquidation-summary" aria-live="polite">
      <div><span>本次筹得</span><strong>{money(quote.proceeds)}</strong></div>
      {quote.buildingLoss > 0 && <div><span>建筑折价损失</span><span>{money(quote.buildingLoss)}</span></div>}
      <div><span>{quote.remaining > 0 ? '还差' : '付款后余额'}</span><strong>{money(quote.remaining > 0 ? quote.remaining : quote.cashAfter)}</strong></div>
      {!cashEnough && !quote.allowed && (selections.length > 0 || stockSales.length > 0) && <p>{quote.reason}</p>}
      <button className="primary-command" disabled={!available || (!cashEnough && !quote.allowed)} onClick={() => onCommand(cashEnough ? { type: 'SETTLE_DEBT' } : { type: 'LIQUIDATE_ASSETS', selections, ...(stockSales.length ? { stockSales, quoteRevision: game.stockMarket!.quoteRevision } : {}) })}>{cashEnough ? '支付欠款' : `确认筹款并支付 ${money(debt.amount)}`}</button>
    </div>
  </section>
}
