import { applyCommand, createGame, eventPresentationDuration, WHEEL_SPIN_MS, type GameEvent, type GameState, type TokenId } from '@fortune/game'
import type { GameCommandEnvelope, LobbyPlayer, RoomSnapshot, SavedRoomStatus, ServerState, SessionInfo } from '@fortune/protocol'
import { publicGameState, type RequestErrorCode } from '@fortune/protocol'
import { randomBytes, randomInt } from 'node:crypto'
import { decisionKey, decisionSeconds, timeoutCommand } from './turnPolicy.js'

interface RoomPlayer extends Omit<LobbyPlayer, 'isHost'> {
  reconnectToken: string
}

interface Room {
  code: string
  hostPlayerId: string
  players: RoomPlayer[]
  game: GameState | null
  processedCommands: Map<string, Map<string, string>>
  emptySince: number | null
  turnDeadline: number | null
}


function roomPhase(room: Room): RoomSnapshot['phase'] { return !room.game ? 'lobby' : room.game.phase === 'FINISHED' ? 'finished' : 'playing' }

export interface RoomActionResult {
  ok: boolean
  error?: string
  code?: RequestErrorCode
  session?: SessionInfo
  state?: ServerState
  events?: GameEvent[]
}

const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const marketRandom = () => randomInt(0, 0x1_0000_0000) / 0x1_0000_0000


function reconnectToken(): string {
  return randomBytes(24).toString('base64url')
}

