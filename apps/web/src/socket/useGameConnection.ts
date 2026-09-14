import { type GameCommand, type GameEvent, type TokenId } from '@fortune/game'
import type { Ack, GameCommandEnvelope, ReactionId, RoomReaction, SavedRoomStatus, ServerState, SessionInfo } from '@fortune/protocol'
import { canRetryRequest, failure, SAVED_ROOM_CHECK_BATCH_SIZE } from '@fortune/protocol'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { appendEvents, PresentationBuffer } from './presentationBuffer.js'
import { sendRequest, type GameSocket, type RequestSender } from './requests.js'
import { read, readSavedRooms, requestId, SAVED_KEY, STORAGE_KEY, write, type StoredSession } from './sessionStorage.js'

export function useGameConnection() {
  const socketRef = useRef<GameSocket | null>(null)
  const sessionRef = useRef<StoredSession | null>(read(STORAGE_KEY, null))
  const [savedRooms, setSavedRooms] = useState(readSavedRooms)
  const savedRef = useRef(savedRooms)
  const [removedRooms, setRemovedRooms] = useState<StoredSession[]>([])
  const [savedRoomsStatus, setSavedRoomsStatus] = useState<'idle' | 'checking' | 'unavailable'>('idle')
  const [session, setSession] = useState(sessionRef.current)
  const [serverState, setServerState] = useState<ServerState | null>(null)
  const [presentationVersion, setPresentationVersion] = useState(0)
  const lastSnapshot = useRef<ServerState | null>(null)
  const [events, setEvents] = useState<GameEvent[]>([])
  const [reactions, setReactions] = useState<RoomReaction[]>([])
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [requestPending, setRequestPending] = useState(false)
  const [retryAvailable, setRetryAvailable] = useState(false)
  const busy = useRef(false)
  const pendingCommand = useRef<GameCommandEnvelope | null>(null)
  const entry = useRef<{ signature: string; id: string } | null>(null)
  const restoring = useRef(false)

  const saveRooms = useCallback((rooms: StoredSession[]) => { savedRef.current = rooms; setSavedRooms(rooms); write(SAVED_KEY, rooms) }, [])
  useEffect(() => { write(SAVED_KEY, savedRef.current) }, [])
  const forgetSavedRooms = useCallback((codes: string[]) => {
    if (busy.current) return
    const removed = savedRef.current.filter((room) => codes.includes(room.roomCode) && room.roomCode !== sessionRef.current?.roomCode)
    if (!removed.length) return
    setRemovedRooms((current) => [...current.filter((room) => !removed.some((entry) => entry.roomCode === room.roomCode)), ...removed])
    saveRooms(savedRef.current.filter((room) => !removed.includes(room)))
  }, [saveRooms])
  const undoForgetSavedRooms = useCallback(() => {
    if (busy.current) return
    saveRooms([...savedRef.current, ...removedRooms.filter((room) => !savedRef.current.some((entry) => entry.roomCode === room.roomCode))])
    setRemovedRooms([])
  }, [removedRooms, saveRooms])
  const persistSession = useCallback((next: StoredSession | null) => {
    sessionRef.current = next; setSession(next); write(STORAGE_KEY, next)
    if (next) saveRooms([next, ...savedRef.current.filter((room) => room.roomCode !== next.roomCode)])
  }, [saveRooms])

  const request = useCallback(async <T,>(send: RequestSender<T>): Promise<Ack<T>> => {
    if (busy.current) return failure('BUSY', '上一项操作正在确认')
    busy.current = true
    setRequestPending(true)
    setError(null)
    try {
      const response = await sendRequest(socketRef.current, send)
      if (!response.ok) setError(response.error)
      return response
    } finally {
      busy.current = false
      setRequestPending(false)
    }
  }, [])

  const enter = useCallback(async (name: string, token: TokenId, roomCode?: string, reconnectToken?: string) => {
    const signature = JSON.stringify([name, token, roomCode, reconnectToken])
    if (entry.current?.signature !== signature) entry.current = { signature, id: requestId() }
    const id = entry.current.id
    const response = await request<SessionInfo>((socket, done) => {
      if (roomCode) socket.emit('room:join', { name, token, roomCode, reconnectToken, requestId: id }, done)
      else socket.emit('room:create', { name, token, requestId: id }, done)
    })
    if (response.ok) {
      entry.current = null; persistSession({ ...response.data, name, token })
    } else if (!canRetryRequest(response)) {
      entry.current = null
      if (reconnectToken && roomCode && (response.code === 'ROOM_NOT_FOUND' || response.code === 'SESSION_EXPIRED')) {
        saveRooms(savedRef.current.filter((room) => room.roomCode !== roomCode))
        if (sessionRef.current?.roomCode === roomCode) { persistSession(null); setServerState(null) }
      }
    }
    return response
  }, [persistSession, request, saveRooms])

  useEffect(() => {
    const socket: GameSocket = io({ autoConnect: true })
    socketRef.current = socket
    let needsRestore = true
    const buffer = new PresentationBuffer()
    const restore = async () => {
      const stored = sessionRef.current
      if (!stored || !needsRestore || restoring.current || busy.current || !socket.connected) return
      restoring.current = true
      try { await enter(stored.name, stored.token, stored.roomCode, stored.reconnectToken) }
      finally { restoring.current = false }
    }
    socket.on('connect', () => { setStatus('connected'); void restore() })
    socket.on('disconnect', () => { needsRestore = true; setStatus('disconnected') })
    socket.on('state:update', (state) => {
      const previous = lastSnapshot.current
      const changedGame = previous?.room.roomCode !== state.room.roomCode || (state.game?.revision ?? -1) < (previous?.game?.revision ?? -1)
      if (needsRestore || changedGame) {
        setEvents([]); buffer.reset(); setReactions([]); setPresentationVersion((version) => version + 1)
        if (changedGame) { pendingCommand.current = null; setRetryAvailable(false) }
      }
      needsRestore = false; lastSnapshot.current = state; setServerState(state)
      const saved = savedRef.current.find((room) => room.roomCode === state.room.roomCode && room.playerId === sessionRef.current?.playerId)
      if (saved && saved.phase !== state.room.phase) saveRooms(savedRef.current.map((room) => room === saved ? { ...room, phase: state.room.phase } : room))
      const ready = buffer.release(state.game?.revision ?? -1)
      if (ready.length) setEvents(current => appendEvents(current, ready))
    })
    socket.on('game:events', incoming => {
      buffer.stage(incoming)
      const ready = buffer.release(lastSnapshot.current?.game?.revision ?? -1)
      if (ready.length && !needsRestore) setEvents(current => appendEvents(current, ready))
    })
    socket.on('room:reaction', reaction => {
      if (reaction.roomCode === sessionRef.current?.roomCode) setReactions(current => [...current, reaction].slice(-3))
    })
    socket.on('server:error', setError)
    // A reconnect can happen before an outstanding request times out.
    const timer = window.setInterval(() => { if (needsRestore) void restore() }, 10000)
    return () => { clearInterval(timer); socket.disconnect(); socketRef.current = null }
  }, [enter, saveRooms])

  useEffect(() => {
    const socket = socketRef.current
    if (status !== 'connected' || session || !socket) return
    let cancelled = false
    let checking = false
    const refresh = async () => {
      if (checking || document.hidden || busy.current || !socket.connected) return
      if (!savedRef.current.length) { setSavedRoomsStatus('idle'); return }
      checking = true
      setSavedRoomsStatus('checking')
      const snapshot = [...savedRef.current]
      try {
        for (let start = 0; start < snapshot.length; start += SAVED_ROOM_CHECK_BATCH_SIZE) {
          if (cancelled || !socket.connected) return
          const batch = snapshot.slice(start, start + SAVED_ROOM_CHECK_BATCH_SIZE)
          const response = await new Promise<Ack<SavedRoomStatus[]> | null>((resolve) => {
            socket.timeout(8000).emit('room:saved-status', { rooms: batch.map(({ roomCode, playerId, reconnectToken }) => ({ roomCode, playerId, reconnectToken })) }, (error, result) => resolve(error ? null : result))
          })
          if (cancelled) return
          if (!response?.ok) { setSavedRoomsStatus('unavailable'); return }
          const next = savedRef.current.flatMap((room) => {
            const checked = batch.find((entry) => entry.roomCode === room.roomCode && entry.playerId === room.playerId && entry.reconnectToken === room.reconnectToken)
            const result = checked && response.data.find((entry) => entry.roomCode === room.roomCode && entry.playerId === room.playerId)
            if (!result || room.roomCode === sessionRef.current?.roomCode) return [room]
            if (result.phase === null) return []
            return [room.phase === result.phase ? room : { ...room, phase: result.phase }]
          })
          if (next.length !== savedRef.current.length || next.some((room, index) => room !== savedRef.current[index])) saveRooms(next)
        }
        setSavedRoomsStatus('idle')
      } finally { checking = false }
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 60000)
    const visible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [status, session, saveRooms])

  const createRoom = useCallback((name: string, token: TokenId) => enter(name, token), [enter])
  const joinRoom = useCallback((code: string, name: string, token: TokenId) => enter(name, token, code), [enter])
  const resumeRoom = useCallback(async (code: string) => {
    const room = savedRef.current.find((candidate) => candidate.roomCode === code)
    if (!room) return
    setEvents([]); setReactions([]); setServerState(null)
    await enter(room.name, room.token, room.roomCode, room.reconnectToken)
  }, [enter])
  const setReady = useCallback((ready: boolean) => { void request<undefined>((socket, done) => socket.emit('room:ready', { ready }, done)) }, [request])
  const startGame = useCallback(() => { void request<undefined>((socket, done) => socket.emit('room:start', done)) }, [request])
  const restartGame = useCallback(() => { void request<undefined>((socket, done) => socket.emit('room:restart', done)) }, [request])

  const deliverCommand = useCallback(async () => {
    const envelope = pendingCommand.current
    if (!envelope || busy.current) return
    setRetryAvailable(false)
    const response = await request<undefined>((socket, done) => socket.emit('game:command', envelope, done))
    if (pendingCommand.current !== envelope) return
    if (!response.ok && canRetryRequest(response)) setRetryAvailable(true)
    else { pendingCommand.current = null; setRetryAvailable(false) }
  }, [request])
  const sendCommand = useCallback((command: GameCommand) => {
    if (pendingCommand.current) { setError('上一项操作还未确认，请重试确认'); return }
    if (busy.current) return
    pendingCommand.current = { commandId: requestId(), command }
    void deliverCommand()
  }, [deliverCommand])

  const leaveRoom = useCallback(async () => {
    const stored = sessionRef.current
    const response = await request<{ canResume: boolean }>((socket, done) => socket.emit('room:leave', done))
    if (!response.ok) return
    if (!response.data.canResume && stored) saveRooms(savedRef.current.filter((room) => room.roomCode !== stored.roomCode))
    persistSession(null); setServerState(null); setEvents([]); setReactions([]); setError(null)
    pendingCommand.current = null; setRetryAvailable(false)
  }, [persistSession, request, saveRooms])

  const sendReaction = useCallback((reaction: ReactionId) => {
    if (socketRef.current?.connected) socketRef.current.emit('room:reaction', { reaction }, response => { if (!response.ok) setError(response.error) })
  }, [])

  return { session, serverState, presentationVersion, events, reactions, sendReaction, status, error, requestPending, retryAvailable, savedRooms, savedRoomsStatus, removedRoomCount: removedRooms.length, forgetSavedRooms, undoForgetSavedRooms,
    clearError: () => setError(null), createRoom, joinRoom, resumeRoom, setReady, startGame, restartGame,
    sendCommand, retryCommand: deliverCommand, leaveRoom }
}
