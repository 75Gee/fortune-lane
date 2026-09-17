import { MAX_PROPERTY_LEVEL, assetActionQuote, getTile, rentForTile, scaleRent, type GameCommand, type GameView } from '@fortune/game'
import { StockPaymentHint } from '../stocks/StockPaymentHint.js'

const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`

export function PropertyDecision({ game, playerId, onCommand }: { game: GameView; playerId: string; onCommand: (command: GameCommand) => void }) {
  const decision = game.pendingDecision!
  const purchase = decision.type === 'purchase'
  const tile = getTile(decision.tileIndex)
  const level = game.tiles[tile.index]!.level
  const action = purchase ? 'BUY_PROPERTY' : 'UPGRADE_PROPERTY'
  const quote = assetActionQuote(game, playerId, tile.index, action)
  const fee = tile.kind === 'utility'
    ? `${money(rentForTile(game, tile.index, 1, playerId))}–${money(rentForTile(game, tile.index, 12, playerId))}`
    : money(tile.kind === 'airport' ? rentForTile(game, tile.index, 0, playerId) : scaleRent(tile.rents?.[purchase ? 0 : level + 1] ?? 0, game.turnNumber))

  return <section className="turn-action property-action" aria-label={`${tile.name}${purchase ? '购买' : '升级'}决策`}>
    <div className="property-decision-head"><div><strong>{tile.name}</strong><span>{purchase ? '购入地产' : `${level} → ${level + 1} 级`}</span></div><strong>{money(quote.amount)}</strong></div>
    <div className="property-decision-body">
      <dl className="decision-figures"><div><dt>{purchase ? '购入后游览费' : '升级后游览费'}</dt><dd>{fee}</dd></div><div><dt>{quote.allowed ? '付款后现金' : '资金还差'}</dt><dd>{money(quote.allowed ? quote.balanceAfter : quote.payment.remaining)}</dd></div></dl>
      <div className="property-commands">
        <button onClick={() => onCommand({ type: purchase ? 'SKIP_PURCHASE' : 'SKIP_UPGRADE' })}>{purchase ? '交给其他人竞拍' : '暂不升级'}</button>
        <button className="primary-command" disabled={!quote.allowed} title={quote.reason ?? undefined} onClick={() => onCommand({ type: action, stockFunding: quote.payment.stockFunding })}>{quote.allowed && quote.payment.stockFunding ? '卖股并' : ''}{purchase ? '购买' : '升级'}</button>
      </div>
    </div>
    <StockPaymentHint payment={quote.payment} />
    {!quote.allowed && <p className="decision-unavailable" role="status">{quote.reason}</p>}
    <div className="property-decision-more">
      {tile.kind === 'property' && <details className="decision-rates"><summary>各等级游览费</summary><div className="landing-rent-track">{tile.rents?.map((rent, tier) => <div key={tier}><span>{tier === 0 ? '空地' : tier === MAX_PROPERTY_LEVEL ? '旅馆' : `${tier} 级`}</span><strong>{money(scaleRent(rent, game.turnNumber))}</strong></div>)}</div></details>}
      <small>{purchase ? '超时交由其他玩家竞拍' : '超时暂不升级'}</small>
    </div>
  </section>
}
