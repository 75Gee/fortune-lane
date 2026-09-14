import { assetActionQuote, type GameCommand, type GameView } from '@fortune/game'
import { useContext } from 'react'
import { CommandAvailabilityContext } from '../Modal.js'
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`
export function AssetActions({ game, tileIndex, playerId, onCommand }: { game: GameView; tileIndex: number; playerId: string; onCommand: (command: GameCommand) => void }) {
  const available = useContext(CommandAvailabilityContext)
  const asset = game.tiles[tileIndex]
  if (!asset || asset.ownerId !== playerId) return null
  const action = asset.mortgaged ? 'REDEEM_ASSET' : asset.level > 0 ? 'SELL_BUILDING' : 'MORTGAGE_ASSET'
  const quote = assetActionQuote(game, playerId, tileIndex, action)
  return <div className="asset-actions"><button disabled={!available || !quote.allowed} title={quote.reason ?? undefined} onClick={() => onCommand({ type: action, tileIndex })}>{action === 'REDEEM_ASSET' ? '赎回' : action === 'SELL_BUILDING' ? '卖一级建筑' : '抵押'} {quote.amount > 0 ? '−' : '+'}{money(Math.abs(quote.amount))}</button><small>{quote.reason ?? (action === 'MORTGAGE_ASSET' ? '抵押期间不收取游览费' : action === 'SELL_BUILDING' ? `出售后降至 ${asset.level - 1} 级` : `赎回后余额 ${money(quote.balanceAfter)}`)}</small></div>
}
