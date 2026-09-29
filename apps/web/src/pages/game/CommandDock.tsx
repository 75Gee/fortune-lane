import type { GameView } from '@fortune/game'
import { Backpack, ChevronRight, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { StockEntry } from '../../components/stocks/StockSummary.js'
import { formatMoney } from '../../lib/format.js'

interface CommandDockProps {
  game: GameView
  playerId: string
  onOpenAssets: () => void
  onOpenStocks: () => void
  onOpenItems: () => void
  /** The turn action area (roll, decide, pay, …). */
  children: ReactNode
}

export function CommandDock({ game, playerId, onOpenAssets, onOpenStocks, onOpenItems, children }: CommandDockProps) {
  const me = game.players.find((player) => player.id === playerId)
  const itemCount = me?.items.length ?? 0
  const itemQuotaUsed = game.currentPlayerId === playerId && game.itemUsedThisTurn
  return (
    <footer className="game-command-dock">
      <div className="dock-resources">
        <button className="balance-command" aria-label="我的资产" title="我的资产" onClick={onOpenAssets}>
          <Wallet size={19} />
          <span>
            <small>{me?.isBankrupt ? '观战中' : '我的现金'}</small>
            <strong>{formatMoney(me?.cash ?? 0)}</strong>
          </span>
          <ChevronRight size={16} />
        </button>
        {game.stockMarket && <StockEntry market={game.stockMarket} playerId={playerId} onOpen={onOpenStocks} />}
        <button
          className="inventory-command"
          title={itemQuotaUsed ? '本回合道具额度已用完' : '查看和使用道具'}
          onClick={onOpenItems}
          aria-label={`我的道具，共 ${itemCount} 张`}
        >
          <Backpack size={21} />
          <span>道具 {itemCount}</span>
        </button>
      </div>
      {children}
    </footer>
  )
}
