export * from './errors.js'
export { publicGameState } from './publicState.js'
import { BOARD, MAX_PROPERTY_LEVEL, STOCK_IDS, TOKEN_IDS, type GameCommand, type GameEvent, type GameView, type TokenId } from '@fortune/game'
import { z } from 'zod'
import type { RequestFailure } from './errors.js'

export interface LobbyPlayer {
  id: string
  name: string
  token: TokenId
  ready: boolean
  connected: boolean
  isHost: boolean
}

export interface RoomSettings {
  maxPlayers: number
  turnSeconds: number
}

export interface RoomSnapshot {
  roomCode: string
  phase: 'lobby' | 'playing' | 'finished'
  players: LobbyPlayer[]
  settings: RoomSettings
  turnDeadline: number | null
  serverTime: number
}

export interface SessionInfo {
  roomCode: string
  playerId: string
  reconnectToken: string
}

export interface SavedRoomStatus {
  roomCode: string
  playerId: string
  phase: RoomSnapshot['phase'] | null
}

export const SAVED_ROOM_CHECK_BATCH_SIZE = 20

export interface ServerState {
  room: RoomSnapshot
  game: GameView | null
}

export type Ack<T = undefined> =
  | { ok: true; data: T }
  | RequestFailure

export interface GameCommandEnvelope {
  commandId: string
  command: GameCommand
}

export interface ServerToClientEvents {
  'room:reaction': (reaction: RoomReaction) => void
  'state:update': (state: ServerState) => void
  'game:events': (events: GameEvent[]) => void
  'server:error': (message: string) => void
}

export interface ClientToServerEvents {
  'room:saved-status': (payload: { rooms: SessionInfo[] }, ack: (response: Ack<SavedRoomStatus[]>) => void) => void
  'room:reaction': (payload: { reaction: ReactionId }, ack: (response: Ack) => void) => void
  'room:create': (payload: CreateRoomInput, ack: (response: Ack<SessionInfo>) => void) => void
  'room:join': (payload: JoinRoomInput, ack: (response: Ack<SessionInfo>) => void) => void
  'room:ready': (payload: ReadyInput, ack: (response: Ack) => void) => void
  'room:start': (ack: (response: Ack) => void) => void
  'room:restart': (ack: (response: Ack) => void) => void
  'room:leave': (ack: (response: Ack<{ canResume: boolean }>) => void) => void
  'game:command': (payload: GameCommandEnvelope, ack: (response: Ack) => void) => void
}

export interface SocketData {
  leaveCanResume?: boolean
  roomCode?: string
  playerId?: string
}

export const REACTIONS = { lucky: ['🍀', '好运！'], mercy: ['🥺', '手下留情'], laugh: ['😂', '笑出声'], wow: ['😮', '好家伙'], cheer: ['🎉', '漂亮！'], cry: ['😭', '钱包空了'], thinking: ['🤔', '让我想想'], thanks: ['🙏', '多谢关照'], confident: ['😎', '势在必得'] } as const
export type ReactionId = keyof typeof REACTIONS
export interface RoomReaction { id: string; roomCode: string; playerId: string; reaction: ReactionId; sentAt: number }
export const reactionSchema = z.object({ reaction: z.enum(Object.keys(REACTIONS) as [ReactionId, ...ReactionId[]]) })

export const tokenSchema = z.enum(TOKEN_IDS)
export const playerNameSchema = z.string().trim().min(1, '请输入昵称').max(12, '昵称最多12个字符')
export const roomCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/, '房间码格式不正确')

export const savedRoomCredentialsSchema = z.object({
  roomCode: roomCodeSchema,
  playerId: z.string().min(1).max(80),
  reconnectToken: z.string().min(16).max(128),
})

export const savedRoomStatusSchema = z.object({
  rooms: z.array(savedRoomCredentialsSchema).min(1).max(SAVED_ROOM_CHECK_BATCH_SIZE),
})

