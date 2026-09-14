export type RequestErrorCode =
  | 'INVALID_INPUT' | 'NOT_IN_ROOM' | 'ROOM_NOT_FOUND' | 'SESSION_EXPIRED'
  | 'COMMAND_REJECTED' | 'REQUEST_CONFLICT' | 'TIMEOUT' | 'DISCONNECTED' | 'BUSY'

export interface RequestFailure { ok: false; code: RequestErrorCode; error: string }

export function failure(code: RequestErrorCode, error: string): RequestFailure {
  return { ok: false, code, error }
}

export function canRetryRequest(result: RequestFailure): boolean {
  return result.code === 'TIMEOUT' || result.code === 'DISCONNECTED' || result.code === 'BUSY'
}
