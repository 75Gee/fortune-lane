import type { GameCommand, GameEvent, GameView, ItemKind } from '@fortune/game'
import type { RoomSnapshot } from '@fortune/protocol'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { DicePresentation } from '../board/DicePresentation.js'
import { GameBoard } from '../board/GameBoard.js'
import { useGamePresentation } from '../board/useGamePresentation.js'
import { ActivityBroadcast } from '../components/ActivityCenter.js'
import { EndgameReport } from '../components/EndgameReport.js'
import { ItemInventory } from '../components/ItemInventory.js'
import { LandingDialog } from '../components/LandingDialog.js'
import { CommandAvailabilityContext, Modal } from '../components/Modal.js'
import { decisionId, needsDecision } from '../components/decisionState.js'
import { ActionPanel } from '../components/game/ActionPanel.js'
import { GameInfoPanel, type InfoTab } from '../components/game/GameInfoPanel.js'
import { SheetFoldContext } from '../components/game/SheetFold.js'
import { TileDetail } from '../components/game/TileDetail.js'
import { StockMarketPanel } from '../components/stocks/StockMarketPanel.js'
import { formatMoney } from '../lib/format.js'
import { usePersistentToggle } from '../lib/usePersistentToggle.js'
import { Button } from '../ui/index.js'
import { GameConfirmations, type GameConfirmation } from './game/GameConfirmations.js'
import styles from './game/GameHud.module.css'
import { GameMenu } from './game/GameMenu.js'
import { PlayerRail } from './game/PlayerRail.js'
import { TurnTicket } from './game/TurnTicket.js'
import { useHudInsets } from './game/useHudInsets.js'
import { useMoneyFeedback } from './game/useMoneyFeedback.js'
import { Wallet } from './game/Wallet.js'

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

/** At most one panel is open at a time; confirmations stack above it. */
type Panel =
  | { type: 'info'; tab: InfoTab; owner: string }
  | { type: 'tile'; index: number }
  | { type: 'items'; item?: ItemKind }
  | { type: 'stocks' }
  | null

