import { WHEEL_LABELS, wheelProperties, type GameCommand, type GameView, type PendingWheel } from '@fortune/game'
import { RotateCw } from 'lucide-react'
import { useContext } from 'react'
import { FlatWheel } from './FlatWheel.js'
import { DecisionSlip, LevelChoices, SlipNote } from './DecisionSlip.js'
import { CommandAvailabilityContext } from './Modal.js'
import styles from './LandingDialog.module.css'

export function WheelDialog({
  game,
  wheel,
  playerId,
  onCommand,
  clockOffset,
  soundEnabled,
  deadline = null,
  onClose,
}: {
  game: GameView
  wheel: PendingWheel
  playerId: string
  onCommand: (command: GameCommand) => void
  clockOffset: number
  soundEnabled: boolean
  deadline?: number | null
  onClose?: (() => void) | undefined
}) {
  const mine = wheel.playerId === playerId
  const available = useContext(CommandAvailabilityContext)
  const current = game.players.find((player) => player.id === wheel.playerId)
  const candidates = wheelProperties(game, wheel.playerId, wheel.outcome)
  const choosing = wheel.stage === 'choosing'
  const delta = wheel.outcome === 'gain_house' ? 1 : -1
  return (
    <DecisionSlip
      label="幸运转盘"
      icon={<RotateCw size={20} />}
      kicker={`${current?.name ?? '当前玩家'} · ${wheel.deck === 'chance' ? '机会' : '命运'}`}
      title="幸运转盘"
      deadline={wheel.stage === 'spinning' ? null : deadline}
      clockOffset={clockOffset}
      onClose={onClose}
    >
      {choosing ? (
        <details className={styles.previous}>
          <summary>查看转盘结果</summary>
          <FlatWheel wheel={wheel} clockOffset={clockOffset} soundEnabled={soundEnabled} disabled />
        </details>
      ) : (
        <div className={styles.wheel}>
          <FlatWheel
            wheel={wheel}
            clockOffset={clockOffset}
            soundEnabled={soundEnabled}
            disabled={!available || !mine}
            onSpin={
              mine
                ? () => {
                    if (available) onCommand({ type: 'SPIN_WHEEL', wheelId: wheel.id })
                  }
                : undefined
            }
          />
        </div>
      )}
      <div aria-live="polite">
        <SlipNote tone="strong">
          {wheel.stage === 'ready'
            ? mine
              ? '点一下，转出你的好运'
              : `等待 ${current?.name} 开始`
            : wheel.stage === 'spinning'
              ? '好运转动中…'
              : wheel.outcome
                ? WHEEL_LABELS[wheel.outcome]
                : ''}
        </SlipNote>
        {choosing && (
          <SlipNote>
            {mine
              ? wheel.outcome === 'gain_house'
                ? '选一块地产，免费升一级'
                : '选一块地产降一级，不返还建造费'
              : `等待 ${current?.name} 选择地产`}
          </SlipNote>
        )}
      </div>
      {choosing && (
        <LevelChoices
          game={game}
          tiles={candidates}
          delta={delta}
          disabled={!available || !mine}
          onChoose={(tileIndex) => onCommand({ type: 'CHOOSE_WHEEL_PROPERTY', wheelId: wheel.id, tileIndex })}
        />
      )}
      {wheel.stage !== 'spinning' && (
        <SlipNote>{wheel.stage === 'ready' ? '超时自动开始' : '超时自动选择地产'}</SlipNote>
      )}
    </DecisionSlip>
  )
}
