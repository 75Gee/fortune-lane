import {
  ITEMS,
  MAX_PROPERTY_LEVEL,
  getTile,
  playerNetWorth,
  rentForTile,
  stockPortfolioSummary,
  type GameCommand,
  type GameView,
} from '@fortune/game'
import { Building2, ChevronRight, Library, Sparkles, Users, X } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ActivityHistory } from '../ActivityCenter.js'
import { CardLibrary } from '../CardLibrary.js'
import { CityImage, cityImageSource } from '../CityImage.js'
import { ItemCatalog } from '../ItemInventory.js'
import { Modal } from '../Modal.js'
import { TokenImage } from '../TokenImage.js'
import { StockHoldings } from '../stocks/StockSummary.js'
import { TileDetail } from './TileDetail.js'
import { LiquidationPlanner } from './LiquidationPlanner.js'
import { formatMoney } from '../../lib/format.js'
import { IconButton } from '../../ui/index.js'
import styles from './GameInfoPanel.module.css'

export type InfoTab = 'players' | 'assets' | 'activity' | 'cards'
export function GameInfoPanel({
  game,
  playerId,
  roomCode,
  initialTab,
  initialOwner,
  onCommand,
  onClose,
}: {
  game: GameView
  playerId: string
  roomCode: string
  initialTab: InfoTab
  initialOwner: string
  onCommand: (command: GameCommand) => void
  onClose: () => void
}) {
  const [panelTab, setPanelTab] = useState<InfoTab>(initialTab)
  const [assetOwner, setAssetOwner] = useState(initialOwner)
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const savedScroll = useRef(0)
  const focusBeforeDetail = useRef<HTMLElement | null>(null)
  const openDetail = (index: number) => {
    focusBeforeDetail.current = document.activeElement as HTMLElement
    savedScroll.current = scroll.current?.scrollTop ?? 0
    setSelectedTile(index)
  }
  useLayoutEffect(() => {
    if (selectedTile === null && scroll.current) {
      scroll.current.scrollTop = savedScroll.current
      focusBeforeDetail.current?.focus({ preventScroll: true })
    }
  }, [selectedTile])
  const planningDebt = assetOwner === playerId && game.pendingDebt?.debtorId === playerId
  const owner = game.players.find((player) => player.id === assetOwner)
  const stockValue = stockPortfolioSummary(game.stockMarket, assetOwner).marketValue
  const sortedPlayers = useMemo(
    () =>
      [...game.players].sort(
        (a, b) =>
          Number(a.isBankrupt) - Number(b.isBankrupt) || playerNetWorth(game, b.id) - playerNetWorth(game, a.id),
      ),
    [game],
  )
  const titles = { players: '玩家', assets: '资产', activity: '对局动态', cards: '牌库与道具' }
  const tabs: { tab: InfoTab; label: string; Icon: typeof Users }[] = [
    { tab: 'players', label: '玩家', Icon: Users },
    { tab: 'assets', label: '资产', Icon: Building2 },
    { tab: 'activity', label: '动态', Icon: Sparkles },
    { tab: 'cards', label: '牌库', Icon: Library },
  ]
  const ownedTiles = game.tiles.flatMap((state, index) => (state.ownerId === assetOwner ? [{ state, index }] : []))
  return (
    <Modal label={`本局信息 · 房间 ${roomCode}`} onDismiss={onClose}>
      <button className={styles.backdrop} aria-label="关闭本局信息" onClick={onClose} />
      <aside className={styles.drawer}>
        {selectedTile === null && (
          <header className={styles.header}>
            <div>
              <h2>{planningDebt && panelTab === 'assets' ? '筹款并支付' : titles[panelTab]}</h2>
              <span>房间 {roomCode}</span>
            </div>
            <IconButton label="关闭本局信息" icon={<X size={18} />} onClick={onClose} />
          </header>
        )}
        <div ref={scroll} hidden={selectedTile !== null} className={styles.scroll}>
          <div className={styles.tabs} role="group" aria-label="对局信息">
            {tabs.map(({ tab, label, Icon }) => (
              <button key={tab} aria-pressed={panelTab === tab} onClick={() => setPanelTab(tab)}>
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>

          <section className={styles.section} hidden={panelTab !== 'players'}>
            <div className={styles.ledgerHead}>
              <span>玩家</span>
              <span>总资产 ↓</span>
            </div>
            <ol className={styles.ledger}>
              {sortedPlayers.map((player, rank) => {
                const owned = game.tiles.filter((tile) => tile.ownerId === player.id).length
                const classes = [
                  styles.traveller,
                  player.id === game.currentPlayerId && styles.current,
                  player.id === playerId && styles.me,
                  player.isBankrupt && styles.out,
                ]
                return (
                  <li key={player.id}>
                    <button
                      aria-label={`查看${player.name}的资产，总资产${formatMoney(playerNetWorth(game, player.id))}${player.surrendered ? '，已投降' : player.isBankrupt ? '，已破产' : `，现金${formatMoney(player.cash)}，${owned}处地产`}`}
                      className={classes.filter(Boolean).join(' ')}
                      onClick={() => {
                        setAssetOwner(player.id)
                        setPanelTab('assets')
                      }}
                    >
                      <span className={styles.rank}>{String(rank + 1).padStart(2, '0')}</span>
                      <span className={styles.token} style={{ borderColor: player.color }}>
                        <TokenImage token={player.token} alt="" />
                        {player.turtleRollsRemaining > 0 && (
                          <img
                            className={styles.badge}
                            src={ITEMS.turtle.image}
                            alt={`乌龟效果剩余 ${player.turtleRollsRemaining} 次`}
                          />
                        )}
                      </span>
                      <span className={styles.copy}>
                        <strong>
                          {player.name}
                          {player.id === playerId ? ' · 你' : ''}
                          {!player.connected && <i className={styles.offline} title="已掉线" />}
                        </strong>
                        <small>
                          {player.surrendered
                            ? '已投降'
                            : player.isBankrupt
                              ? '已破产'
                              : `${owned} 处地产 · 现金 ${formatMoney(player.cash)}`}
                        </small>
                      </span>
                      {player.id === game.currentPlayerId && !player.isBankrupt && (
                        <span className={styles.stamp}>行动中</span>
                      )}
                      <strong className={styles.worth}>{formatMoney(playerNetWorth(game, player.id))}</strong>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>

          <section className={styles.section} hidden={panelTab !== 'assets'}>
            {!planningDebt && (
              <div className={styles.owners} role="group" aria-label="资产持有人">
                {game.players.map((player) => (
                  <button
                    key={player.id}
                    aria-pressed={player.id === assetOwner}
                    title={player.name}
                    onClick={() => setAssetOwner(player.id)}
                  >
                    <span className={styles.token} style={{ borderColor: player.color }}>
                      <TokenImage token={player.token} alt="" />
                    </span>
                    {player.name}
                    {player.id === playerId ? ' · 你' : ''}
                  </button>
                ))}
              </div>
            )}
            {planningDebt && (
              <LiquidationPlanner
                key={`${game.turnNumber}:${game.pendingDebt!.reason}:${game.pendingDebt!.amount}:${game.pendingDebt!.tileIndex}`}
                game={game}
                playerId={playerId}
                onCommand={onCommand}
              />
            )}
            {!planningDebt && game.pendingDebt?.debtorId === assetOwner && (
              <p className={styles.debt}>
                <strong>待付 {formatMoney(game.pendingDebt.amount)}</strong> · {game.pendingDebt.reason} · 正在筹款
              </p>
            )}
            <div hidden={planningDebt}>
              <dl className={styles.figures}>
                <div>
                  <dt>现金</dt>
                  <dd>{formatMoney(owner?.cash ?? 0)}</dd>
                </div>
                <div>
                  <dt>股票市值</dt>
                  <dd>{formatMoney(stockValue)}</dd>
                </div>
                <div>
                  <dt>总资产</dt>
                  <dd>{formatMoney(playerNetWorth(game, assetOwner))}</dd>
                </div>
              </dl>
              {game.stockMarket && (
                <details className={styles.stocks}>
                  <summary>查看股票持仓</summary>
                  <StockHoldings market={game.stockMarket} playerId={assetOwner} />
                </details>
              )}
              <h3 className={styles.listHeading}>
                地产 <span>{ownedTiles.length} 处</span>
              </h3>
              {ownedTiles.length === 0 && (
                <p className={styles.empty}>
                  <Building2 size={28} />
                  还没有持有的地产
                </p>
              )}
              <ul className={styles.assets}>
                {ownedTiles.map(({ state, index }) => {
                  const tile = getTile(index)
                  return (
                    <li key={index}>
                      <button
                        className={`${styles.asset} ${state.mortgaged ? styles.mortgaged : ''}`}
                        aria-label={`查看${tile.name}详情与操作`}
                        onClick={() => openDetail(index)}
                      >
                        {cityImageSource(tile.name) ? (
                          <CityImage city={tile.name} thumbnail loading="lazy" className={styles.assetImage} />
                        ) : (
                          <span className={styles.assetImage} />
                        )}
                        <span className={styles.assetCopy}>
                          <strong>
                            <i style={{ background: tile.color ?? 'var(--info)' }} />
                            {tile.name}
                          </strong>
                          <small>
                            {state.mortgaged
                              ? '已抵押 · 暂不收费'
                              : `游览费 ${tile.kind === 'utility' ? '按骰点计费' : formatMoney(rentForTile(game, index, 0))}`}
                          </small>
                        </span>
                        {tile.kind === 'property' && (
                          <span className={styles.pips} aria-label={`${state.level} 级`}>
                            {Array.from({ length: MAX_PROPERTY_LEVEL }, (_, pip) => (
                              <i key={pip} className={pip < state.level ? styles.pipOn : undefined} />
                            ))}
                          </span>
                        )}
                        {state.mortgaged && <span className={styles.mortgageStamp}>已抵押</span>}
                        <ChevronRight size={17} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>

          {panelTab === 'cards' && (
            <div className={styles.section}>
              <CardLibrary game={game} />
              <details className="catalog-disclosure">
                <summary>道具规则</summary>
                <ItemCatalog />
              </details>
            </div>
          )}

          {panelTab === 'activity' && (
            <div className={styles.section}>
              <ActivityHistory events={game.actionLog} playerId={playerId} />
            </div>
          )}
        </div>
        {selectedTile !== null && (
          <div className={styles.detail}>
            <TileDetail
              game={game}
              tileIndex={selectedTile}
              playerId={playerId}
              onCommand={onCommand}
              onBack={() => setSelectedTile(null)}
              onClose={onClose}
            />
          </div>
        )}
      </aside>
    </Modal>
  )
}
