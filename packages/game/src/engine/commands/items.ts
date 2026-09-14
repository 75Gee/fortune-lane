import { getTile } from '../../board.js'
import { itemPlacementBlockReason, ITEMS, itemUseBlockReason, TURTLE_ROLLS } from '../../items.js'
import { type CommandResult, type GameCommand, type ItemKind } from '../../types.js'

import { addEvent, commandError } from '../context.js'
import { resolveLanding } from '../landing.js'
import { moveBy } from '../movement.js'

import type { CommandContext } from './context.js'

export function handleItems({ current, state, player, playerId, events, random, now }: CommandContext, command: Extract<GameCommand, { type: 'USE_TURTLE' | 'USE_CHOSEN_DIE' | 'PLACE_ROADBLOCK' | 'PLACE_BOMB' }>): CommandResult | undefined {
  switch (command.type) {
    case 'USE_TURTLE':
    case 'USE_CHOSEN_DIE':
    case 'PLACE_ROADBLOCK':
    case 'PLACE_BOMB': {
      const blocked = itemUseBlockReason(state, playerId)
      if (blocked) return commandError(current, blocked)
      const kinds = { USE_TURTLE: 'turtle', USE_CHOSEN_DIE: 'chosen-die', PLACE_ROADBLOCK: 'roadblock', PLACE_BOMB: 'bomb' } as const
      const kind: ItemKind = kinds[command.type]
      const index = player.items.indexOf(kind)
      if (index < 0) return commandError(current, '你没有这张道具卡')
      if (command.type === 'USE_TURTLE') {
        const target = state.players.find((entry) => entry.id === command.targetPlayerId && !entry.isBankrupt)
        if (!target) return commandError(current, '请选择仍在游戏中的玩家')
        if (target.turtleRollsRemaining > 0) return commandError(current, '这位玩家已有乌龟效果，无需重复使用')
        target.turtleRollsRemaining = TURTLE_ROLLS
        addEvent(state, events, { type: 'ITEM_USED', playerId, targetPlayerId: target.id, itemKind: kind, message: `${player.name} 对 ${target.name} 使用乌龟卡，目标接下来的 ${TURTLE_ROLLS} 次常规掷骰只能掷一颗骰子` })
      } else if (command.type === 'USE_CHOSEN_DIE') {
        if (!Number.isInteger(command.value) || command.value < 1 || command.value > 6) return commandError(current, '请选择 1–6 点')
        state.extraMove = { returnPhase: state.phase === 'WAITING_FOR_ROLL' ? 'WAITING_FOR_ROLL' : 'WAITING_FOR_END_TURN', total: command.value }
        addEvent(state, events, { type: 'ITEM_USED', playerId, itemKind: kind, message: `${player.name} 使用自选骰子，指定 ${command.value} 点，获得一次额外移动` })
        addEvent(state, events, { type: 'DICE_ROLLED', playerId, dice: [command.value], dicePurpose: 'chosen', message: `${player.name} 的自选骰子掷出 ${command.value} 点，不消耗原本的行动机会` })
        moveBy(state, player, command.value, events)
        resolveLanding(state, player, random, events)
      } else {
        const tileIndex = command.tileIndex
        const placementBlocked = itemPlacementBlockReason(state, playerId, tileIndex)
        if (placementBlocked) return commandError(current, placementBlocked)
        const hazardKind = command.type === 'PLACE_BOMB' ? 'bomb' : 'roadblock'
        const hazard = { id: `hazard-${state.revision}`, kind: hazardKind, tileIndex, ownerId: playerId } as const
        state.hazards.push(hazard)
        addEvent(state, events, { type: 'ITEM_USED', playerId, tileIndex, itemKind: kind, hazard: { ...hazard }, message: `${player.name} 在 ${getTile(tileIndex).name} 放置${ITEMS[kind].name}，下一位经过或到达的玩家会触发` })
      }
      player.items.splice(index, 1)
      state.itemUsedThisTurn = true
      return
    }

  }
}
