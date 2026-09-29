import { ITEMS, type GameView } from '@fortune/game'
import { TokenImage } from '../../components/TokenImage.js'
import { formatMoney } from '../../lib/format.js'
import styles from './GameHud.module.css'

type Player = GameView['players'][number]

function status(player: Player) {
  if (player.isBankrupt) return '观战'
  const note = !player.connected ? ' · 离线' : player.isInHospital ? ' · 住院' : player.isInJail ? ' · 服刑' : ''
  return `${formatMoney(player.cash)}${note}`
}

export function PlayerRail({
  game,
  playerId,
  onOpenPlayer,
}: {
  game: GameView
  playerId: string
  onOpenPlayer: (playerId: string) => void
}) {
  return (
    <section className={`${styles.panel} ${styles.rail}`} aria-label="旅行者">
      {game.players.map((player) => {
        const name = `${player.name}${player.id === playerId ? ' · 你' : ''}`
        const classes = [
          styles.traveller,
          player.id === game.currentPlayerId && styles.isCurrent,
          player.isBankrupt && styles.isOut,
        ]
        return (
          <button
            key={player.id}
            className={classes.filter(Boolean).join(' ')}
            title={`${name} · ${status(player)}`}
            aria-label={`查看${player.name}的资产，${status(player)}`}
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
              <span>{status(player)}</span>
            </span>
          </button>
        )
      })}
    </section>
  )
}
