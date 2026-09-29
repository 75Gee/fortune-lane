import { Building2, Flag, Library, LogOut, MoreHorizontal, Sparkles, Users, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'
import { Brand } from '../../components/Brand.js'
import type { InfoTab } from '../../components/game/GameInfoPanel.js'

const INFO_TABS: { tab: InfoTab; label: string; Icon: typeof Users }[] = [
  { tab: 'players', label: '玩家', Icon: Users },
  { tab: 'assets', label: '资产', Icon: Building2 },
  { tab: 'activity', label: '动态', Icon: Sparkles },
  { tab: 'cards', label: '牌库', Icon: Library },
]

interface GameHeaderProps {
  roomCode: string
  connected: boolean
  soundEnabled: boolean
  canSurrender: boolean
  onToggleSound: () => void
  onOpenInfo: (tab: InfoTab) => void
  onSurrender: () => void
  onLeave: () => void
}

export function GameHeader({
  roomCode,
  connected,
  soundEnabled,
  canSurrender,
  onToggleSound,
  onOpenInfo,
  onSurrender,
  onLeave,
}: GameHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const closeThen = (action: () => void) => () => {
    setSettingsOpen(false)
    action()
  }
  return (
    <header className="game-header">
      <Brand />
      <div className="game-room-meta">
        <span>房间</span>
        <strong>{roomCode}</strong>
        <i className={connected ? 'online' : ''} />
      </div>
      <div className="header-commands">
        <nav className="game-info-nav" aria-label="对局信息">
          {INFO_TABS.map(({ tab, label, Icon }) => (
            <button key={tab} title={label} aria-label={label} onClick={() => onOpenInfo(tab)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button
          className="icon-command"
          onClick={() => setSettingsOpen((value) => !value)}
          title="对局设置"
          aria-label="对局设置"
          aria-expanded={settingsOpen}
        >
          <MoreHorizontal size={20} />
        </button>
        {settingsOpen && (
          <>
            <button className="settings-backdrop" aria-label="关闭设置" onClick={() => setSettingsOpen(false)} />
            <div className="game-settings" role="group" aria-label="对局设置">
              <small>房间 {roomCode}</small>
              <button onClick={onToggleSound}>
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                {soundEnabled ? '关闭音效' : '开启音效'}
              </button>
              {canSurrender && (
                <button onClick={closeThen(onSurrender)}>
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
    </header>
  )
}
