import { ITEMS, stockPortfolioSummary, type GameView } from '@fortune/game'
import { stockPercent } from '../../components/stocks/format.js'
import { formatMoney } from '../../lib/format.js'
import styles from './GameHud.module.css'

interface WalletProps {
  game: GameView
  playerId: string
  onOpenAssets: () => void
  onOpenStocks: () => void
  onOpenItems: () => void
}

export function Wallet({ game, playerId, onOpenAssets, onOpenStocks, onOpenItems }: WalletProps) {
  const me = game.players.find((player) => player.id === playerId)
  const items = me?.items ?? []
  const quotaUsed = game.currentPlayerId === playerId && game.itemUsedThisTurn
  const stocks = game.stockMarket ? stockPortfolioSummary(game.stockMarket, playerId) : null
  const tone = !stocks?.returnRate ? '' : stocks.returnRate > 0 ? styles.up : styles.down
  return (
    <nav className={`${styles.panel} ${styles.wallet}`} aria-label="我的资源" data-stocks={stocks ? 'true' : 'false'}>
      <button className={styles.walletCash} aria-label="我的资产" onClick={onOpenAssets}>
        <small>{me?.isBankrupt ? '观战中' : '我的现金'}</small>
        <strong>{formatMoney(me?.cash ?? 0)}</strong>
        <span className={styles.walletMore}>资产详情 ›</span>
      </button>
      {stocks && (
        <button
          className={styles.walletStock}
          aria-label={`打开股市，持仓市值 ${formatMoney(stocks.marketValue)}，持仓涨跌 ${stockPercent(stocks.returnRate)}`}
          onClick={onOpenStocks}
        >
          <small>股票市值</small>
          <span className={styles.walletFigure}>
            <strong>{formatMoney(stocks.marketValue)}</strong>
            {stocks.returnRate !== null && <span className={tone}>{stockPercent(stocks.returnRate)}</span>}
          </span>
        </button>
      )}
      <button
        className={styles.walletItems}
        title={quotaUsed ? '本回合道具额度已用完' : '查看和使用道具'}
        aria-label={`我的道具，共 ${items.length} 张`}
        onClick={onOpenItems}
      >
        <span>
          <small>道具</small>
          <strong>{items.length}</strong>
        </span>
        {items.length > 0 && (
          <span className={styles.thumbs} aria-hidden="true">
            {items.slice(0, 3).map((id, index) => (
              <img key={`${id}-${index}`} src={ITEMS[id].image} alt="" />
            ))}
          </span>
        )}
      </button>
    </nav>
  )
}
