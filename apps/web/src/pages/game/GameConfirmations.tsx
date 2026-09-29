import { Flag, HandCoins, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../../ui/index.js'

export type GameConfirmation = 'leave' | 'surrender' | 'bankruptcy'

interface GameConfirmationsProps {
  kind: GameConfirmation
  /** Whether the player still takes part, i.e. leaving keeps the game running on their behalf. */
  stillPlaying: boolean
  /** True once the server reports this player as surrendered. */
  surrendered: boolean
  disabled: boolean
  onClose: () => void
  onLeave: () => void
  onSurrender: () => void
  onDeclareBankruptcy: () => void
}

export function GameConfirmations({
  kind,
  stillPlaying,
  surrendered,
  disabled,
  onClose,
  onLeave,
  onSurrender,
  onDeclareBankruptcy,
}: GameConfirmationsProps) {
  if (kind === 'leave')
    return (
      <ConfirmDialog
        icon={<LogOut size={28} />}
        title="暂离房间？"
        description={
          stillPlaying
            ? '对局会继续，超时由系统代操作。返回首页后可重返房间；投降才会结束参赛。'
            : '返回首页后，仍可重返这个房间。'
        }
        cancelLabel="留在房间"
        confirmLabel="暂离房间"
        confirmDisabled={disabled}
        onCancel={onClose}
        onConfirm={onLeave}
      />
    )
  if (kind === 'bankruptcy')
    return (
      <ConfirmDialog
        tone="danger"
        icon={<HandCoins size={28} />}
        title="放弃筹款，宣告破产？"
        description="股票变现后的现金用于清算，地产归还银行。本局无法继续参赛，但可以留下观战。"
        cancelLabel="继续筹款"
        confirmLabel="确认破产"
        confirmDisabled={disabled}
        onCancel={onClose}
        onConfirm={() => {
          onClose()
          onDeclareBankruptcy()
        }}
      />
    )
  return <SurrenderDialog surrendered={surrendered} disabled={disabled} onClose={onClose} onSurrender={onSurrender} />
}

function SurrenderDialog({
  surrendered,
  disabled,
  onClose,
  onSurrender,
}: Pick<GameConfirmationsProps, 'surrendered' | 'disabled' | 'onClose' | 'onSurrender'>) {
  const [requested, setRequested] = useState(false)
  useEffect(() => {
    if (requested && surrendered) onClose()
  }, [requested, surrendered])
  useEffect(() => {
    // Unlock again if the server never confirms, so the player isn't stuck.
    if (!requested) return
    const timer = window.setTimeout(() => setRequested(false), 3000)
    return () => clearTimeout(timer)
  }, [requested])
  return (
    <ConfirmDialog
      tone="danger"
      icon={<Flag size={28} />}
      title="确认投降？"
      description="地产归还银行，本局无法重新参战。你将留在房间继续观战。"
      cancelLabel="继续游玩"
      confirmLabel={requested ? '正在投降…' : '投降并观战'}
      confirmDisabled={disabled}
      locked={requested}
      onCancel={onClose}
      onConfirm={() => {
        setRequested(true)
        onSurrender()
      }}
    />
  )
}
