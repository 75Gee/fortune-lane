import { cardPropertyCandidates, getCard } from '../../cards.js'
import { type CommandResult, type GameCommand } from '../../types.js'

import { addEvent, commandError } from '../context.js'
import { resolveChosenCard } from '../landing.js'
import { transitionTo } from '../transitions.js'

import type { CommandContext } from './context.js'

export function handleCards({ current, state, player, playerId, events, random, now }: CommandContext, command: Extract<GameCommand, { type: 'CHOOSE_CARD_PROPERTY' | 'CHOOSE_CARD' }>): CommandResult | undefined {
  switch (command.type) {
    case 'CHOOSE_CARD_PROPERTY': {
      const choice = state.pendingCardProperty
      if (state.phase !== 'WAITING_FOR_CARD_PROPERTY' || !choice || choice.playerId !== playerId || choice.id !== command.choiceId) return commandError(current, '当前没有待选择的城市')
      const tile = cardPropertyCandidates(state, playerId).find((candidate) => candidate.index === command.tileIndex)
      if (!tile) return commandError(current, '请选择一处可降级的城市')
      const asset = state.tiles[tile.index]!
      asset.level -= 1
      transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
      addEvent(state, events, { type: 'BUILDING_SOLD', playerId, tileIndex: tile.index, amount: 0, sourceCardId: choice.cardId, message: `${player.name} 选择 ${tile.name} 进行设施整改，降至 ${asset.level} 级，不返还建造费` })
      return
    }
    case 'CHOOSE_CARD': {
      const choice = state.pendingCardChoice
      if (state.phase !== 'WAITING_FOR_CARD_CHOICE' || choice?.playerId !== playerId || choice.id !== command.choiceId) {
        return commandError(current, '当前没有待选择的卡牌')
      }
      const cardId = choice.cardIds[command.cardIndex]
      const deck = choice.deck === 'chance' ? state.chanceDeck : state.fateDeck
      const offered = deck.order.splice(0, 3)
      if (!cardId || offered.length !== 3) return commandError(current, '卡牌状态已经变化')
      for (const unselected of offered) {
        if (unselected !== cardId) deck.order.push(unselected)
      }
      if (getCard(cardId).effect.type !== 'get_out') deck.discard.push(cardId)
      transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
      resolveChosenCard(state, player, choice.deck, cardId, random, events, choice.depth)
      const drawn = events.find((event) => event.type === 'CARD_DRAWN')
      if (drawn) drawn.cardIndex = command.cardIndex
      return
    }

  }
}
