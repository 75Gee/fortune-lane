import fastifyStatic from '@fastify/static'
import { createRoomSchema, gameCommandEnvelopeSchema, joinRoomSchema, reactionSchema, readySchema, savedRoomStatusSchema, type ClientToServerEvents, type ServerToClientEvents, type SocketData, } from '@fortune/protocol'
import Fastify from 'fastify'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import { RoomManager } from './rooms.js'

const app = Fastify({ logger: true })
const manager = new RoomManager()
let turnTimer: ReturnType<typeof setTimeout> | undefined
const reactionTimes = new Map<string, number>()
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
  app.server,
  {
    cors: { origin: true, credentials: true },
  },
)

app.get('/health', async () => ({ ok: true, service: 'fortune-lane' }))

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist')
if (existsSync(webRoot)) {
  await app.register(fastifyStatic, { root: webRoot })
  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith('/socket.io')) return reply.code(404).send()
    return reply.sendFile('index.html')
  })
}

function broadcastState(roomCode: string): void {
  for (const socket of io.of('/').sockets.values()) {
    if (socket.data.roomCode !== roomCode || !socket.data.playerId) continue
    const state = manager.getState(roomCode, socket.data.playerId)
    if (state) socket.emit('state:update', state)
  }
  scheduleTurnExpiration()
}

function scheduleTurnExpiration(): void {
  if (turnTimer) clearTimeout(turnTimer)
  turnTimer = undefined
  const deadline = manager.nextDeadline()
  if (deadline === null) return
  turnTimer = setTimeout(() => {
    turnTimer = undefined
    for (const expired of manager.expireTurns()) {
      if (expired.events.length) io.to(expired.roomCode).emit('game:events', expired.events)
      broadcastState(expired.roomCode)
    }
    scheduleTurnExpiration()
  }, Math.max(1, deadline - Date.now()))
  turnTimer.unref()
}

