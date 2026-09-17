import { STOCKS, buildingSaleValue, getTile, liquidationQuote, stockCashValue, stockPaymentCapacity, suggestStockSales, type GameCommand, type GameView, type LiquidationSelection, type StockId } from '@fortune/game'
import { useContext, useState } from 'react'
import { CommandAvailabilityContext } from '../Modal.js'
import { stockPrice } from '../stocks/format.js'
import { StockQuantitySlider } from '../stocks/StockQuantitySlider.js'
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`

export function LiquidationPlanner({ game, playerId, onCommand }: { game: GameView; playerId: string; onCommand: (command: GameCommand) => void }) {
  const [plan, setPlan] = useState<Record<number, LiquidationSelection>>({})
  const available = useContext(CommandAvailabilityContext)
  const player = game.players.find(entry => entry.id === playerId)!
  const debt = game.pendingDebt!
  const [assetsOpen, setAssetsOpen] = useState(() => stockPaymentCapacity(game, playerId) < debt.amount)
  const [stockPlan, setStockPlan] = useState<Partial<Record<StockId, number>>>(() => Object.fromEntries(suggestStockSales(game.stockMarket, playerId, debt.amount - player.cash).map(sale => [sale.stockId, sale.quantity])))
  const cashEnough = player.cash >= debt.amount
  const selections = cashEnough ? [] : Object.values(plan).filter(entry => entry.sellLevels > 0 || entry.mortgage)
  const holdings = game.stockMarket?.portfolios[playerId]?.positions
  const stockSales = cashEnough ? [] : STOCKS.flatMap(stock => { const quantity = Math.min(stockPlan[stock.id] ?? 0, holdings?.[stock.id]?.quantity ?? 0); return quantity > 0 ? [{ stockId: stock.id, quantity }] : [] })
  const quote = liquidationQuote(game, playerId, selections, stockSales, game.stockMarket?.quoteRevision)
  const propertyProceeds = selections.reduce((sum, selection) => sum + selection.sellLevels * buildingSaleValue(selection.tileIndex) + (selection.mortgage ? getTile(selection.tileIndex).mortgage ?? 0 : 0), 0)
  return <section className="liquidation-planner" aria-label="筹款方案">
    <div className="portfolio-debt"><strong>待付 {money(debt.amount)}</strong><p>{debt.reason} · 现金 {money(player.cash)}</p></div>
    {!cashEnough && holdings && Object.values(holdings).some(position => position && position.quantity > 0) && <section className="liquidation-stocks" aria-label="卖出股票筹款"><header><h3>卖出股票</h3><button disabled={!available} onClick={() => setStockPlan({})}>全部保留</button></header>{STOCKS.map(stock => {
      const position = holdings[stock.id]
      if (!position || position.quantity <= 0) return null
      const quantity = Math.min(stockPlan[stock.id] ?? 0, position.quantity)
      const price = game.stockMarket!.stocks[stock.id].priceCents
      const proceeds = stockCashValue(price, quantity)
      return <div className="liquidation-stock" key={stock.id}>
        <div className="liquidation-stock-name"><strong>{stock.name}</strong><small>持有 {position.quantity.toLocaleString('zh-CN')} 股 · {stockPrice(price)}</small></div>
        <span className="liquidation-stock-proceeds">{Number.isSafeInteger(proceeds) ? `+${money(proceeds)}` : '请输入整数股数'}</span>
        <StockQuantitySlider stockName={stock.name} value={quantity} max={position.quantity} disabled={!available} onChange={value => setStockPlan(current => ({ ...current, [stock.id]: Math.max(0, Number(value)) }))} />
      </div>
    })}</section>}
    {!cashEnough && <details className="liquidation-options" open={assetsOpen} onToggle={event => setAssetsOpen(event.currentTarget.open)}><summary>房产筹款{propertyProceeds > 0 && <span>+{money(propertyProceeds)}</span>}</summary>{!game.tiles.some(asset => asset.ownerId === playerId && !asset.mortgaged) && <p className="empty-state">没有可用于筹款的房产</p>}{game.tiles.map((asset, tileIndex) => {
      if (asset.ownerId !== playerId || asset.mortgaged) return null
      const tile = getTile(tileIndex)
      const selection = plan[tileIndex]
      const levels = selection?.sellLevels ?? 0
      const mortgage = selection?.mortgage ?? false
      const proceeds = levels * buildingSaleValue(tileIndex) + (mortgage ? tile.mortgage ?? 0 : 0)
      return <div className={`liquidation-property ${proceeds ? 'is-selected' : ''}`} key={tileIndex}>
        <label htmlFor={`liquidation-property-${tileIndex}`}><strong>{tile.name}</strong>{tile.kind === 'property' && <span>{asset.level} 级</span>}</label>
        <select id={`liquidation-property-${tileIndex}`} aria-label={`${tile.name}筹款方式`} value={mortgage ? 'mortgage' : String(levels)} disabled={!available} onChange={event => {
          const mortgage = event.target.value === 'mortgage'
          setPlan(current => ({ ...current, [tileIndex]: { tileIndex, sellLevels: mortgage ? asset.level : Number(event.target.value), mortgage } }))
        }}>
          <option value="0">保留</option>
          {Array.from({ length: asset.level }, (_, index) => index + 1).map(value => <option key={value} value={value}>出售 {value} 级建筑 · +{money(value * buildingSaleValue(tileIndex))}</option>)}
          <option value="mortgage">{asset.level > 0 ? `出售 ${asset.level} 级并抵押` : '抵押'} · +{money(asset.level * buildingSaleValue(tileIndex) + (tile.mortgage ?? 0))}</option>
        </select>
        {proceeds > 0 && <p>{mortgage ? `${asset.level > 0 ? '建筑全部出售，' : ''}抵押期间不收游览费` : `降至 ${asset.level - levels} 级`}</p>}
      </div>
    })}</details>}
    <div className="liquidation-summary" aria-live="polite">
      {!cashEnough && <div><span>本次筹得</span><strong>{money(quote.proceeds)}</strong></div>}
      {quote.buildingLoss > 0 && <div><span>建筑折价损失</span><span>{money(quote.buildingLoss)}</span></div>}
      <div><span>{quote.remaining > 0 ? '还差' : '付款后余额'}</span><strong>{money(quote.remaining > 0 ? quote.remaining : quote.cashAfter)}</strong></div>
      {!cashEnough && !quote.allowed && quote.reason !== `还需筹集 ${money(quote.remaining)}` && (selections.length > 0 || stockSales.length > 0) && <p>{quote.reason}</p>}
      <button className="primary-command" disabled={!available || (!cashEnough && !quote.allowed)} onClick={() => onCommand(cashEnough ? { type: 'SETTLE_DEBT' } : { type: 'LIQUIDATE_ASSETS', selections, ...(stockSales.length ? { stockSales, quoteRevision: game.stockMarket!.quoteRevision } : {}) })}>{cashEnough ? `支付 ${money(debt.amount)}` : `筹款并支付 ${money(debt.amount)}`}</button>
    </div>
  </section>
}
