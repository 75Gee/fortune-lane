import { buildingSaleValue, getTile, liquidationQuote, type GameCommand, type GameView, type LiquidationSelection } from '@fortune/game'
import { useContext, useState } from 'react'
import { CommandAvailabilityContext } from '../Modal.js'
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`

export function LiquidationPlanner({ game, playerId, onCommand }: { game: GameView; playerId: string; onCommand: (command: GameCommand) => void }) {
  const [plan, setPlan] = useState<Record<number, LiquidationSelection>>({})
  const available = useContext(CommandAvailabilityContext)
  const player = game.players.find(entry => entry.id === playerId)!
  const debt = game.pendingDebt!
  const cashEnough = player.cash >= debt.amount
  const selections = cashEnough ? [] : Object.values(plan).filter(entry => entry.sellLevels > 0 || entry.mortgage)
  const quote = liquidationQuote(game, playerId, selections)
  const update = (tileIndex: number, change: Partial<LiquidationSelection>) => setPlan(current => ({ ...current, [tileIndex]: { tileIndex, sellLevels: 0, mortgage: false, ...current[tileIndex], ...change } }))
  return <section className="liquidation-planner" aria-label="筹款方案">
    <div className="portfolio-debt"><strong>待付 {money(debt.amount)}</strong><p>{debt.reason} · 现金 {money(player.cash)}</p><p>选好方案后一次付款；提交前可以调整。</p></div>
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
      {!cashEnough && !quote.allowed && selections.length > 0 && <p>{quote.reason}</p>}
      <button className="primary-command" disabled={!available || (!cashEnough && !quote.allowed)} onClick={() => onCommand(cashEnough ? { type: 'SETTLE_DEBT' } : { type: 'LIQUIDATE_ASSETS', selections })}>{cashEnough ? '支付欠款' : `确认筹款并支付 ${money(debt.amount)}`}</button>
    </div>
  </section>
}
