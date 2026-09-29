import { rentGrowthStart, rentMultiplier, type GameView } from '@fortune/game'
import { Map, Route } from 'lucide-react'
import { TurnClock } from '../../board/GameBoard.js'
import { actionDescription } from '../../components/decisionState.js'
import styles from './GameHud.module.css'

export type BoardView = 'board' | 'route'

interface TurnTicketProps {
  game: GameView
  playerId: string
  turnDeadline: number | null
  clockOffset: number
}

function ticketCopy(game: GameView, playerId: string) {
  if (game.phase === 'FINISHED') return { sub: '旅程已完成', head: '本局结束' }
  if (game.pendingAuction) return { sub: '密封竞拍', head: actionDescription(game) }
  const current = game.players.find((player) => player.id === game.currentPlayerId)
  const sub = current?.id === playerId ? `轮到你 · ${current.name}` : `${current?.name ?? '当前玩家'} 的回合`
  return { sub, head: actionDescription(game) }
}

export function TurnTicket({ game, playerId, turnDeadline, clockOffset }: TurnTicketProps) {
  const { sub, head } = ticketCopy(game, playerId)
  const rentGrowing = game.turnNumber >= rentGrowthStart(game.players.length)
  return (
    <section className={`${styles.panel} ${styles.ticket}`} aria-label="当前回合">
      <div className={styles.round}>
        <small>ROUND</small>
        <strong>{game.turnNumber}</strong>
      </div>
      <div className={styles.ticketBody}>
        <span className={styles.ticketSub}>{sub}</span>
        <strong className={styles.ticketHead}>{head}</strong>
        {rentGrowing && (
          <span className={styles.ticketNote}>
            游览费 ×{rentMultiplier(game.turnNumber, game.players.length).toFixed(2)}
          </span>
        )}
      </div>
      <TurnClock
        className={styles.clock}
        deadline={game.pendingAuction?.deadline ?? turnDeadline}
        offset={clockOffset}
      />
    </section>
  )
}

export function BoardViewSwitch({ view, onChange }: { view: BoardView; onChange: (view: BoardView) => void }) {
  return (
    <div className={`${styles.panel} ${styles.viewSwitch}`} role="group" aria-label="棋盘视图">
      <button aria-pressed={view === 'board'} onClick={() => onChange('board')}>
        <Map size={16} />
        实景
      </button>
      <button aria-pressed={view === 'route'} onClick={() => onChange('route')}>
        <Route size={16} />
        路线
      </button>
    </div>
  )
}
