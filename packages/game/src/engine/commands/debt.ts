import { type CommandResult, type GameCommand } from '../../types.js'

import { commandError } from '../context.js'
import { bankruptPlayer } from '../finance.js'
import { settleDebt } from '../landing.js'

import type { CommandContext } from './context.js'

export function handleDebt({ current, state, player, playerId, events, random, now }: CommandContext, command: Extract<GameCommand, { type: 'SETTLE_DEBT' | 'DECLARE_BANKRUPTCY' }>): CommandResult | undefined {
  switch (command.type) {
    case 'SETTLE_DEBT': {
      if (state.phase !== 'WAITING_FOR_DEBT') return commandError(current, '当前没有待支付债务')
      const error = settleDebt(state, player, random, events)
      if (error) return commandError(current, error)
      return
    }
    case 'DECLARE_BANKRUPTCY':
      if (state.phase !== 'WAITING_FOR_DEBT' || state.pendingDebt?.debtorId !== playerId) {
        return commandError(current, '当前不能宣告破产')
      }
      bankruptPlayer(state, player, state.pendingDebt.creditorId, events)
      return

  }
}
