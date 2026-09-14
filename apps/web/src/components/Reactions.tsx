import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Smile, X } from 'lucide-react'
import { REACTIONS, type ReactionId, type RoomReaction, type RoomSnapshot } from '@fortune/protocol'
import { TokenImage } from './TokenImage.js'

export function Reactions({ room, reactions, onSend, connected }: { room: RoomSnapshot; reactions: RoomReaction[]; onSend: (reaction: ReactionId) => void; connected: boolean }) {
  const [target, setTarget] = useState<Element>(document.body)
  const [open, setOpen] = useState(false), [cooldown, setCooldown] = useState(false)
  const [visible, setVisible] = useState<RoomReaction[]>([])
  const received = useRef(new Map<string, number>())
  useEffect(() => {
    const update = () => setTarget([...document.querySelectorAll('dialog[open]')].at(-1) ?? document.body)
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] }); update()
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const incoming = reactions.filter(reaction => reaction.roomCode === room.roomCode)
    const now = Date.now()
    received.current = new Map(incoming.map(reaction => [reaction.id, received.current.get(reaction.id) ?? now]))
    let timer = 0
    const expire = () => {
      const live = incoming.filter(reaction => Date.now() - received.current.get(reaction.id)! < 3600)
      setVisible(live)
      if (live.length) timer = window.setTimeout(expire, Math.max(1, Math.min(...live.map(reaction => received.current.get(reaction.id)! + 3600 - Date.now()))))
    }
    expire()
    return () => clearTimeout(timer)
  }, [reactions, room.roomCode])
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown(false), 3000)
    return () => clearTimeout(timer)
  }, [cooldown])
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  return createPortal(<div className={`reaction-ui ${target !== document.body ? 'in-dialog' : ''}`}>
    <div className="reaction-feed" aria-live="polite">{visible.map(reaction => {
      const player = room.players.find(player => player.id === reaction.playerId)
      return player && <div className="reaction-bubble" key={reaction.id}><TokenImage token={player.token} /><span><small>{player.name}</small><strong>{REACTIONS[reaction.reaction][0]} {REACTIONS[reaction.reaction][1]}</strong></span></div>
    })}</div>
    {open && <div className="reaction-picker" role="group" aria-label="选择表情">{Object.entries(REACTIONS).map(([id, [emoji, label]]) => <button key={id} disabled={cooldown || !connected} onClick={() => { onSend(id as ReactionId); setCooldown(true); setOpen(false) }}><span>{emoji}</span>{label}</button>)}</div>}
    <button className="reaction-trigger" aria-label={open ? '收起表情' : '发表情'} aria-expanded={open} title={cooldown ? '稍等一下再发' : '发表情'} onClick={() => setOpen(value => !value)}>{open ? <X size={20} /> : <Smile size={20} />}</button>
  </div>, target)
}
