import { type GameEvent, type GameView } from '@fortune/game'
import { Clock3 } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'

const BoardScene = lazy(() => import('./BoardScene.js'))

interface GameBoardProps {
  game: GameView
  playerId: string
  displayPositions: Record<string, number>
  selectedTile: number | null
  onSelectTile: (index: number) => void
  activeEvent: GameEvent | null
  activeEventStartedAt: number
  active: boolean
}

export function TurnClock({ deadline, offset }: { deadline: number | null; offset: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(timer) }, [])
  const seconds = deadline ? Math.max(0, Math.ceil((deadline - now - offset) / 1000)) : null
  return seconds === null ? null : <span className={`turn-clock ${seconds <= 15 ? 'is-urgent' : ''}`} aria-label={seconds ? `剩余 ${seconds} 秒` : '时间已到，等待系统处理'}><Clock3 size={14} />{seconds ? `${seconds}s` : '系统处理中'}</span>
}

export function GameBoard({ game, displayPositions, selectedTile, onSelectTile, activeEvent, activeEventStartedAt, active }: GameBoardProps) {
  const movingPlayerId = activeEvent && ['DICE_ROLLED', 'TOKEN_MOVED', 'PLAYER_SENT_TO_JAIL', 'PLAYER_SENT_TO_HOSPITAL', 'ITEM_USED', 'HAZARD_TRIGGERED'].includes(activeEvent.type) ? activeEvent.playerId : null
  const fastTravel = activeEvent?.type === 'PLAYER_SENT_TO_JAIL' || activeEvent?.type === 'PLAYER_SENT_TO_HOSPITAL' || (activeEvent?.type === 'TOKEN_MOVED' && (activeEvent.path?.length ?? 0) > 12)
  return <div className="tabletop-board">
    <Suspense fallback={<div className="board-scene scene-fallback">旅途准备中…</div>}><BoardScene game={game} active={active} displayPositions={displayPositions} selectedTile={selectedTile} activeEvent={activeEvent} eventStartedAt={activeEventStartedAt} focusPlayerId={movingPlayerId ?? game.currentPlayerId} teleportPlayerId={fastTravel ? activeEvent?.playerId ?? null : null} onSelectTile={onSelectTile} /></Suspense>

  </div>
}
