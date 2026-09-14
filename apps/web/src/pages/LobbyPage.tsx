import type { RoomSnapshot } from '@fortune/protocol'
import { Check, Copy, Crown, Link, LogOut, Play, Users } from 'lucide-react'
import { useState } from 'react'
import { Brand } from '../components/Brand.js'
import { TokenImage } from '../components/TokenImage.js'

interface LobbyPageProps {
  room: RoomSnapshot
  playerId: string
  pending?: boolean
  connected?: boolean
  onReady: (ready: boolean) => void
  onStart: () => void
  onLeave: () => void
}

export function LobbyPage({ room, playerId, onReady, onStart, onLeave, pending = false, connected = true }: LobbyPageProps) {
  const [copied, setCopied] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const me = room.players.find((player) => player.id === playerId)
  const canStart = room.players.length >= 2 && room.players.every((player) => player.ready && player.connected)

  const copyCode = async () => {
    setCopyError('')
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(room.roomCode)
      } else {
        const input = document.createElement('textarea')
        input.value = room.roomCode
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.append(input)
        input.select()
        const success = document.execCommand('copy')
        input.remove()
        if (!success) throw new Error('Copy failed')
      }
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError('复制失败，请长按或选中房间码复制')
    }
  }

  const copyInvite = async () => {
    setCopyError('')
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('room', room.roomCode)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url.toString())
      } else {
        const input = document.createElement('textarea')
        input.value = url.toString()
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.append(input)
        input.select()
        const success = document.execCommand('copy')
        input.remove()
        if (!success) throw new Error('Copy failed')
      }
      setInviteCopied(true)
    } catch {
      setInviteCopied(false)
      setCopyError('链接复制失败，可分享上方房间码')
    }
  }

  return (
    <main className="lobby-screen">
      <header className="game-header">
        <Brand />
        <button className="icon-command" disabled={pending || !connected} onClick={onLeave} title="退出房间" aria-label="退出房间">
          <LogOut size={19} />
        </button>
      </header>

      <section className="lobby-table">
        <div className="lobby-heading">
          <span className="eyebrow"><Users size={15} /> 等候室 · {room.players.length}/{room.settings.maxPlayers}</span>
          <h1>等待好友加入</h1>
          <p className="lobby-status">{!connected ? '连接断开，正在重连…' : pending ? '正在提交…' : canStart ? (me?.isHost ? '全员已准备，可以开局了' : '全员已准备，等房主开局') : room.players.length < 2 ? '再来一位好友，就能开局' : `${room.players.filter((player) => player.ready && player.connected).length}/${room.players.length} 人已准备`}</p>
          <div className="room-invite-actions">
            <button className="room-code" onClick={copyCode}>
              <span role="status">{copied ? '已复制' : '房间码'}</span>
              <strong>{room.roomCode}</strong>
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
            <button className="invite-command" onClick={copyInvite}>
              {inviteCopied ? <Check size={17} /> : <Link size={17} />}
              {inviteCopied ? '已复制邀请链接' : '邀请好友'}
            </button>
          </div>
          {copyError && <p className="copy-feedback" role="status">{copyError}</p>}
        </div>

        <div className="seat-grid">
          {Array.from({ length: room.settings.maxPlayers }, (_, index) => {
            const player = room.players[index]
            return player ? (
              <div className={`player-seat ${player.ready ? 'is-ready' : ''}`} key={player.id}>
                <div className="seat-token"><TokenImage token={player.token} /></div>
                <div className="seat-info">
                  <strong>{player.name}{player.id === playerId ? ' · 你' : ''}</strong>
                  <span>{!player.connected ? '暂时离线' : player.ready ? '准备好了' : '尚未准备'}</span>
                </div>
                {player.isHost && <Crown className="host-crown" size={18} aria-label="房主" />}
                <span className={`presence ${player.connected ? 'online' : ''}`} />
              </div>
            ) : (
              <div className="player-seat is-empty" key={`empty-${index}`}>
                <span>{index + 1}</span>
                <p>等待加入</p>
              </div>
            )
          })}
        </div>

        <details className="lobby-rules"><summary>玩法与限时</summary><ol>
          <li>轮到你时掷骰，落地后买地、加盖、付费或抽卡；成为最后未破产的玩家即可获胜。</li>
          <li>不用集齐同色地产；回到自己的地产才能升级。放弃购买后，其他玩家可密封竞拍。</li>
          <li>每次操作限时 {room.settings.turnSeconds} 秒，竞拍限时 45 秒。超时由系统代操作；筹款超时且钱未凑齐会破产。</li>
          <li>每回合可使用一张道具。行动结果可在“动态”回看；暂离后对局继续，可从首页重返。</li>
        </ol></details>
        <div className="lobby-actions">
          {(!me?.isHost || !me.ready) && <button className={`ready-command ${me?.ready ? 'is-ready' : ''}`} disabled={pending || !connected} onClick={() => onReady(!me?.ready)}>
            <Check size={19} />{me?.ready ? '取消准备' : '我准备好了'}
          </button>}
          {me?.isHost && me.ready && <button className="cancel-ready" disabled={pending || !connected} onClick={() => onReady(false)}>取消准备</button>}
          {me?.isHost && me.ready && (
            <button className="primary-command" onClick={onStart} disabled={!canStart || pending || !connected}>
              <Play size={18} fill="currentColor" /> 开始游戏
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
