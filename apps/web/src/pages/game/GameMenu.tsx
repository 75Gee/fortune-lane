import { Building2, Flag, Library, LogOut, Menu, Sparkles, Users, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { InfoTab } from '../../components/game/GameInfoPanel.js'
import styles from './GameHud.module.css'

const INFO_TABS: { tab: InfoTab; label: string; Icon: typeof Users }[] = [
  { tab: 'players', label: '玩家', Icon: Users },
  { tab: 'assets', label: '资产', Icon: Building2 },
  { tab: 'activity', label: '动态', Icon: Sparkles },
  { tab: 'cards', label: '牌库', Icon: Library },
]

interface GameMenuProps {
  roomCode: string
  connected: boolean
  soundEnabled: boolean
  canSurrender: boolean
  onToggleSound: () => void
  onOpenInfo: (tab: InfoTab) => void
  onSurrender: () => void
  onLeave: () => void
}

export function GameMenu({
  roomCode,
  connected,
  soundEnabled,
  canSurrender,
  onToggleSound,
  onOpenInfo,
  onSurrender,
  onLeave,
}: GameMenuProps) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  const closeThen = (action: () => void) => () => {
    setOpen(false)
    action()
  }
  return (
    <div className={styles.menu}>
      <button
        ref={trigger}
        className={`${styles.panel} ${styles.menuButton}`}
        onClick={() => setOpen((value) => !value)}
        title="对局菜单"
        aria-label="对局菜单"
        aria-expanded={open}
      >
        <Menu size={20} />
      </button>
      {open && (
        <>
          <button className={styles.menuBackdrop} aria-label="关闭菜单" onClick={() => setOpen(false)} />
          <div className={`${styles.panel} ${styles.menuList}`} role="group" aria-label="对局菜单">
            <div className={styles.menuMeta}>
              房间 <strong>{roomCode}</strong>
              <span
                className={`${styles.presence} ${connected ? styles.online : ''}`}
                title={connected ? '已连接' : '连接中断'}
              />
            </div>
            {INFO_TABS.map(({ tab, label, Icon }) => (
              <button key={tab} onClick={closeThen(() => onOpenInfo(tab))}>
                <Icon size={18} />
                {label}
              </button>
            ))}
            <hr />
            <button onClick={onToggleSound}>
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              {soundEnabled ? '关闭音效' : '开启音效'}
            </button>
            {canSurrender && (
              <button className={styles.menuDanger} onClick={closeThen(onSurrender)}>
                <Flag size={18} />
                投降并观战
              </button>
            )}
            <button onClick={closeThen(onLeave)}>
              <LogOut size={18} />
              暂离房间
            </button>
          </div>
        </>
      )}
    </div>
  )
}
