import {
  MAX_PROPERTY_LEVEL,
  assetActionQuote,
  getTile,
  rentForTile,
  scaleRent,
  type GameCommand,
  type GameView,
} from '@fortune/game'
import { formatMoney } from '../../lib/format.js'
import { tileSetLabel } from '../../lib/tiles.js'
import { useMediaQuery } from '../../lib/useCountdown.js'
import { Button } from '../../ui/index.js'
import { CityImage, cityLatinName } from '../CityImage.js'
import { StockPaymentHint } from '../stocks/StockPaymentHint.js'
import styles from './ActionTicket.module.css'

/** Purchase or upgrade offer, laid out as a boarding pass. */
export function PropertyDecision({
  game,
  playerId,
  onCommand,
  waitingFor,
  onClose,
}: {
  game: GameView
  playerId: string
  onCommand: (command: GameCommand) => void
  /** Spectator view: name of the deciding player; commands are replaced by a waiting note. */
  waitingFor?: string | undefined
  onClose?: (() => void) | undefined
}) {
  const decision = game.pendingDecision!
  const purchase = decision.type === 'purchase'
  const tile = getTile(decision.tileIndex)
  const level = game.tiles[tile.index]!.level
  const action = purchase ? 'BUY_PROPERTY' : 'UPGRADE_PROPERTY'
  const quote = assetActionQuote(game, playerId, tile.index, action)
  const scaled = (rent: number) => scaleRent(rent, game.turnNumber, game.players.length)
  const fee =
    tile.kind === 'utility'
      ? `${formatMoney(rentForTile(game, tile.index, 1, playerId))}–${formatMoney(rentForTile(game, tile.index, 12, playerId))}`
      : formatMoney(
          tile.kind === 'airport'
            ? rentForTile(game, tile.index, 0, playerId)
            : scaled(tile.rents?.[purchase ? 0 : level + 1] ?? 0),
        )
  const activeTier = purchase ? 0 : level + 1
  const latin = cityLatinName(tile.name)
  // Phones fold the rent ladder so the sheet leaves room for the board.
  const compact = useMediaQuery('(max-width: 800px)')

  return (
    <section className={styles.ticket} aria-label={`${tile.name}${purchase ? '购买' : '升级'}决策`}>
      <CityImage city={tile.name} className={styles.image} />
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <CityImage city={tile.name} className={styles.thumb} thumbnail />
          <h2 className={styles.title}>{tile.name}</h2>
          {latin && <span className={styles.latin}>{latin}</span>}
          <span className={styles.chip}>
            {tile.color && <i style={{ background: tile.color }} />}
            {purchase ? tileSetLabel(tile) : `${level} → ${level + 1} 级`}
          </span>
        </div>
        <dl className={styles.figures}>
          <div>
            <dt>{purchase ? '购入后游览费' : '升级后游览费'}</dt>
            <dd>{fee}</dd>
          </div>
          <div>
            <dt>{quote.allowed ? '付款后现金' : '资金还差'}</dt>
            <dd>{formatMoney(quote.allowed ? quote.balanceAfter : quote.payment.remaining)}</dd>
          </div>
        </dl>
        {tile.kind === 'property' && tile.rents && (
          <details className={styles.ladderBox} open={!compact}>
            <summary
              className={styles.label}
              onClick={(event) => {
                if (!compact) event.preventDefault()
              }}
            >
              各等级游览费{tile.buildCost ? ` · 每级建造 ${formatMoney(tile.buildCost)}` : ''}
            </summary>
            <div className={styles.ladder}>
              {tile.rents.map((rent, tier) => (
                <div key={tier} className={tier === activeTier ? styles.tierActive : undefined}>
                  <span>{tier === 0 ? '空地' : tier === MAX_PROPERTY_LEVEL ? '旅馆' : `${tier} 级`}</span>
                  <strong>{scaled(rent).toLocaleString('zh-CN')}</strong>
                </div>
              ))}
            </div>
          </details>
        )}
        <StockPaymentHint payment={quote.payment} />
        {!quote.allowed && (
          <p className={styles.warn} role="status">
            {quote.reason}
          </p>
        )}
      </div>
      <div className={styles.stub}>
        <div className={styles.priceBlock}>
          <span className={styles.label}>{purchase ? '地价' : '升级费用'}</span>
          <div className={styles.price}>{formatMoney(quote.amount)}</div>
        </div>
        {waitingFor ? (
          <div className={styles.commands}>
            <span className={styles.hint}>等待 {waitingFor} 作出决定</span>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                关闭
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.commands}>
            <Button
              variant="primary"
              size="lg"
              disabled={!quote.allowed}
              title={quote.reason ?? undefined}
              onClick={() => onCommand({ type: action, stockFunding: quote.payment.stockFunding })}
            >
              {quote.allowed && quote.payment.stockFunding ? '卖股并' : ''}
              {purchase ? '购买' : '升级'}
              <span className={styles.mobileOnly}> {formatMoney(quote.amount)}</span>
            </Button>
            <Button
              variant="outline"
              className={styles.secondaryCommand}
              onClick={() => onCommand({ type: purchase ? 'SKIP_PURCHASE' : 'SKIP_UPGRADE' })}
            >
              {purchase ? '交给竞拍' : '暂不升级'}
            </Button>
            <span className={styles.hint}>{purchase ? '超时将交由其他玩家竞拍' : '超时暂不升级'}</span>
          </div>
        )}
      </div>
    </section>
  )
}
