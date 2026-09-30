import { ITEMS, type GameView } from '@fortune/game'
import { TokenImage } from '../../components/TokenImage.js'
import { formatMoney } from '../../lib/format.js'
import styles from './GameHud.module.css'
import type { FloatingDelta } from './useMoneyFeedback.js'

type Player = GameView['players'][number]

function note(player: Player) {
  return !player.connected ? '离线' : player.isInHospital ? '住院' : player.isInJail ? '服刑' : null
}

export function DeltaFloat({ deltas }: { deltas: readonly FloatingDelta[] | undefined }) {
  if (!deltas?.length) return null
  return (
    <span className={styles.deltas} aria-hidden="true">
      {deltas.map((delta) => (
        <b key={delta.key} className={delta.amount > 0 ? styles.gain : styles.loss}>
          {delta.amount > 0 ? '+' : '−'}
          {formatMoney(Math.abs(delta.amount))}
        </b>
      ))}
    </span>
  )
}

export function PlayerRail({
  game,
  playerId,
  deltas,
  onOpenPlayer,
}: {
  game: GameView
  playerId: string
  deltas: Record<string, FloatingDelta[]>
  onOpenPlayer: (playerId: string) => void
}) {
  return (
    <section className={`${styles.panel} ${styles.rail}`} aria-label="旅行者">
      {game.players.map((player) => {
        const name = `${player.name}${player.id === playerId ? ' · 你' : ''}`
        const status = player.isBankrupt ? '观战' : note(player)
        const classes = [
          styles.traveller,
          player.id === game.currentPlayerId && styles.isCurrent,
          player.isBankrupt && styles.isOut,
          (deltas[player.id]?.length ?? 0) > 0 && styles.flash,
        ]
        const summary = player.isBankrupt ? '观战中' : `现金 ${formatMoney(player.cash)}`
        return (
          <button
            key={player.id}
            className={classes.filter(Boolean).join(' ')}
            title={`${name} · ${summary}`}
            aria-label={`查看${player.name}的资产，${summary}${status && !player.isBankrupt ? `，${status}` : ''}`}
            aria-current={player.id === game.currentPlayerId ? 'step' : undefined}
            onClick={() => onOpenPlayer(player.id)}
          >
            <span className={styles.token} style={{ borderColor: player.color }}>
              <TokenImage token={player.token} alt="" />
              {player.turtleRollsRemaining > 0 && (
                <span className={styles.tokenBadge} title={`乌龟效果：剩余 ${player.turtleRollsRemaining} 次常规掷骰`}>
                  <img src={ITEMS.turtle.image} alt="" />
                  <b>{player.turtleRollsRemaining}</b>
                </span>
              )}
            </span>
            <span className={styles.travellerText}>
              <strong>{name}</strong>
              <span>
                {player.isBankrupt ? '观战' : formatMoney(player.cash)}
                {status && !player.isBankrupt && <em>{status}</em>}
              </span>
            </span>
            <DeltaFloat deltas={deltas[player.id]} />
          </button>
        )
      })}
    </section>
  )
}
