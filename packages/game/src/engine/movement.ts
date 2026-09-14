import { BOARD, getTile, getTileById } from '../board.js'
import { PASS_START_REWARD } from '../economy.js'
import { movementPreview } from '../items.js'
import { type GameEvent, type GameState, type PlayerState } from '../types.js'

import { addEvent } from './context.js'
import { transitionTo } from './transitions.js'

export function sendToDetention(state: GameState, player: PlayerState, events: GameEvent[], facility: 'jail' | 'hospital', reason: string): void {
  const from = player.position
  player.position = getTileById(facility).index
  player.isInJail = facility === 'jail'
  player.isInHospital = facility === 'hospital'
  player.jailTurns = 0
  state.extraMove = null
  transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
  addEvent(state, events, {
    type: facility === 'jail' ? 'PLAYER_SENT_TO_JAIL' : 'PLAYER_SENT_TO_HOSPITAL',
    playerId: player.id, from, to: player.position, tileIndex: player.position,
    message: `${player.name} 因${reason}${facility === 'jail' ? '进入监狱' : '住院'}，本回合结束，送往途中不领取起点补助`,
  })
}

export function sendToJail(state: GameState, player: PlayerState, events: GameEvent[], reason = '到达入狱格'): void {
  sendToDetention(state, player, events, 'jail', reason)
}

export function leaveDetention(state: GameState, player: PlayerState, events: GameEvent[], reason: string, amount?: number): void {
  const hospital = player.isInHospital
  player.isInJail = false
  player.isInHospital = false
  player.jailTurns = 0
  addEvent(state, events, {
    type: hospital ? 'PLAYER_LEFT_HOSPITAL' : 'PLAYER_LEFT_JAIL', playerId: player.id,
    ...(amount !== undefined ? { amount } : {}),
    message: `${player.name} ${reason}${hospital ? '出院' : '出狱'}`,
  })
}

export function moveBy(
  state: GameState,
  player: PlayerState,
  steps: number,
  events: GameEvent[],
  collectStart = steps > 0,
): void {
  const from = player.position
  const { path, hazard, destination: to } = movementPreview(state, from, steps)
  const startPasses = collectStart && steps > 0 ? path.filter((index) => index === 0).length : 0
  player.position = to
  addEvent(state, events, {
    type: 'TOKEN_MOVED',
    playerId: player.id,
    from,
    to,
    path,
    message: `${player.name} ${steps < 0 ? '后退' : '前进'}到 ${getTile(to).name}`,
  })
  for (let pass = 0; pass < startPasses; pass += 1) {
    player.cash += PASS_START_REWARD
    addEvent(state, events, {
      type: 'PASSED_START',
      playerId: player.id,
      tileIndex: 0,
      amount: PASS_START_REWARD,
      message: `${player.name} 经过起点，领取 ${PASS_START_REWARD} 元`,
    })
  }
  if (hazard) {
    state.hazards = state.hazards.filter((entry) => entry.id !== hazard.id)
    addEvent(state, events, {
      type: 'HAZARD_TRIGGERED', playerId: player.id, targetPlayerId: hazard.ownerId,
      tileIndex: hazard.tileIndex, itemKind: hazard.kind, hazard: { ...hazard },
      message: `${player.name} 在 ${getTile(hazard.tileIndex).name} ${hazard.kind === 'roadblock' ? '被路障拦下，停在此处并结算落点；路障已消耗' : '踩中炸弹，将立即送往医院；炸弹已消耗'}`,
    })
    if (hazard.kind === 'bomb') sendToDetention(state, player, events, 'hospital', '踩中炸弹')
  }

}

export function moveTo(
  state: GameState,
  player: PlayerState,
  tileIndex: number,
  events: GameEvent[],
  collectStart: boolean,
): void {
  const from = player.position
  let steps = tileIndex - from
  if (steps <= 0 && collectStart) steps += BOARD.length
  if (!collectStart && steps > 0) steps -= BOARD.length
  moveBy(state, player, steps, events, collectStart)
}
