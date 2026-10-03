import type { RoomSnapshot } from '@fortune/protocol'
import { LobbyPage } from './LobbyPage.js'

/** Dev-only `?scene=lobby`: a half-full room for screenshots, no server needed. */
export default function LobbyPreview() {
  const full = new URLSearchParams(location.search).has('full')
  const room: RoomSnapshot = {
    roomCode: '画面预览',
    phase: 'lobby',
    turnDeadline: null,
    serverTime: Date.now(),
    settings: { maxPlayers: 6, turnSeconds: 30 },
    players: [
      { id: 'xiaoman', name: '小满', token: 'suitcase', ready: true, connected: true, isHost: true },
      { id: 'alan', name: '阿岚', token: 'camera', ready: true, connected: true, isHost: false },
      { id: 'muzi', name: '木子', token: 'compass', ready: false, connected: true, isHost: false },
      ...(full
        ? ([
            { id: 'xiaoyu', name: '小雨', token: 'train', ready: true, connected: false, isHost: false },
            { id: 'ah', name: '阿浩', token: 'teapot', ready: true, connected: true, isHost: false },
            { id: 'qq', name: '琪琪', token: 'kite', ready: false, connected: true, isHost: false },
          ] as const)
        : []),
    ],
  }
  return <LobbyPage room={room} playerId="xiaoman" onReady={() => {}} onStart={() => {}} onLeave={() => {}} />
}
