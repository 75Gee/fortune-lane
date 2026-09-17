import { JAIL_FINE } from '../../economy.js'
import { isDetained } from '../../items.js'
import { type CommandResult, type GameCommand } from '../../types.js'

import { addEvent, commandError, roll } from '../context.js'
import { createDebt } from '../finance.js'
import { resolveLanding } from '../landing.js'
import { leaveDetention, moveBy } from '../movement.js'
import { fundStockPayment } from '../stockTrading.js'
import { advancePlayer } from '../turns.js'

import type { CommandContext } from './context.js'

export function handleDetention({ current, state, player, playerId, events, random, now }: CommandContext, command: Extract<GameCommand, { type: 'PAY_JAIL_FINE' | 'USE_JAIL_CARD' | 'TRY_JAIL_ROLL' }>): CommandResult | undefined {
  switch (command.type) {
    case 'PAY_JAIL_FINE': {
      if (state.phase !== 'WAITING_FOR_ROLL' || !isDetained(player)) return commandError(current, '当前不需要缴纳出狱或出院费用')
      const fundingError = fundStockPayment(state, player, JAIL_FINE, command.stockFunding, events)
      if (fundingError) return commandError(current, fundingError)
      player.cash -= JAIL_FINE
      leaveDetention(state, player, events, `缴纳 ${JAIL_FINE} 元后`, JAIL_FINE)
      return
    }
    case 'USE_JAIL_CARD': {
      if (state.phase !== 'WAITING_FOR_ROLL' || !isDetained(player)) return commandError(current, '当前不能使用通行许可')
      const held = player.heldCards.shift()
      if (!held) return commandError(current, '没有可用的通行许可')
      const deck = held.deck === 'chance' ? state.chanceDeck : state.fateDeck
      deck.discard.push(held.cardId)
      leaveDetention(state, player, events, '使用通行许可免费')
      return
    }
    case 'TRY_JAIL_ROLL': {
      if (state.phase !== 'WAITING_FOR_ROLL' || !isDetained(player)) return commandError(current, '当前不能尝试掷对子出狱或出院')
      const hospital = player.isInHospital
      const release = hospital ? '出院' : '出狱'
      const stay = hospital ? '住院' : '服刑'
      const dice = roll(random)
      state.lastRoll = { ...dice, isDouble: false }
      addEvent(state, events, {
        type: 'DICE_ROLLED', playerId, dice: dice.dice, dicePurpose: hospital ? 'hospital' : 'jail',
        message: `${player.name} 第 ${player.jailTurns + 1} 次尝试${release}，掷出 ${dice.dice.join(' + ')} 点${dice.isDouble ? '，对子成功' : player.jailTurns >= 2 ? '，未掷出对子，需要支付500元费用' : `，未掷出对子，继续${stay}并跳过本回合`}`,
      })
      if (dice.isDouble) {
        leaveDetention(state, player, events, '掷出对子成功')
        moveBy(state, player, dice.total, events)
        resolveLanding(state, player, random, events)
      } else {
        player.jailTurns += 1
        addEvent(state, events, { type: 'LANDING_RESOLVED', playerId, tileIndex: player.position, message: `${player.name} 第 ${player.jailTurns} 次尝试${release}未成功，${player.jailTurns >= 3 ? `需支付500元后${release}行动` : `继续${stay}，本回合跳过`}` })
        if (player.jailTurns >= 3) {
          createDebt(state, player, null, JAIL_FINE, `${release}费用`, events, { type: 'MOVE_AFTER_JAIL', dice: dice.dice })
          if (!state.pendingDebt && !player.isBankrupt) resolveLanding(state, player, random, events)
        } else advancePlayer(state, events)
      }
      return
    }

  }
}
