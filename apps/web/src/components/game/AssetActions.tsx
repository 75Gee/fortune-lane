import { assetActionQuote, type GameCommand, type GameView } from '@fortune/game'
import { useContext } from 'react'
import { CommandAvailabilityContext } from '../Modal.js'
import { StockPaymentHint } from '../stocks/StockPaymentHint.js'
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`
export function AssetActions({ game, tileIndex, playerId, onCommand }: { game: GameView; tileIndex: number; playerId: string; onCommand: (command: GameCommand) => void }) {
  const available = useContext(CommandAvailabilityContext)
  const asset = game.tiles[tileIndex]
  if (!asset || asset.ownerId !== playerId) return null
  const action = asset.mortgaged ? 'REDEEM_ASSET' : asset.level > 0 ? 'SELL_BUILDING' : 'MORTGAGE_ASSET'
  const quote = assetActionQuote(game, playerId, tileIndex, action)
  const hint = quote.reason ?? (action === 'MORTGAGE_ASSET' ? '抵押后暂停收费' : action === 'REDEEM_ASSET' ? `赎回后现金 ${money(quote.balanceAfter)}` : null)
  return <div className="asset-actions"><button disabled={!available || !quote.allowed} title={quote.reason ?? undefined} onClick={() => onCommand(action === 'REDEEM_ASSET' ? { type: action, tileIndex, stockFunding: quote.payment.stockFunding } : { type: action, tileIndex })}><span>{action === 'REDEEM_ASSET' ? quote.payment.stockFunding && quote.allowed ? '卖股并赎回' : '赎回' : action === 'SELL_BUILDING' ? '出售 1 级建筑' : '抵押'}</span><strong>{quote.amount > 0 ? '−' : '+'}{money(Math.abs(quote.amount))}</strong></button>{hint && <small>{hint}</small>}{quote.allowed && <StockPaymentHint payment={quote.payment} />}</div>
}
