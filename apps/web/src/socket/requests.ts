import { failure, type Ack, type ClientToServerEvents, type ServerToClientEvents } from '@fortune/protocol'
import type { Socket } from 'socket.io-client'

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>
export type RequestSender<T> = (socket: GameSocket, done: (response: Ack<T>) => void) => void

export function sendRequest<T>(socket: GameSocket | null, send: RequestSender<T>): Promise<Ack<T>> {
  if (!socket?.connected) return Promise.resolve(failure('DISCONNECTED', '连接已断开，重连后再试'))
  return new Promise(resolve => {
    let finished = false
    const done = (response: Ack<T>) => {
      if (finished) return
      finished = true
      window.clearTimeout(timer)
      socket.off('disconnect', disconnected)
      resolve(response)
    }
    const disconnected = () => done(failure('DISCONNECTED', '连接中断，重连后可确认上次操作'))
    const timer = window.setTimeout(() => done(failure('TIMEOUT', '尚未收到确认，请重试')), 8000)
    socket.on('disconnect', disconnected)
    try { send(socket, done) } catch { done(failure('DISCONNECTED', '操作未发出，请重试')) }
  })
}
