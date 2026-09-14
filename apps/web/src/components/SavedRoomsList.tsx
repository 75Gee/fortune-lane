import type { RoomSnapshot } from '@fortune/protocol'
import { ArrowRight, ChevronDown, DoorOpen, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'

interface SavedRoomSummary { roomCode: string; name: string; phase?: RoomSnapshot['phase'] }
interface SavedRoomsListProps {
  rooms: SavedRoomSummary[]
  connected: boolean
  pending: boolean
  status: 'idle' | 'checking' | 'unavailable'
  removedCount: number
  onResume: (code: string) => void
  onRemove: (codes: string[]) => void
  onUndoRemove: () => void
}

const phaseLabels = { lobby: '等待开局', playing: '对局进行中', finished: '已结束' }

export function SavedRoomsList({ rooms, connected, pending, status, removedCount, onResume, onRemove, onUndoRemove }: SavedRoomsListProps) {
  const [expanded, setExpanded] = useState(false)
  const active = rooms.filter((room) => room.phase !== 'finished')
    .sort((a, b) => Number(b.phase === 'playing') - Number(a.phase === 'playing'))
  const finished = rooms.filter((room) => room.phase === 'finished')
  if (!rooms.length && !removedCount) return null
  const row = (room: SavedRoomSummary) => <div className="saved-room-row" key={room.roomCode}>
    <button type="button" className="saved-room-resume" disabled={!connected || pending} onClick={() => onResume(room.roomCode)}>
      <DoorOpen size={19} /><span><strong>房间 {room.roomCode}</strong><small>{room.name} · {room.phase ? phaseLabels[room.phase] : '待确认状态'}</small></span><ArrowRight size={17} />
    </button>
    <button type="button" className="saved-room-remove" disabled={pending} title="移除此设备的重返入口" aria-label={`移除房间 ${room.roomCode} 的重返入口`} onClick={() => onRemove([room.roomCode])}><X size={16} /></button>
  </div>
  return <section className="resume-rooms" aria-label="重返房间">
    {rooms.length > 0 && <><header><strong>重返房间</strong><small>{rooms.length} 个房间</small></header>
      {(!connected || status !== 'idle') && <p className="saved-room-hint" role="status">{!connected ? '连接恢复后可重返' : status === 'checking' ? '正在更新房间状态…' : '暂时无法更新状态，仍可尝试重返'}</p>}
      <div className={`saved-room-list ${expanded ? 'is-expanded' : ''}`}>{(expanded ? active : active.slice(0, 3)).map(row)}</div>
      {active.length > 3 && <button type="button" className="saved-room-more" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}><ChevronDown size={15} />{expanded ? '收起更多房间' : `展开其余 ${active.length - 3} 个房间`}</button>}
      {finished.length > 0 && <details className="saved-room-finished"><summary>已结束的房间 · {finished.length}</summary><div className="saved-room-list is-expanded">{finished.map(row)}</div><button type="button" className="saved-room-more" disabled={pending} onClick={() => onRemove(finished.map((room) => room.roomCode))}>移除已结束的房间</button></details>}
    </>}
    {removedCount > 0 && <div className="saved-room-undo"><span role="status">已移除 {removedCount} 个重返入口</span><button type="button" disabled={pending} onClick={onUndoRemove}><RotateCcw size={14} />撤销移除</button></div>}
  </section>
}
