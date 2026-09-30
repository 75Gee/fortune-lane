import { rentGrowthStart, rentMultiplier, type GameView } from '@fortune/game'
import { Clock3, Map, Route } from 'lucide-react'
import { useCountdown } from '../../lib/useCountdown.js'
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
  const countdown = useCountdown(
    game.phase === 'FINISHED' ? null : (game.pendingAuction?.deadline ?? turnDeadline),
    clockOffset,
  )
  const urgent = !!countdown && countdown.seconds <= 10
  return (
    <section className={`${styles.panel} ${styles.ticket} ${urgent ? styles.urgentTicket : ''}`} aria-label="当前回合">
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
      {countdown && (
        <span
          className={styles.clock}
          role="timer"
          aria-label={countdown.seconds ? `剩余 ${countdown.seconds} 秒` : '时间已到，等待系统处理'}
        >
          <Clock3 size={14} />
          {countdown.seconds ? `${countdown.seconds}s` : '处理中'}
        </span>
      )}
      {countdown && (
        <span className={styles.timeBar} aria-hidden="true">
          <i style={{ transform: `scaleX(${countdown.fraction})` }} />
        </span>
      )}
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
