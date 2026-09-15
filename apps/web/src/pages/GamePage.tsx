import { ITEMS, RENT_GROWTH_START, isDetained, rentMultiplier, type GameCommand, type GameEvent, type GameView } from '@fortune/game'
import type { RoomSnapshot } from '@fortune/protocol'
import { Backpack, Building2, ChevronRight, Flag, HandCoins, Library, LogOut, Map, MoreHorizontal, Route, Sparkles, Users, Volume2, VolumeX, Wallet } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DicePresentation } from '../board/DicePresentation.js'
import { GameBoard, TurnClock } from '../board/GameBoard.js'
import { useGamePresentation } from '../board/useGamePresentation.js'
import { ActivityBroadcast } from '../components/ActivityCenter.js'
import { Brand } from '../components/Brand.js'
import { EndgameReport } from '../components/EndgameReport.js'
import { ItemInventory } from '../components/ItemInventory.js'
import { LandingDialog } from '../components/LandingDialog.js'
import { CommandAvailabilityContext, Modal } from '../components/Modal.js'
import { TokenImage } from '../components/TokenImage.js'
import { StockEntry } from '../components/stocks/StockSummary.js'
import { StockMarketPanel } from '../components/stocks/StockMarketPanel.js'

interface GamePageProps {
  room: RoomSnapshot
  game: GameView
  playerId: string
  events: GameEvent[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  commandPending?: boolean
  onCommand: (command: GameCommand) => void
  onRestart: () => void
  onLeave: () => void
}

import { decisionId, needsDecision } from '../components/decisionState.js'
import { ActionPanel } from '../components/game/ActionPanel.js'
import { GameInfoPanel, type InfoTab } from '../components/game/GameInfoPanel.js'
import { RouteView } from '../components/game/RouteView.js'
import { TileDetail } from '../components/game/TileDetail.js'
type Panel = { type: 'info'; tab: InfoTab; owner: string } | { type: 'tile'; index: number } | { type: 'items' } | { type: 'stocks' } | null
function readPreference(key: string): boolean { try { return localStorage.getItem(key) !== 'false' } catch { return true } }
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`
export function GamePage({ room, game, playerId, events, connectionStatus, commandPending = false, onCommand: sendCommand, onRestart, onLeave }: GamePageProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const [watchedDecision, setWatchedDecision] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(() => readPreference('fortune-sound'))
  useEffect(() => { try { localStorage.setItem('fortune-sound', String(soundEnabled)) } catch {} }, [soundEnabled])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [boardView, setBoardView] = useState<'board' | 'route'>('board')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [surrenderOpen, setSurrenderOpen] = useState(false)
  const [surrenderRequested, setSurrenderRequested] = useState(false)
  const [resultReviewed, setResultReviewed] = useState(false)
  const [bankruptcyOpen, setBankruptcyOpen] = useState(false)
  const onCommand = (command: GameCommand) => {
    if (commandPending || connectionStatus !== 'connected') return
    if (command.type === 'DECLARE_BANKRUPTCY') setBankruptcyOpen(true)
    else sendCommand(command)
  }
  useEffect(() => { if (game.phase !== 'WAITING_FOR_DEBT') setBankruptcyOpen(false) }, [game.phase])
  const { displayPositions, displayHazards, displayDice, activeEvent, activeEventStartedAt, isPlaying, presentedEvents, skipToLive } = useGamePresentation(game, events, soundEnabled)
  const visualGame = useMemo(() => ({ ...game, hazards: displayHazards }), [game, displayHazards])
  const clockOffset = useMemo(() => room.serverTime - Date.now(), [room.serverTime])
  const me = game.players.find((player) => player.id === playerId)
  const lobbyMe = room.players.find((player) => player.id === playerId)
  const current = game.players.find((player) => player.id === game.currentPlayerId)
  useEffect(() => {
    if (surrenderRequested && me?.surrendered) { setSurrenderOpen(false); setSurrenderRequested(false) }
  }, [surrenderRequested, me?.surrendered])
  useEffect(() => {
    if (!surrenderRequested) return
    const timer = window.setTimeout(() => setSurrenderRequested(false), 3000)
    return () => clearTimeout(timer)
  }, [surrenderRequested])
  const decisionKey = decisionId(game)
  useEffect(() => setWatchedDecision(null), [decisionKey])
  const required = needsDecision(game, playerId)
  useEffect(() => { if (required && (!isPlaying || game.pendingAuction)) setPanel(null) }, [decisionKey, required, isPlaying])
  useEffect(() => {
    // Return to the board when a new turn/debt needs this player's attention.
    // Opening the market again during that same turn remains an explicit choice.
    if (game.currentPlayerId === playerId || game.pendingDebt?.debtorId === playerId) setPanel(current => current?.type === 'stocks' ? null : current)
  }, [game.currentPlayerId, game.turnNumber, game.pendingDebt?.debtorId, playerId])
  const openInfo = (tab: InfoTab, owner = playerId) => setPanel({ type: 'info', tab, owner })
  const openAssets = () => openInfo('assets')
  const openHistory = () => openInfo('activity')
  const available = !isPlaying && !commandPending && connectionStatus === 'connected'
  const lastPresentedRoll = presentedEvents.findLast(event => event.type === 'DICE_ROLLED')
  const showRollResult = activeEvent?.type === 'TOKEN_MOVED' && lastPresentedRoll?.revision === activeEvent.revision
  const debt = game.pendingDebt?.debtorId === playerId ? game.pendingDebt : null
  const previousDebt = useRef(debt)
  useEffect(() => {
    if (previousDebt.current && !debt) setPanel(current => current?.type === 'info' && current.tab === 'assets' && current.owner === playerId ? null : current)
    previousDebt.current = debt
  }, [debt, playerId])

  return (
    <CommandAvailabilityContext.Provider value={available}>
    <main className={`game-screen ${game.phase === 'WAITING_FOR_DEBT' || game.pendingDecision || (me && isDetained(me)) ? 'has-expanded-action' : ''}`}>
      <header className="game-header">
        <Brand />
        <div className="game-room-meta">
          <span>房间</span><strong>{room.roomCode}</strong>
          <i className={connectionStatus === 'connected' ? 'online' : ''} />
        </div>
        <div className="header-commands">
          <nav className="game-info-nav" aria-label="对局信息">
            <button title="玩家" aria-label="玩家" onClick={() => openInfo('players')}><Users size={18} /><span>玩家</span></button>
            <button title="资产" aria-label="资产" onClick={openAssets}><Building2 size={18} /><span>资产</span></button>
            <button title="动态" aria-label="动态" onClick={openHistory}><Sparkles size={18} /><span>动态</span></button>
            <button title="牌库" aria-label="牌库" onClick={() => openInfo('cards')}><Library size={18} /><span>牌库</span></button>
          </nav>
          <button className="icon-command" onClick={() => setSettingsOpen(value => !value)} title="对局设置" aria-label="对局设置" aria-expanded={settingsOpen}><MoreHorizontal size={20} /></button>
          {settingsOpen && <><button className="settings-backdrop" aria-label="关闭设置" onClick={() => setSettingsOpen(false)} /><div className="game-settings" role="group" aria-label="对局设置">
            <small>房间 {room.roomCode}</small>
            <button onClick={() => setSoundEnabled(value => !value)}>{soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}{soundEnabled ? '关闭音效' : '开启音效'}</button>
            {!me?.isBankrupt && game.phase !== 'FINISHED' && <button onClick={() => { setSettingsOpen(false); setSurrenderOpen(true) }}><Flag size={18} />投降并观战</button>}
            <button onClick={() => { setSettingsOpen(false); setLeaveOpen(true) }}><LogOut size={18} />暂离房间</button>
          </div></>}
        </div>
      </header>

      <div className="game-layout">
        <section className="board-region">
          <div className="board-toolbar">
            <div className="turn-summary"><div><strong>第 {game.turnNumber} 回合</strong><TurnClock deadline={room.turnDeadline} offset={clockOffset} /></div>{game.turnNumber > RENT_GROWTH_START && <span>游览费 ×{rentMultiplier(game.turnNumber).toFixed(2)}</span>}</div>
            <div className="game-player-strip" aria-label="玩家现金与当前回合">
              {game.players.map(player => <button key={player.id} className={`${player.id === game.currentPlayerId ? 'is-current' : ''} ${player.isBankrupt ? 'is-bankrupt' : ''}`} title={`${player.name} · ${player.isBankrupt ? '观战中' : money(player.cash)}`} aria-label={`查看${player.name}的资产`} onClick={() => openInfo('assets', player.id)}>
                <span className="player-token-small" style={{ borderColor: player.color }}><TokenImage token={player.token} />{player.turtleRollsRemaining > 0 && <span className="turtle-status-badge" title={`乌龟效果：剩余 ${player.turtleRollsRemaining} 次常规掷骰`}><img src={ITEMS.turtle.image} alt="乌龟效果" /><b>{player.turtleRollsRemaining}</b></span>}</span>
                <span><strong>{player.name}{player.id === playerId ? ' · 你' : ''}</strong><small>{player.isBankrupt ? '观战' : `${money(player.cash)}${!player.connected ? ' · 离线' : player.isInHospital ? ' · 住院' : player.isInJail ? ' · 服刑' : ''}`}</small></span>
              </button>)}
            </div>
            <div className="segmented board-view-switch" role="group" aria-label="棋盘视图">
              <button className={boardView === 'board' ? 'active' : ''} aria-pressed={boardView === 'board'} onClick={() => setBoardView('board')}><Map size={16} />实景</button>
              <button className={boardView === 'route' ? 'active' : ''} aria-pressed={boardView === 'route'} onClick={() => setBoardView('route')}><Route size={16} />路线</button>
            </div>
          </div>
          <div className={`board-viewport ${boardView === 'route' ? 'show-route' : ''}`}>
          <GameBoard
            active={boardView === 'board'}
            game={visualGame}
            playerId={playerId}
            displayPositions={displayPositions}
            selectedTile={panel?.type === 'tile' ? panel.index : null}
            onSelectTile={index => setPanel({ type: 'tile', index })}
            activeEvent={activeEvent}
            activeEventStartedAt={activeEventStartedAt}
          />
          </div>
          {boardView === 'route' && <RouteView game={game} displayPositions={displayPositions} displayHazards={displayHazards} activeEvent={activeEvent} onSelectTile={index => setPanel({ type: 'tile', index })} />}
          {showRollResult && <div className="movement-dice-result" role="status">骰点 {lastPresentedRoll?.dice?.join(' + ')}<span>正在移动</span></div>}
          <ActivityBroadcast events={presentedEvents} playerId={playerId} onHistory={openHistory} />
          <LandingDialog game={game} playerId={playerId} decisionsReady={!isPlaying} clockOffset={clockOffset} soundEnabled={soundEnabled} onCommand={onCommand} deadline={room.turnDeadline} watching={!!decisionKey && watchedDecision === decisionKey && !panel} onDismiss={() => setWatchedDecision(null)} />
        </section>

        {panel?.type === 'info' && <GameInfoPanel game={game} playerId={playerId} roomCode={room.roomCode} initialTab={panel.tab} initialOwner={panel.owner} onCommand={onCommand} onClose={() => setPanel(null)} />}

      </div>

      <DicePresentation event={activeEvent} playerName={game.players.find((player) => player.id === activeEvent?.playerId)?.name ?? '当前玩家'} dice={displayDice} startedAt={activeEventStartedAt} />
      <footer className="game-command-dock">
        <div className="dock-resources"><button className="balance-command" aria-label="我的资产" title="我的资产" onClick={openAssets}><Wallet size={19} /><span><small>{me?.isBankrupt ? '观战中' : '我的现金'}</small><strong>{money(me?.cash ?? 0)}</strong></span><ChevronRight size={16} /></button>{game.stockMarket && <StockEntry market={game.stockMarket} playerId={playerId} onOpen={() => setPanel({ type: 'stocks' })} />}<button className="inventory-command" title={game.currentPlayerId === playerId && game.itemUsedThisTurn ? '本回合道具额度已用完' : '查看和使用道具'} onClick={() => setPanel({ type: 'items' })} aria-label={`我的道具，共 ${me?.items.length ?? 0} 张`}><Backpack size={21} /><span>道具 {me?.items.length ?? 0}</span></button></div>
        {game.phase === 'FINISHED' ? <button className="primary-command" onClick={() => setResultReviewed(false)}>查看本局结果</button> : <ActionPanel game={game} playerId={playerId} onCommand={onCommand} busy={isPlaying || commandPending || connectionStatus !== 'connected'} onManageAssets={openAssets} onWatch={decisionKey && !required ? () => setWatchedDecision(decisionKey) : undefined} onSkipToLive={isPlaying && connectionStatus === 'connected' ? skipToLive : undefined} waitingLabel={connectionStatus !== 'connected' ? '等待重连…' : commandPending ? '正在提交…' : '行动进行中…'} />}
      </footer>

      {panel?.type === 'items' && me && <ItemInventory game={game} playerId={playerId} available={available} onCommand={onCommand} onClose={() => setPanel(null)} />}
      {panel?.type === 'stocks' && <StockMarketPanel game={game} playerId={playerId} available={!commandPending && connectionStatus === 'connected'} onCommand={onCommand} onClose={() => setPanel(null)} />}
      {panel?.type === 'tile' && <Modal label="地点详情" onDismiss={() => setPanel(null)}><button className="detail-backdrop" aria-label="关闭地点详情" onClick={() => setPanel(null)} /><TileDetail game={game} tileIndex={panel.index} playerId={playerId} onCommand={onCommand} onClose={() => setPanel(null)} /></Modal>}
              {connectionStatus !== 'connected' && (
        <div className="connection-banner"><span className="waiting-pulse" /> 连接断开，正在重连…</div>
      )}
      {leaveOpen && <Modal label="暂离房间" onDismiss={() => setLeaveOpen(false)}><div className="result-overlay"><section className="result-panel"><LogOut size={28} /><h2>暂离房间？</h2><p>{me?.isBankrupt || game.phase === 'FINISHED' ? '返回首页后，仍可重返这个房间。' : '对局会继续，超时由系统代操作。返回首页后可重返房间；投降才会结束参赛。'}</p><div><button autoFocus onClick={() => setLeaveOpen(false)}>留在房间</button><button className="primary-command" disabled={commandPending || connectionStatus !== 'connected'} onClick={onLeave}>暂离房间</button></div></section></div></Modal>}
      {bankruptcyOpen && <Modal label="确认破产" onDismiss={() => setBankruptcyOpen(false)}><div className="result-overlay"><section className="result-panel"><HandCoins size={28} /><h2>放弃筹款，宣告破产？</h2><p>股票变现后的现金用于清算，地产归还银行。本局无法继续参赛，但可以留下观战。</p><div><button autoFocus onClick={() => setBankruptcyOpen(false)}>继续筹款</button><button className="danger" disabled={commandPending || connectionStatus !== 'connected'} onClick={() => { setBankruptcyOpen(false); sendCommand({ type: 'DECLARE_BANKRUPTCY' }) }}>确认破产</button></div></section></div></Modal>}
      {surrenderOpen && <Modal label="确认投降" onDismiss={() => { if (!surrenderRequested) setSurrenderOpen(false) }}><div className="result-overlay"><section className="result-panel"><Flag size={28} /><h2>确认投降？</h2><p>地产归还银行，本局无法重新参战。你将留在房间继续观战。</p><div><button disabled={surrenderRequested || commandPending || connectionStatus !== 'connected'} onClick={() => setSurrenderOpen(false)}>继续游玩</button><button className="danger" disabled={surrenderRequested || commandPending || connectionStatus !== 'connected'} onClick={() => { setSurrenderRequested(true); onCommand({ type: 'SURRENDER' }) }}>{surrenderRequested ? '正在投降…' : '投降并观战'}</button></div></section></div></Modal>}

      {game.phase === 'FINISHED' && !isPlaying && !resultReviewed && (
        <EndgameReport game={game} playerId={playerId} isHost={!!lobbyMe?.isHost} available={!commandPending && connectionStatus === 'connected'} onClose={() => setResultReviewed(true)} onHistory={() => { setResultReviewed(true); openHistory() }} onRestart={onRestart} onLeave={onLeave} />
      )}
    </main>
    </CommandAvailabilityContext.Provider>
  )
}
