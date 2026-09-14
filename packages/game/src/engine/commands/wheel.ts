import { type CommandResult, type GameCommand } from '../../types.js'
import { WHEEL_LABELS, WHEEL_OUTCOMES, WHEEL_SPIN_MS, wheelProperties } from '../../wheel.js'

import { addEvent, commandError } from '../context.js'
import { createDebt } from '../finance.js'
import { transitionTo } from '../transitions.js'

import type { CommandContext } from './context.js'

export function handleWheel({ current, state, player, playerId, events, random, now }: CommandContext, command: Extract<GameCommand, { type: 'SPIN_WHEEL' | 'RESOLVE_WHEEL' | 'CHOOSE_WHEEL_PROPERTY' }>): CommandResult | undefined {
  switch (command.type) {
    case 'SPIN_WHEEL': {
      const wheel = state.pendingWheel
      if (state.phase !== 'WAITING_FOR_WHEEL' || !wheel || wheel.playerId !== playerId || wheel.id !== command.wheelId || wheel.stage !== 'ready') return commandError(current, '当前不能启动转盘')
      const index = Math.floor(random() * WHEEL_OUTCOMES.length)
      wheel.outcome = WHEEL_OUTCOMES[index]!
      const sector = index + (random() < .5 ? 0 : 4)
      wheel.ballAngle = sector * 45 + 12 + random() * 21
      wheel.startedAt = now
      wheel.stage = 'spinning'
      addEvent(state, events, { type: 'WHEEL_SPUN', playerId, wheel: structuredClone(wheel), message: `${player.name} 启动幸运转盘` })
      return
    }
    case 'RESOLVE_WHEEL': {
      const wheel = state.pendingWheel
      if (state.phase !== 'WAITING_FOR_WHEEL' || !wheel || wheel.playerId !== playerId || wheel.id !== command.wheelId || wheel.stage !== 'spinning' || !wheel.outcome || wheel.startedAt === null || now < wheel.startedAt + WHEEL_SPIN_MS) return commandError(current, '转盘尚未停稳')
      const candidates = wheelProperties(state, playerId, wheel.outcome)
      const building = wheel.outcome === 'gain_house' || wheel.outcome === 'lose_house'
      wheel.stage = 'choosing'
      addEvent(state, events, { type: 'WHEEL_RESOLVED', playerId, wheel: structuredClone(wheel), message: `${player.name} 转到「${WHEEL_LABELS[wheel.outcome]}」${building && !candidates.length ? '，没有符合条件的地产，本次无变化' : ''}` })
      if (building && candidates.length) return
      transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
      if (wheel.outcome === 'gain_cash') {
        player.cash += 2000
        addEvent(state, events, { type: 'MONEY_CHANGED', playerId, amount: 2000, message: `${player.name} 因幸运转盘获得 2000 元` })
      } else if (wheel.outcome === 'lose_cash') {
        createDebt(state, player, null, 2000, '幸运转盘', events, { type: 'READY_TO_END' })
      }
      return
    }
    case 'CHOOSE_WHEEL_PROPERTY': {
      const wheel = state.pendingWheel
      if (state.phase !== 'WAITING_FOR_WHEEL' || !wheel || wheel.playerId !== playerId || wheel.id !== command.wheelId || wheel.stage !== 'choosing') return commandError(current, '当前没有转盘地产选择')
      const tile = wheelProperties(state, playerId, wheel.outcome).find((candidate) => candidate.index === command.tileIndex)
      if (!tile) return commandError(current, '这块地产不符合条件')
      const asset = state.tiles[tile.index]!
      const gain = wheel.outcome === 'gain_house'
      asset.level += gain ? 1 : -1
      transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
      addEvent(state, events, { type: gain ? 'PROPERTY_UPGRADED' : 'BUILDING_SOLD', playerId, tileIndex: tile.index, amount: 0, message: `${player.name} 的 ${tile.name} 因幸运转盘${gain ? '免费升级' : '减少一级建筑，不返还现金'}，现为 ${asset.level} 级` })
      return
    }

  }
}
