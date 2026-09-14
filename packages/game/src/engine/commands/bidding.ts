import { auctionMinimumBid } from '../../economy.js'
import { type CommandResult, type GameCommand } from '../../types.js'

import { finishAuction } from '../auction.js'
import { addEvent, commandError } from '../context.js'

import type { CommandContext } from './context.js'

export function handleBidding({ current, state, player, playerId, events, random, now }: CommandContext, command: Extract<GameCommand, { type: 'BID_AUCTION' | 'RESOLVE_AUCTION' }>): CommandResult | undefined {
  switch (command.type) {
    case 'BID_AUCTION': {
      const auction = state.pendingAuction
      if (state.phase !== 'WAITING_FOR_AUCTION' || !auction || auction.id !== command.auctionId || !auction.participantIds.includes(playerId)) return commandError(current, '你不能参加这场竞拍')
      if (now >= auction.deadline) return commandError(current, '竞拍已截止')
      if (Object.hasOwn(auction.bids, playerId)) return commandError(current, '已经提交，不能修改出价')
      const minimumBid = auctionMinimumBid(auction.tileIndex)
      if (!Number.isSafeInteger(command.amount) || (command.amount !== 0 && command.amount < minimumBid) || command.amount < 0 || command.amount > player.cash) return commandError(current, `出价须为不低于 ${minimumBid} 元的整数，且不能超过现金；也可放弃竞拍`)
      auction.bids[playerId] = command.amount
      addEvent(state, events, { type: 'AUCTION_BID', playerId, message: `${player.name} 已提交竞拍选择` })
      finishAuction(state, random, events)
      return
    }
    case 'RESOLVE_AUCTION': {
      const auction = state.pendingAuction
      if (!auction || state.phase !== 'WAITING_FOR_AUCTION' || auction.id !== command.auctionId || now < auction.deadline) return commandError(current, '竞拍尚未截止')
      for (const id of auction.participantIds) if (!Object.hasOwn(auction.bids, id)) auction.bids[id] = 0
      finishAuction(state, random, events)
      return
    }

  }
}