export function GamePage({
  room,
  game,
  playerId,
  events,
  connectionStatus,
  commandPending = false,
  onCommand: sendCommand,
  onRestart,
  onLeave,
}: GamePageProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const [confirm, setConfirm] = useState<GameConfirmation | null>(null)
  const [watchedDecision, setWatchedDecision] = useState<string | null>(null)
  const [resultReviewed, setResultReviewed] = useState(false)
  const [soundEnabled, setSoundEnabled] = usePersistentToggle('fortune-sound')
  const shellRef = useRef<HTMLElement>(null),
    topRef = useRef<HTMLElement>(null),
    bottomRef = useRef<HTMLElement>(null)
  const viewInsets = useHudInsets(shellRef, topRef, bottomRef)
  // Phones open each new action folded; dragging the board folds it again.
  const [sheetFolded, setSheetFolded] = useState(true)
  const sheetFold = useMemo(() => ({ folded: sheetFolded, setFolded: setSheetFolded }), [sheetFolded])

  const connected = connectionStatus === 'connected'
  const canSend = connected && !commandPending
  const onCommand = (command: GameCommand) => {
    if (!canSend) return
    // Bankruptcy is irreversible, so every entry point goes through a confirmation first.
    if (command.type === 'DECLARE_BANKRUPTCY') setConfirm('bankruptcy')
    else sendCommand(command)
  }

  const {
    displayPositions,
    displayHazards,
    displayDice,
    activeEvent,
    activeEventStartedAt,
    isPlaying,
    presentedEvents,
    skipToLive,
  } = useGamePresentation(game, events, soundEnabled)
  const money = useMoneyFeedback(presentedEvents, playerId)
  const visualGame = useMemo(() => ({ ...game, hazards: displayHazards }), [game, displayHazards])
  const clockOffset = useMemo(() => room.serverTime - Date.now(), [room.serverTime])
  const me = game.players.find((player) => player.id === playerId)
  const lobbyMe = room.players.find((player) => player.id === playerId)
  const available = !isPlaying && canSend
  const decisionKey = decisionId(game)
  const required = needsDecision(game, playerId)
  const debt = game.pendingDebt?.debtorId === playerId ? game.pendingDebt : null

  useEffect(() => {
    if (game.phase !== 'WAITING_FOR_DEBT') setConfirm((current) => (current === 'bankruptcy' ? null : current))
  }, [game.phase])
  useEffect(() => setWatchedDecision(null), [decisionKey])
  useEffect(() => setSheetFolded(true), [game.phase, game.turnNumber, game.currentPlayerId, decisionKey])
  useEffect(() => {
    if (required && (!isPlaying || game.pendingAuction)) setPanel(null)
  }, [decisionKey, required, isPlaying])
  useEffect(() => {
    // Return to the board when a new turn/debt needs this player's attention.
    // Opening the market again during that same turn remains an explicit choice.
    if (game.currentPlayerId === playerId || game.pendingDebt?.debtorId === playerId)
      setPanel((current) => (current?.type === 'stocks' ? null : current))
  }, [game.currentPlayerId, game.turnNumber, game.pendingDebt?.debtorId, playerId])
  const previousDebt = useRef(debt)
  useEffect(() => {
    // Close the liquidation view once the debt is settled.
    if (previousDebt.current && !debt)
      setPanel((current) =>
        current?.type === 'info' && current.tab === 'assets' && current.owner === playerId ? null : current,
      )
    previousDebt.current = debt
  }, [debt, playerId])

  const closePanel = () => setPanel(null)
  const openInfo = (tab: InfoTab, owner = playerId) => setPanel({ type: 'info', tab, owner })
  const openAssets = () => openInfo('assets')
  const openHistory = () => openInfo('activity')
  const selectTile = (index: number) => setPanel({ type: 'tile', index })

  const lastPresentedRoll = presentedEvents.findLast((event) => event.type === 'DICE_ROLLED')
  const showRollResult = activeEvent?.type === 'TOKEN_MOVED' && lastPresentedRoll?.revision === activeEvent.revision
  const stillPlaying = !me?.isBankrupt && game.phase !== 'FINISHED'

  return (
    <CommandAvailabilityContext.Provider value={available}>
      <main
        className={styles.shell}
        ref={shellRef}
        style={
          {
            '--hud-top': `${viewInsets?.top ?? 70}px`,
            '--hud-bottom': `${viewInsets?.bottom ?? 160}px`,
          } as CSSProperties
        }
      >
        <div className={styles.board}>
          <GameBoard
            active
            game={visualGame}
            playerId={playerId}
            displayPositions={displayPositions}
            selectedTile={panel?.type === 'tile' ? panel.index : null}
            onSelectTile={selectTile}
            activeEvent={activeEvent}
            activeEventStartedAt={activeEventStartedAt}
            viewInsets={viewInsets}
            onCameraModeChange={(mode) => mode === 'free' && setSheetFolded(true)}
          />
        </div>

        <header className={styles.top} ref={topRef}>
          <div className={styles.lead}>
            <TurnTicket game={game} playerId={playerId} turnDeadline={room.turnDeadline} clockOffset={clockOffset} />
          </div>
          <div className={styles.trail}>
            <PlayerRail
              game={game}
              playerId={playerId}
              deltas={money.deltas}
              onOpenPlayer={(owner) => openInfo('assets', owner)}
            />
            <GameMenu
              roomCode={room.roomCode}
              connected={connected}
              soundEnabled={soundEnabled}
              canSurrender={stillPlaying}
              onToggleSound={() => setSoundEnabled((value) => !value)}
              onOpenInfo={(tab) => openInfo(tab)}
              onSurrender={() => setConfirm('surrender')}
              onLeave={() => setConfirm('leave')}
              itemCount={me?.items.length ?? 0}
              onOpenItems={() => setPanel({ type: 'items' })}
              onOpenStocks={game.stockMarket ? () => setPanel({ type: 'stocks' }) : undefined}
            />
          </div>
        </header>

        {money.notice && (
          <button
            key={money.notice.key}
            className={`${styles.notice} ${money.notice.amount > 0 ? styles.noticeGain : styles.noticeLoss}`}
            role="status"
            onClick={money.dismissNotice}
          >
            <span className={styles.noticeStamp}>{money.notice.amount > 0 ? '收入' : '支出'}</span>
            <strong>
              {money.notice.amount > 0 ? '+' : '−'}
              {formatMoney(Math.abs(money.notice.amount))}
            </strong>
            <span className={styles.noticeText}>{money.notice.message}</span>
          </button>
        )}
        {showRollResult && (
          <div className={styles.moveResult} role="status">
            骰点 {lastPresentedRoll?.dice?.join(' + ')}
            <span>正在移动</span>
          </div>
        )}

        <footer className={styles.bottom} ref={bottomRef}>
          <ActivityBroadcast
            className={styles.activity}
            events={presentedEvents}
            playerId={playerId}
            onHistory={openHistory}
          />
          <div className={styles.action}>
            {game.phase === 'FINISHED' ? (
              <Button variant="primary" size="lg" onClick={() => setResultReviewed(false)}>
                查看本局结果
              </Button>
            ) : (
              <SheetFoldContext.Provider value={sheetFold}>
                <ActionPanel
                  game={game}
                  playerId={playerId}
                  onCommand={onCommand}
                  busy={isPlaying || !canSend}
                  onManageAssets={openAssets}
                  onOpenItems={(item) => setPanel(item ? { type: 'items', item } : { type: 'items' })}
                  onWatch={decisionKey && !required ? () => setWatchedDecision(decisionKey) : undefined}
                  onSkipToLive={isPlaying && connected ? skipToLive : undefined}
                  waitingLabel={!connected ? '等待重连…' : commandPending ? '正在提交…' : '行动进行中…'}
                />
              </SheetFoldContext.Provider>
            )}
          </div>
          <Wallet
            game={game}
            playerId={playerId}
            deltas={money.deltas[playerId]}
            onOpenAssets={openAssets}
            onOpenStocks={() => setPanel({ type: 'stocks' })}
            onOpenItems={() => setPanel({ type: 'items' })}
          />
        </footer>

        <LandingDialog
          game={game}
          playerId={playerId}
          decisionsReady={!isPlaying}
          clockOffset={clockOffset}
          soundEnabled={soundEnabled}
          onCommand={onCommand}
          deadline={room.turnDeadline}
          watching={!!decisionKey && watchedDecision === decisionKey && !panel}
          onDismiss={() => setWatchedDecision(null)}
        />
        {panel?.type === 'info' && (
          <GameInfoPanel
            key={`${panel.tab}:${panel.owner}`}
            game={game}
            playerId={playerId}
            roomCode={room.roomCode}
            initialTab={panel.tab}
            initialOwner={panel.owner}
            onCommand={onCommand}
            onClose={closePanel}
          />
        )}
        <DicePresentation
          event={activeEvent}
          playerName={game.players.find((player) => player.id === activeEvent?.playerId)?.name ?? '当前玩家'}
          dice={displayDice}
          startedAt={activeEventStartedAt}
        />

        {panel?.type === 'items' && me && (
          <ItemInventory
            initialItem={panel.item}
            game={game}
            playerId={playerId}
            available={available}
            onCommand={onCommand}
            onClose={closePanel}
          />
        )}
        {panel?.type === 'stocks' && (
          <StockMarketPanel
            game={game}
            playerId={playerId}
            available={canSend}
            onCommand={onCommand}
            onClose={closePanel}
          />
        )}
        {panel?.type === 'tile' && (
          <Modal label="地点详情" onDismiss={closePanel}>
            <button className={styles.tileBackdrop} aria-label="关闭地点详情" onClick={closePanel} />
            <TileDetail
              game={game}
              tileIndex={panel.index}
              playerId={playerId}
              onCommand={onCommand}
              onClose={closePanel}
              floating
            />
          </Modal>
        )}
        {!connected && (
          <div className="connection-banner">
            <span className="waiting-pulse" /> 连接断开，正在重连…
          </div>
        )}
        {confirm && (
          <GameConfirmations
            kind={confirm}
            stillPlaying={stillPlaying}
            surrendered={!!me?.surrendered}
            disabled={!canSend}
            onClose={() => setConfirm(null)}
            onLeave={onLeave}
            onSurrender={() => onCommand({ type: 'SURRENDER' })}
            onDeclareBankruptcy={() => sendCommand({ type: 'DECLARE_BANKRUPTCY' })}
          />
        )}

        {game.phase === 'FINISHED' && !isPlaying && !resultReviewed && (
          <EndgameReport
            game={game}
            playerId={playerId}
            isHost={!!lobbyMe?.isHost}
            available={canSend}
            onClose={() => setResultReviewed(true)}
            onHistory={() => {
              setResultReviewed(true)
              openHistory()
            }}
            onRestart={onRestart}
            onLeave={onLeave}
          />
        )}
      </main>
    </CommandAvailabilityContext.Provider>
  )
}