io.on('connection', (socket) => {
  socket.on('room:saved-status', (payload, ack) => {
    if (typeof ack !== 'function') return
    const parsed = savedRoomStatusSchema.safeParse(payload)
    if (!parsed.success) return ack({ ok: false, code: 'INVALID_INPUT', error: '房间记录格式不正确' })
    // Checking saved entries must not join a room, occupy a seat, or extend its lifetime.
    ack({ ok: true, data: manager.savedRoomStatus(parsed.data.rooms) })
  })
  socket.on('room:reaction', (payload, ack) => {
    if (typeof ack !== 'function') return
    const parsed = reactionSchema.safeParse(payload)
    const code = socket.data.roomCode, id = socket.data.playerId
    if (!parsed.success || !code || !id) return ack({ ok: false, code: 'COMMAND_REJECTED', error: '暂时无法发送表情' })
    const state = manager.getState(code, id)
    if (!state?.game || !state.room.players.some(player => player.id === id)) return ack({ ok: false, code: 'COMMAND_REJECTED', error: '进入对局后再发表情' })
    const now = Date.now(), key = `${code}:${id}`
    if (now - (reactionTimes.get(key) ?? 0) < 3000) return ack({ ok: false, code: 'COMMAND_REJECTED', error: '慢一点，3 秒后再发' })
    for (const [key, time] of reactionTimes) if (now - time >= 3000) reactionTimes.delete(key)
    reactionTimes.set(key, now)
    io.to(code).emit('room:reaction', { id: `${id}:${now}`, roomCode: code, playerId: id, reaction: parsed.data.reaction, sentAt: now })
    ack({ ok: true, data: undefined })
  })
  const bindRoom = async (code: string, id: string) => {
    const oldCode = socket.data.roomCode, oldId = socket.data.playerId
    if (oldCode && oldId && (oldCode !== code || oldId !== id)) {
      manager.leave(oldCode, oldId)
      await socket.leave(oldCode)
      broadcastState(oldCode)
    }
    socket.data.roomCode = code; socket.data.playerId = id
    delete socket.data.leaveCanResume
    await socket.join(code)
  }
  socket.on('room:create', async (payload, ack) => {
    const parsed = createRoomSchema.safeParse(payload)
    if (!parsed.success) return ack({ ok: false, code: 'INVALID_INPUT', error: parsed.error.issues[0]?.message ?? '输入不正确' })
    const result = manager.create(parsed.data.name, parsed.data.token, parsed.data.requestId)
    if (!result.ok || !result.session) return ack({ ok: false, code: result.code ?? 'COMMAND_REJECTED', error: result.error ?? '创建房间失败' })
    await bindRoom(result.session.roomCode, result.session.playerId)
    ack({ ok: true, data: result.session })
    broadcastState(result.session.roomCode)
  })

  socket.on('room:join', async (payload, ack) => {
    const parsed = joinRoomSchema.safeParse(payload)
    if (!parsed.success) return ack({ ok: false, code: 'INVALID_INPUT', error: parsed.error.issues[0]?.message ?? '输入不正确' })
    const result = manager.join(
      parsed.data.roomCode,
      parsed.data.name,
      parsed.data.token,
      parsed.data.reconnectToken,
      parsed.data.requestId,
    )
    if (!result.ok || !result.session) return ack({ ok: false, code: result.code ?? 'COMMAND_REJECTED', error: result.error ?? '加入房间失败' })
    await bindRoom(result.session.roomCode, result.session.playerId)
    ack({ ok: true, data: result.session })
    broadcastState(result.session.roomCode)
  })

  socket.on('room:ready', (payload, ack) => {
    const code = socket.data.roomCode
    const id = socket.data.playerId
    if (!code || !id) return ack({ ok: false, code: 'NOT_IN_ROOM', error: '尚未加入房间' })
    const parsed = readySchema.safeParse(payload)
    if (!parsed.success) return ack({ ok: false, code: 'INVALID_INPUT', error: '准备状态不正确' })
    const result = manager.setReady(code, id, parsed.data.ready)
    if (!result.ok) return ack({ ok: false, code: result.code ?? 'COMMAND_REJECTED', error: result.error ?? '操作失败' })
    ack({ ok: true, data: undefined })
    broadcastState(code)
  })

  socket.on('room:leave', async (ack) => {
    const code = socket.data.roomCode, id = socket.data.playerId
    if (!code || !id) return ack({ ok: true, data: { canResume: socket.data.leaveCanResume ?? false } })
    const result = manager.leave(code, id)
    await socket.leave(code)
    delete socket.data.roomCode
    delete socket.data.playerId
    socket.data.leaveCanResume = result.canResume
    ack({ ok: true, data: { canResume: result.canResume } })
    broadcastState(code)
  })

  socket.on('room:start', (ack) => {
    const code = socket.data.roomCode
    const id = socket.data.playerId
    if (!code || !id) return ack({ ok: false, code: 'NOT_IN_ROOM', error: '尚未加入房间' })
    const result = manager.start(code, id)
    if (!result.ok) return ack({ ok: false, code: result.code ?? 'COMMAND_REJECTED', error: result.error ?? '无法开始游戏' })
    ack({ ok: true, data: undefined })
    if (result.events?.length) io.to(code).emit('game:events', result.events)
    broadcastState(code)
  })

  socket.on('room:restart', (ack) => {
    const code = socket.data.roomCode
    const id = socket.data.playerId
    if (!code || !id) return ack({ ok: false, code: 'NOT_IN_ROOM', error: '尚未加入房间' })
    const result = manager.restart(code, id)
    if (!result.ok) return ack({ ok: false, code: result.code ?? 'COMMAND_REJECTED', error: result.error ?? '无法重新开局' })
    ack({ ok: true, data: undefined })
    broadcastState(code)
  })

  socket.on('game:command', (payload, ack) => {
    const code = socket.data.roomCode
    const id = socket.data.playerId
    if (!code || !id) return ack({ ok: false, code: 'NOT_IN_ROOM', error: '尚未加入房间' })
    const parsed = gameCommandEnvelopeSchema.safeParse(payload)
    if (!parsed.success) return ack({ ok: false, code: 'INVALID_INPUT', error: '游戏操作格式不正确' })
    const result = manager.command(code, id, parsed.data)
    if (!result.ok) return ack({ ok: false, code: result.code ?? 'COMMAND_REJECTED', error: result.error ?? '操作失败' })
    ack({ ok: true, data: undefined })
    if (result.events?.length) io.to(code).emit('game:events', result.events)
    broadcastState(code)
  })

  socket.on('disconnect', () => {
    const code = socket.data.roomCode
    const id = socket.data.playerId
    if (!code || !id) return
    if ([...io.of('/').sockets.values()].some((other) => other.id !== socket.id && other.data.roomCode === code && other.data.playerId === id)) return
    manager.disconnect(code, id)
    broadcastState(code)
  })
})

setInterval(() => manager.removeStaleRooms(30 * 60 * 1000), 5 * 60 * 1000).unref()

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'
await app.listen({ host, port })