export const createRoomSchema = z.object({
  requestId: z.string().min(16).max(80).optional(),
  name: playerNameSchema,
  token: tokenSchema,
})

export const joinRoomSchema = z.object({
  requestId: z.string().min(16).max(80).optional(),
  roomCode: roomCodeSchema,
  name: playerNameSchema,
  token: tokenSchema,
  reconnectToken: z.string().min(16).optional(),
})

export const readySchema = z.object({ ready: z.boolean() })

export const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('TRADE_STOCK'), stockId: z.enum(STOCK_IDS), side: z.enum(['buy', 'sell']), quantity: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER), quoteRevision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }),
  z.object({ type: z.literal('ROLL_DICE') }),
  z.object({ type: z.literal('ROLL_AGAIN') }),
  z.object({ type: z.literal('USE_TURTLE'), targetPlayerId: z.string().min(1).max(80) }),
  z.object({ type: z.literal('USE_CHOSEN_DIE'), value: z.number().int().min(1).max(6) }),
  z.object({ type: z.literal('PLACE_ROADBLOCK'), tileIndex: z.number().int().min(0).max(BOARD.length - 1) }),
  z.object({ type: z.literal('PLACE_BOMB'), tileIndex: z.number().int().min(0).max(BOARD.length - 1) }),
  z.object({ type: z.literal('BUY_PROPERTY') }),
  z.object({ type: z.literal('SKIP_PURCHASE') }),
  z.object({ type: z.literal('BID_AUCTION'), auctionId: z.string().min(1).max(80), amount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }),
  z.object({ type: z.literal('SURRENDER') }),
  z.object({ type: z.literal('UPGRADE_PROPERTY') }),
  z.object({ type: z.literal('SKIP_UPGRADE') }),
  z.object({ type: z.literal('CHOOSE_CARD'), choiceId: z.string().min(1).max(100), cardIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]) }),
  z.object({ type: z.literal('CHOOSE_CARD_PROPERTY'), choiceId: z.string().min(1).max(80), tileIndex: z.number().int().min(0).max(BOARD.length - 1) }),
  z.object({ type: z.literal('SPIN_WHEEL'), wheelId: z.string().min(1).max(80) }),
  z.object({ type: z.literal('CHOOSE_WHEEL_PROPERTY'), wheelId: z.string().min(1).max(80), tileIndex: z.number().int().min(0).max(BOARD.length - 1) }),
  z.object({ type: z.literal('MORTGAGE_ASSET'), tileIndex: z.number().int().min(0).max(BOARD.length - 1) }),
  z.object({ type: z.literal('REDEEM_ASSET'), tileIndex: z.number().int().min(0).max(BOARD.length - 1) }),
  z.object({ type: z.literal('SELL_BUILDING'), tileIndex: z.number().int().min(0).max(BOARD.length - 1) }),
  z.object({ type: z.literal('LIQUIDATE_ASSETS'), selections: z.array(z.object({
    tileIndex: z.number().int().min(0).max(BOARD.length - 1),
    sellLevels: z.number().int().min(0).max(MAX_PROPERTY_LEVEL),
    mortgage: z.boolean(),
  })).max(BOARD.length), stockSales: z.array(z.object({ stockId: z.enum(STOCK_IDS), quantity: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) })).max(STOCK_IDS.length).optional(), quoteRevision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional() }),
  z.object({ type: z.literal('PAY_JAIL_FINE') }),
  z.object({ type: z.literal('USE_JAIL_CARD') }),
  z.object({ type: z.literal('TRY_JAIL_ROLL') }),
  z.object({ type: z.literal('SETTLE_DEBT') }),
  z.object({ type: z.literal('DECLARE_BANKRUPTCY') }),
  z.object({ type: z.literal('END_TURN') }),
])

export const gameCommandEnvelopeSchema = z.object({
  commandId: z.string().min(8).max(80),
  command: gameCommandSchema,
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type JoinRoomInput = z.infer<typeof joinRoomSchema>
export type ReadyInput = z.infer<typeof readySchema>
