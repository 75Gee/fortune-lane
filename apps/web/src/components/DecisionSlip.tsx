import { scaleRent, type GameView, type TileDefinition } from '@fortune/game'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { TurnClock } from '../board/GameBoard.js'
import { formatMoney } from '../lib/format.js'
import { IconButton } from '../ui/index.js'
import styles from './DecisionSlip.module.css'
import { Modal } from './Modal.js'

interface DecisionSlipProps {
  label: string
  icon: ReactNode
  kicker: string
  title: string
  deadline?: number | null | undefined
  clockOffset?: number
  /** Present when the viewer is only watching and may close the slip. */
  onClose?: (() => void) | undefined
  wide?: boolean
  children: ReactNode
}

/** Shared frame for mid-turn decisions: card draws, wheel spins, level changes, watched purchases. */
export function DecisionSlip({
  label,
  icon,
  kicker,
  title,
  deadline = null,
  clockOffset = 0,
  onClose,
  wide,
  children,
}: DecisionSlipProps) {
  return (
    <Modal label={label} onDismiss={onClose}>
      <div className={styles.overlay}>
        <section className={`${styles.slip} ${wide ? styles.wide : ''}`} aria-label={label}>
          <header className={styles.header}>
            <span className={styles.icon}>{icon}</span>
            <div>
              <small>{kicker}</small>
              <h2>{title}</h2>
            </div>
            <TurnClock className={styles.clock} deadline={deadline} offset={clockOffset} />
            {onClose && <IconButton variant="ghost" label="关闭查看" icon={<X size={18} />} onClick={onClose} />}
          </header>
          <div className={styles.body}>{children}</div>
        </section>
      </div>
    </Modal>
  )
}

export function SlipNote({ children, tone }: { children: ReactNode; tone?: 'muted' | 'strong' }) {
  return <p className={tone === 'strong' ? styles.strong : styles.note}>{children}</p>
}

/** A list of the player's cities that will move one level up or down. */
export function LevelChoices({
  game,
  tiles,
  delta,
  disabled,
  onChoose,
}: {
  game: GameView
  tiles: readonly TileDefinition[]
  delta: 1 | -1
  disabled: boolean
  onChoose: (tileIndex: number) => void
}) {
  return (
    <div className={styles.choices}>
      {tiles.map((tile) => {
        const level = game.tiles[tile.index]!.level
        const next = level + delta
        return (
          <button key={tile.index} disabled={disabled} onClick={() => onChoose(tile.index)}>
            <strong>
              {tile.color && <i style={{ background: tile.color }} />}
              {tile.name}
            </strong>
            <span className={styles.levels}>
              {level} → {next} 级
            </span>
            <small>
              {delta > 0 ? '升级' : '降级'}后游览费{' '}
              {formatMoney(scaleRent(tile.rents?.[next] ?? 0, game.turnNumber, game.players.length))}
            </small>
          </button>
        )
      })}
    </div>
  )
}
