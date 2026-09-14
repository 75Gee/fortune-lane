import { TOKEN_IDS, type TokenId } from '@fortune/game'
import type { RoomSnapshot } from '@fortune/protocol'
import { ArrowRight, DoorOpen, Plus, Users } from 'lucide-react'
import { lazy, Suspense, useState, type FormEvent } from 'react'
import { Brand } from '../components/Brand.js'
import { SavedRoomsList } from '../components/SavedRoomsList.js'
import { TokenImage } from '../components/TokenImage.js'
import { TOKEN_META } from '../components/tokenMeta.js'

const DebugPanel = lazy(() => import('../components/DebugPanel.js'))

interface HomePageProps {
  connected: boolean
  pending?: boolean
  savedRooms?: Array<{ roomCode: string; name: string; phase?: RoomSnapshot['phase'] }>
  savedRoomsStatus: 'idle' | 'checking' | 'unavailable'
  removedRoomCount: number
  onResume: (roomCode: string) => void
  onRemoveSavedRooms: (codes: string[]) => void
  onUndoRemoveSavedRooms: () => void
  onCreate: (name: string, token: TokenId) => Promise<unknown>
  onJoin: (roomCode: string, name: string, token: TokenId) => Promise<unknown>
}

function inviteRoomCode(): string {
  if (typeof window === 'undefined') return ''
  const value = new URLSearchParams(window.location.search).get('room') ?? ''
  return value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6)
}

export function HomePage({ connected, onCreate, onJoin, pending = false, savedRooms = [], savedRoomsStatus, removedRoomCount, onResume, onRemoveSavedRooms, onUndoRemoveSavedRooms }: HomePageProps) {
  const initialRoomCode = inviteRoomCode()
  const [mode, setMode] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create')
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState(initialRoomCode)
  const [token, setToken] = useState<TokenId>('suitcase')
  const [submitting, setSubmitting] = useState(false)
  const [showEntry, setShowEntry] = useState(() => !!initialRoomCode || savedRooms.length === 0)
  const [debugOpen, setDebugOpen] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || submitting || pending || !connected) return
    setSubmitting(true)
    try {
      if (mode === 'create') await onCreate(trimmed, token)
      else {
        await onJoin(roomCode.trim().toUpperCase(), trimmed, token)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="entry-screen">
      <header className="entry-header">
        <Brand />
        <div className={`connection-pill ${connected ? 'is-online' : ''}`}>
          <span />{connected ? '已连接' : '正在连接…'}
        </div>
      </header>

      <section className="entry-workspace">
        <div className="entry-scene">
          <div className="scene-board">
            <img src="/assets/world-tour.svg" alt="" />
          </div>
          <div className="scene-caption">
            <h1>大富翁世界之旅</h1>
            <p>和好友一起买地、收租，争夺最后的胜利。</p>
          </div>
        </div>

        <form className="entry-form" onSubmit={submit}>
          <SavedRoomsList rooms={savedRooms} connected={connected} pending={pending || submitting} status={savedRoomsStatus} removedCount={removedRoomCount} onResume={onResume} onRemove={onRemoveSavedRooms} onUndoRemove={onUndoRemoveSavedRooms} />
          {pending && !submitting && <p className="copy-feedback" role="status">正在连接房间…</p>}
          {savedRooms.length > 0 && <button className="entry-alternative" type="button" aria-expanded={showEntry} onClick={() => setShowEntry(value => !value)}>{showEntry ? '收起房间操作' : '创建或加入其他房间'}</button>}
          <div className="entry-fields" hidden={savedRooms.length > 0 && !showEntry}><div className="entry-title">
            <span className="eyebrow"><Users size={15} /> 2–6 位玩家</span>
            <h2>{mode === 'create' ? '创建房间' : '加入好友房间'}</h2>
          </div>

          <div className="segmented" role="group" aria-label="房间操作">
            <button type="button" aria-pressed={mode === 'create'} className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>
              <Plus size={17} /> 创建房间
            </button>
            <button type="button" aria-pressed={mode === 'join'} className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>
              <DoorOpen size={17} /> 加入房间
            </button>
          </div>

          <label className="field">
            <span>昵称（最多12个字符）</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={12}
              placeholder="怎么称呼你？"
              autoComplete="nickname"
            />
          </label>

          {mode === 'join' && (
            <label className="field">
              <span>六位房间码</span>
              <input
                className="room-code-input"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6))}
                placeholder="例如 A7K9Q2"
                autoCapitalize="characters"
              />
            </label>
          )}

          <fieldset className="token-picker">
            <legend>选择棋子</legend>
            <div>
              {TOKEN_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={token === id ? 'selected' : ''}
                  onClick={() => setToken(id)}
                  title={`${TOKEN_META[id].city} · ${TOKEN_META[id].name}`}
                  aria-label={`${TOKEN_META[id].city} · ${TOKEN_META[id].name}`}
                  aria-pressed={token === id}
                >
                  <TokenImage token={id} />
                  <span>{TOKEN_META[id].name}</span>
                  <small>{TOKEN_META[id].city}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <button
            className="primary-command"
            type="submit"
            disabled={!connected || pending || !name.trim() || submitting || (mode === 'join' && roomCode.length !== 6)}
          >
            {!connected ? '正在连接…' : submitting ? (mode === 'create' ? '正在创建…' : '正在加入…') : mode === 'create' ? '创建房间' : '加入房间'}
            <ArrowRight size={18} />
          </button>
          </div>
        </form>
      </section>
      {import.meta.env.DEV && <footer className="entry-debug"><button type="button" onClick={() => setDebugOpen(true)}>调试面板</button></footer>}
      {import.meta.env.DEV && debugOpen && <Suspense fallback={<p role="status">正在打开调试面板…</p>}><DebugPanel onClose={() => setDebugOpen(false)} /></Suspense>}
    </main>
  )
}