function playerId(): string {
  return randomBytes(10).toString('hex')
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>()
  private readonly entries = new Map<string, { session: SessionInfo; signature: string; expires: number }>()

  private cachedEntry(requestId: string | undefined, signature: string): RoomActionResult | null {
    if (!requestId) return null
    const cached = this.entries.get(requestId)
    if (!cached || cached.expires < Date.now()) return null
    if (cached.signature !== signature) return { ok: false, code: 'REQUEST_CONFLICT', error: '请求已变化，请重新操作' }
    const room = this.rooms.get(cached.session.roomCode)
    const player = room?.players.find((entry) => entry.id === cached.session.playerId)
    if (!room || !player) return { ok: false, code: 'SESSION_EXPIRED', error: '原房间已离开或关闭，请重新加入' }
    return this.join(room.code, player.name, player.token, cached.session.reconnectToken)
  }

  private rememberEntry(requestId: string | undefined, signature: string, session: SessionInfo): void {
    if (!requestId) return
    for (const [id, entry] of this.entries) if (entry.expires < Date.now()) this.entries.delete(id)
    this.entries.set(requestId, { signature, session, expires: Date.now() + 5 * 60 * 1000 })
  }

  create(name: string, token: TokenId, requestId?: string): RoomActionResult {
    const signature = JSON.stringify(['create', name, token])
    const cached = this.cachedEntry(requestId, signature)
    if (cached) return cached
    const code = this.createCode()
    const id = playerId()
    const secret = reconnectToken()
    const room: Room = {
      code,

      hostPlayerId: id,
      players: [
        {
          id,
          name,
          token,
          ready: false,
          connected: true,

          reconnectToken: secret,
        },
      ],
      game: null,
      processedCommands: new Map(),
      emptySince: null,
      turnDeadline: null,
    }
    this.rooms.set(code, room)
    this.rememberEntry(requestId, signature, { roomCode: code, playerId: id, reconnectToken: secret })
    return {
      ok: true,
      session: { roomCode: code, playerId: id, reconnectToken: secret },
      state: this.publicState(room),
    }
  }

  join(code: string, name: string, token: TokenId, secret?: string, requestId?: string): RoomActionResult {
    const signature = JSON.stringify(['join', code, name, token, secret])
    const cached = this.cachedEntry(requestId, signature)
    if (cached) return cached
    const room = this.rooms.get(code)
    if (!room) return { ok: false, code: 'ROOM_NOT_FOUND', error: '房间不存在或已关闭，请核对房间码' }

    if (secret) {
      const returning = room.players.find((player) => player.reconnectToken === secret)
      if (returning) {
        returning.connected = true
        room.emptySince = null
        this.transferHost(room)
        this.rememberEntry(requestId, signature, { roomCode: code, playerId: returning.id, reconnectToken: secret })
        return {
          ok: true,
          session: { roomCode: code, playerId: returning.id, reconnectToken: secret },
          state: this.publicState(room),
        }
      }
      return { ok: false, code: 'SESSION_EXPIRED', error: '这个座位已离开，请重新加入房间' }
    }

    if (roomPhase(room) !== 'lobby') return { ok: false, error: '游戏已经开始，只有原玩家可以重连' }
    if (room.players.length >= 6) return { ok: false, error: '房间已经满员' }
    if (room.players.some((player) => player.name === name)) return { ok: false, error: '这个昵称已有好友使用，换一个再加入吧' }
    if (room.players.some((player) => player.token === token)) return { ok: false, error: '这个棋子已被选走，换一个再加入吧' }

    const id = playerId()
    const nextSecret = reconnectToken()
    room.players.push({
      id,
      name,
      token,
      ready: false,
      connected: true,

      reconnectToken: nextSecret,
    })
    room.emptySince = null
    this.transferHost(room)
    this.rememberEntry(requestId, signature, { roomCode: code, playerId: id, reconnectToken: nextSecret })
    return {
      ok: true,
      session: { roomCode: code, playerId: id, reconnectToken: nextSecret },
      state: this.publicState(room),
    }
  }

  setReady(code: string, id: string, ready: boolean): RoomActionResult {
    const room = this.rooms.get(code)
    if (!room || roomPhase(room) !== 'lobby') return { ok: false, error: '当前不能修改准备状态' }
    const player = room.players.find((candidate) => candidate.id === id)
    if (!player) return { ok: false, error: '玩家不在房间中' }
    player.ready = ready
    return { ok: true, state: this.publicState(room) }
  }

  start(code: string, id: string): RoomActionResult {
    const room = this.rooms.get(code)
    if (!room || roomPhase(room) !== 'lobby') return { ok: false, error: '当前不能开始游戏' }
    if (room.hostPlayerId !== id) return { ok: false, error: '只有房主可以开始游戏' }
    if (room.players.length < 2) return { ok: false, error: '至少需要2名玩家' }
    if (room.players.some((player) => !player.ready)) return { ok: false, error: '还有玩家没有准备' }
    if (room.players.some((player) => !player.connected)) return { ok: false, error: '还有好友离线，等大家回来再开局' }

    const game = createGame(
      room.players.map((player) => ({
        id: player.id,
        name: player.name,
        token: player.token,
        connected: player.connected,
      })),
      Math.random, Date.now(), marketRandom,
    )
    this.commit(room, game)
    return { ok: true, state: this.publicState(room), events: game.actionLog.slice(-1) }
  }

  restart(code: string, id: string): RoomActionResult {
    const room = this.rooms.get(code)
    if (!room || room.hostPlayerId !== id) return { ok: false, error: '只有房主可以重新开局' }
    if (roomPhase(room) !== 'finished') return { ok: false, error: '游戏尚未结束' }
    room.game = null
    room.turnDeadline = null
    room.processedCommands.clear()
    for (const player of room.players) player.ready = false
    return { ok: true, state: this.publicState(room) }
  }

  command(code: string, id: string, envelope: GameCommandEnvelope): RoomActionResult {
    const room = this.rooms.get(code)
    if (!room?.game || roomPhase(room) !== 'playing') return { ok: false, error: '游戏尚未开始' }
    let seen = room.processedCommands.get(id)
    if (!seen) {
      seen = new Map()
      room.processedCommands.set(id, seen)
    }
    const signature = JSON.stringify(envelope.command)
    if (seen.has(envelope.commandId)) return seen.get(envelope.commandId) === signature
      ? { ok: true, state: this.publicState(room), events: [] }
      : { ok: false, code: 'REQUEST_CONFLICT', error: '这次操作的编号已被使用，请重新操作' }

    const previousPlayerId = room.game.currentPlayerId
    const previousPhase = room.game.phase
    const now = Date.now()
    const result = applyCommand(room.game, id, envelope.command, Math.random, now, false, marketRandom)
    if (!result.ok) return { ok: false, error: result.error ?? '操作失败' }
    const preserveDeadline = envelope.command.type === 'TRADE_STOCK'
      || (envelope.command.type === 'SURRENDER' && previousPlayerId !== id && previousPhase === result.state.phase)
    this.commit(room, result.state, now, result.events, preserveDeadline)
    seen.set(envelope.commandId, signature)
    if (seen.size > 100) {
      const oldest = seen.keys().next().value
      if (oldest) seen.delete(oldest)
    }
    return { ok: true, state: this.publicState(room), events: result.events }
  }

  expireTurns(now = Date.now()): Array<{ roomCode: string; events: GameEvent[] }> {
    const expired: Array<{ roomCode: string; events: GameEvent[] }> = []
    for (const room of this.rooms.values()) {
      if (!room.game || roomPhase(room) !== 'playing') continue
      const auction = room.game.pendingAuction
      if (auction) {
        if (now < auction.deadline) continue
        const result = applyCommand(room.game, room.game.currentPlayerId, { type: 'RESOLVE_AUCTION', auctionId: auction.id }, Math.random, now, false, marketRandom)
        if (result.ok) {
          this.commit(room, result.state, now, result.events)
          expired.push({ roomCode: room.code, events: result.events })
        }
        continue
      }
      const wheel = room.game.pendingWheel
      if (wheel?.stage === 'spinning' && wheel.startedAt !== null && now >= wheel.startedAt + WHEEL_SPIN_MS) {
        const result = applyCommand(room.game, wheel.playerId, { type: 'RESOLVE_WHEEL', wheelId: wheel.id }, Math.random, now, false, marketRandom)
        if (result.ok) {
          this.commit(room, result.state, now, result.events)
          expired.push({ roomCode: room.code, events: result.events })
        }
        continue
      }
      if (!room.turnDeadline || room.turnDeadline > now) continue
      const events: GameEvent[] = []
      let rolled = false
      const timedOutPlayerId = room.game.currentPlayerId

      for (let step = 0; step < 5; step += 1) {
        const command = timeoutCommand(room.game, rolled)
        if (!command) break
        if (command.type === 'ROLL_DICE' || command.type === 'TRY_JAIL_ROLL') rolled = true
        const result = applyCommand(room.game, room.game.currentPlayerId, command, Math.random, now, true, marketRandom)
        if (!result.ok) break
        this.commit(room, result.state, now, result.events)
        events.push(...result.events)
        if (room.game.phase === 'FINISHED') {
          break
        }
        if (room.game.currentPlayerId !== timedOutPlayerId || room.game.pendingWheel?.stage === 'spinning' || room.game.pendingAuction || room.game.pendingDebt) break
      }

      // Automatic steps may share one broadcast; all of their motion precedes
      // the next player's decision, not just the final command's events.
      if (room.turnDeadline !== null && !room.game.pendingAuction && room.game.pendingWheel?.stage !== 'spinning') {
        room.turnDeadline = now + decisionSeconds(room.game) * 1000 + events.reduce((total, event) => total + eventPresentationDuration(event), 0)
      }
      expired.push({ roomCode: room.code, events })
    }
    return expired
  }

  disconnect(code: string, id: string): ServerState | null {
    const room = this.rooms.get(code)
    if (!room) return null
    const player = room.players.find((candidate) => candidate.id === id)
    if (player) player.connected = false
    if (player && roomPhase(room) === 'lobby') player.ready = false
    if (room.players.every((candidate) => !candidate.connected)) room.emptySince = Date.now()
    this.transferHost(room)
    return this.publicState(room)
  }

  leave(code: string, id: string): { ok: boolean; canResume: boolean; error?: string } {
    const room = this.rooms.get(code)
    if (!room) return { ok: true, canResume: false }
    if (roomPhase(room) !== 'lobby') { this.disconnect(code, id); return { ok: true, canResume: true } }
    room.players = room.players.filter((player) => player.id !== id)
    room.processedCommands.delete(id)
    if (!room.players.length) this.rooms.delete(code)
    else { this.transferHost(room); if (room.players.every((player) => !player.connected)) room.emptySince = Date.now() }
    return { ok: true, canResume: false }
  }

  private transferHost(room: Room): void {
    const host = room.players.find((player) => player.id === room.hostPlayerId)
    if (host?.connected) return
    const next = room.players.find((player) => player.connected) ?? room.players[0]
    if (!next) return
    room.hostPlayerId = next.id
  }

  getState(code: string, viewerId?: string): ServerState | null {
    const room = this.rooms.get(code)
    return room ? this.publicState(room, viewerId) : null
  }

  savedRoomStatus(sessions: SessionInfo[]): SavedRoomStatus[] {
    return sessions.map(({ roomCode, playerId, reconnectToken }) => {
      const room = this.rooms.get(roomCode)
      const ownsSeat = room?.players.some((player) => player.id === playerId && player.reconnectToken === reconnectToken)
      return { roomCode, playerId, phase: room && ownsSeat ? roomPhase(room) : null }
    })
  }

  removeStaleRooms(maxEmptyMs: number): void {
    const now = Date.now()
    for (const [code, room] of this.rooms) {
      if (room.emptySince && now - room.emptySince > maxEmptyMs) this.rooms.delete(code)
    }
  }

  private publicState(room: Room, viewerId?: string): ServerState {
    const snapshot: RoomSnapshot = {
      roomCode: room.code,
      phase: roomPhase(room),
      settings: { maxPlayers: 6, turnSeconds: room.game ? decisionSeconds(room.game) : 30 },
      turnDeadline: room.turnDeadline,
      serverTime: Date.now(),
      players: room.players.map(({ reconnectToken: _secret, ...player }) => ({ ...player, isHost: player.id === room.hostPlayerId })),
    }
    const game = room.game ? publicGameState(room.game, viewerId) : null
    if (game) for (const player of game.players) player.connected = room.players.some(member => member.id === player.id && member.connected)
    return { room: snapshot, game }
  }

  private createCode(): string {
    for (;;) {
      let code = ''
      for (let index = 0; index < 6; index += 1) {
        code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)]
      }
      if (!this.rooms.has(code)) return code
    }
  }

  nextDeadline(): number | null {
    let deadline: number | null = null
    for (const room of this.rooms.values()) {
      if (roomPhase(room) !== 'playing' || room.turnDeadline === null) continue
      deadline = Math.min(deadline ?? Infinity, room.turnDeadline)
    }
    return deadline
  }

  private commit(room: Room, game: GameState, now = Date.now(), events: GameEvent[] = [], preserveDeadline = false): void {
    const previous = room.game
    const sameDecision = previous && decisionKey(previous) === decisionKey(game)
      && !events.some(event => event.type === 'DEBT_CREATED')
    const playbackMs = events.reduce((total, event) => total + eventPresentationDuration(event), 0)
    room.game = game
    if (game.phase === 'FINISHED') room.turnDeadline = null
    else if (game.pendingAuction) room.turnDeadline = game.pendingAuction.deadline
    else if (game.pendingWheel?.stage === 'spinning' && game.pendingWheel.startedAt !== null) room.turnDeadline = game.pendingWheel.startedAt + WHEEL_SPIN_MS
    else if (room.turnDeadline === null || (!preserveDeadline && !sameDecision)) {
      room.turnDeadline = now + decisionSeconds(game) * 1000 + playbackMs
    } else if (!preserveDeadline && playbackMs > 0) {
      // Extra movement pauses the remaining budget without resetting it.
      room.turnDeadline += playbackMs
    }
  }


}
