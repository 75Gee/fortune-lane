import { ITEMS, getTile, playerNetWorth, rentForTile, stockPortfolioSummary, type GameCommand, type GameView } from '@fortune/game'
import { Building2, ChevronRight, Library, Sparkles, Users, X } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ActivityHistory } from '../ActivityCenter.js'
import { CardLibrary } from '../CardLibrary.js'
import { ItemCatalog } from '../ItemInventory.js'
import { Modal } from '../Modal.js'
import { TokenImage } from '../TokenImage.js'
import { StockHoldings } from '../stocks/StockSummary.js'
import { TileDetail } from './TileDetail.js'
import { LiquidationPlanner } from './LiquidationPlanner.js'
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`

export type InfoTab = 'players' | 'assets' | 'activity' | 'cards'
export function GameInfoPanel({ game, playerId, roomCode, initialTab, initialOwner, onCommand, onClose }: { game: GameView; playerId: string; roomCode: string; initialTab: InfoTab; initialOwner: string; onCommand: (command: GameCommand) => void; onClose: () => void }) {
  const [panelTab, setPanelTab] = useState<InfoTab>(initialTab)
  const [assetOwner, setAssetOwner] = useState(initialOwner)
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const savedScroll = useRef(0)
  const focusBeforeDetail = useRef<HTMLElement | null>(null)
  const openDetail = (index: number) => { focusBeforeDetail.current = document.activeElement as HTMLElement; savedScroll.current = scroll.current?.scrollTop ?? 0; setSelectedTile(index) }
  useLayoutEffect(() => { if (selectedTile === null && scroll.current) { scroll.current.scrollTop = savedScroll.current; focusBeforeDetail.current?.focus({ preventScroll: true }) } }, [selectedTile])
  const planningDebt = assetOwner === playerId && game.pendingDebt?.debtorId === playerId
  const owner = game.players.find(player => player.id === assetOwner)
  const stockValue = stockPortfolioSummary(game.stockMarket, assetOwner).marketValue
  const sortedPlayers = useMemo(() => [...game.players].sort((a, b) => Number(a.isBankrupt) - Number(b.isBankrupt) || playerNetWorth(game, b.id) - playerNetWorth(game, a.id)), [game])
  return <Modal label={`本局信息 · 房间 ${roomCode}`} onDismiss={onClose}><button className="panel-backdrop" aria-label="关闭本局信息" onClick={onClose} />
        <aside className="game-sidebar is-open">
          {selectedTile === null && <div className="sidebar-mobile-head"><strong>{planningDebt && panelTab === 'assets' ? '筹款并支付' : { players: '玩家概况', assets: '资产管理', activity: '对局动态', cards: '牌库与道具' }[panelTab]}</strong><button className="icon-command" aria-label="关闭本局信息" onClick={onClose}><X size={18} /></button></div>}
          <div ref={scroll} hidden={selectedTile !== null} className="info-panel-content"><div className="panel-tabs" role="group" aria-label="对局信息">
            <button className={panelTab === 'players' ? 'active' : ''} aria-pressed={panelTab === 'players'} onClick={() => setPanelTab('players')}><Users size={17} />玩家</button>
            <button className={panelTab === 'assets' ? 'active' : ''} aria-pressed={panelTab === 'assets'} onClick={() => setPanelTab('assets')}><Building2 size={17} />资产</button>
            <button className={panelTab === 'activity' ? 'active' : ''} aria-pressed={panelTab === 'activity'} onClick={() => setPanelTab('activity')}><Sparkles size={17} />动态</button>
            <button className={panelTab === 'cards' ? 'active' : ''} aria-pressed={panelTab === 'cards'} onClick={() => setPanelTab('cards')}><Library size={17} />牌库</button>
          </div>
          <section className="player-rail" hidden={panelTab !== 'players'}>
            <div className="player-list-head"><span>玩家</span><span>总身家 ↓</span></div>
            <div className="player-list">
              {sortedPlayers.map((player, rank) => {
                const owned = game.tiles.filter((tile) => tile.ownerId === player.id).length
                return (
                  <button
                    aria-label={`查看${player.name}的资产，总身家${money(playerNetWorth(game, player.id))}${player.surrendered ? '，已投降' : player.isBankrupt ? '，已破产' : `，现金${money(player.cash)}，${owned}处地产`}`}
                    className={`player-row ${player.id === game.currentPlayerId ? 'is-current' : ''} ${player.id === playerId ? 'is-me' : ''} ${player.isBankrupt ? 'is-bankrupt' : ''}`}
                    key={player.id}
                    onClick={() => {
                      setAssetOwner(player.id)
                      setPanelTab('assets')
                    }}
                  >
                    <span className="rank">{rank + 1}</span>
                    <span className="player-token-small" style={{ borderColor: player.color }}><TokenImage token={player.token} />{player.turtleRollsRemaining > 0 && <span className="turtle-status-badge" title={`乌龟效果：剩余 ${player.turtleRollsRemaining} 次常规掷骰`}><img src={ITEMS.turtle.image} alt="乌龟效果" /><b>{player.turtleRollsRemaining}</b></span>}</span>
                    <span className="player-copy"><strong>{player.name}{player.id === playerId ? ' · 你' : ''}</strong><small>{player.surrendered ? '已投降' : player.isBankrupt ? '已破产' : `${owned} 处地产 · 现金 ${money(player.cash)}`}</small></span>
                    <span className="player-worth"><strong>{money(playerNetWorth(game, player.id))}</strong></span>
                    {!player.connected && <i className="offline-dot" title="已掉线" />}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="asset-portfolio" hidden={panelTab !== 'assets'}>
            {!planningDebt && <label>资产持有人<select value={assetOwner} onChange={(event) => setAssetOwner(event.target.value)}>{game.players.map((player) => <option key={player.id} value={player.id}>{player.name}{player.id === playerId ? ' · 你' : ''}</option>)}</select></label>}
            {planningDebt && <LiquidationPlanner key={`${game.turnNumber}:${game.pendingDebt!.reason}:${game.pendingDebt!.amount}:${game.pendingDebt!.tileIndex}`} game={game} playerId={playerId} onCommand={onCommand} />}
            {!planningDebt && game.pendingDebt?.debtorId === assetOwner && <div className="portfolio-debt"><strong>待付 {money(game.pendingDebt.amount)} · {game.pendingDebt.reason}</strong><p>正在筹款</p></div>}
            <div hidden={planningDebt}>
            <dl className="portfolio-overview"><div><dt>现金</dt><dd>{money(owner?.cash ?? 0)}</dd></div><div><dt>股票市值</dt><dd>{money(stockValue)}</dd></div><div><dt>总身家</dt><dd>{money(playerNetWorth(game, assetOwner))}</dd></div></dl>
            {game.stockMarket && <details className="portfolio-stock-detail"><summary>查看股票持仓</summary><StockHoldings market={game.stockMarket} playerId={assetOwner} /></details>}
            <h3 className="portfolio-list-heading">地产 <span>{game.tiles.filter(tile => tile.ownerId === assetOwner).length} 处</span></h3>
            {game.tiles.filter((tile) => tile.ownerId === assetOwner).length === 0 && <p className="empty-state"><Building2 size={32} />还没有持有的地产</p>}
            {game.tiles.map((state, index) => {
              if (state.ownerId !== assetOwner) return null
              const tile = getTile(index)
              return <div className="portfolio-asset" key={index}><button className="asset-row" aria-label={`查看${tile.name}详情与操作`} onClick={() => openDetail(index)}><i style={{ background: tile.color ?? '#3984b5' }} /><span><strong>{tile.name}</strong><small>{state.mortgaged ? '已抵押 · 暂不收费' : `${tile.kind === 'property' ? `${state.level} 级 · ` : ''}游览费 ${tile.kind === 'utility' ? '按骰点计费' : money(rentForTile(game, index, 0))}`}</small></span><ChevronRight size={17} /></button></div>
            })}
            </div>
          </section>

          {panelTab === 'cards' && <><CardLibrary game={game} /><details className="catalog-disclosure"><summary>道具规则</summary><ItemCatalog /></details></>}

          {panelTab === 'activity' && <ActivityHistory events={game.actionLog} playerId={playerId} />}
          </div>
          {selectedTile !== null && <div className="portfolio-detail"><TileDetail game={game} tileIndex={selectedTile} playerId={playerId} onCommand={onCommand} onBack={() => setSelectedTile(null)} onClose={onClose} /></div>}
        </aside>
  </Modal>
}
