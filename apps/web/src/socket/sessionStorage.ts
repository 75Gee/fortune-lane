import { TOKEN_IDS, type TokenId } from '@fortune/game'
import { savedRoomCredentialsSchema, type RoomSnapshot, type SessionInfo } from '@fortune/protocol'
export interface StoredSession extends SessionInfo { name: string; token: TokenId; phase?: RoomSnapshot['phase'] }
export const STORAGE_KEY = 'fortune-lane-session'
export const SAVED_KEY = 'fortune-lane-saved-rooms'
export function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
export function write(key: string, value: unknown) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep the current visit usable when browser storage is unavailable. */ } }
export function requestId() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('') }

export function readSavedRooms(): StoredSession[] {
  const stored = read<unknown>(SAVED_KEY, [])
  if (!Array.isArray(stored)) return []
  const rooms: StoredSession[] = []
  for (const candidate of stored) {
    const credentials = savedRoomCredentialsSchema.safeParse(candidate)
    if (!credentials.success || typeof candidate.name !== 'string' || !TOKEN_IDS.includes(candidate.token) || rooms.some((room) => room.roomCode === credentials.data.roomCode)) continue
    const room: StoredSession = { ...credentials.data, name: candidate.name, token: candidate.token }
    if (candidate.phase === 'lobby' || candidate.phase === 'playing' || candidate.phase === 'finished') room.phase = candidate.phase
    rooms.push(room)
  }
  return rooms
}
