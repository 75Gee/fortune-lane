import { getTile, isOwnable, MAX_PROPERTY_LEVEL } from '../../board.js'
import { auctionMinimumBid, buildingSaleValue, redeemCost } from '../../economy.js'
import { canManageAssets } from '../../queries.js'
import { stockPaymentCapacity } from '../../stockMarket/quotes.js'
import { type CommandResult, type GameCommand } from '../../types.js'

import { finishAuction } from '../auction.js'
import { addEvent, commandError } from '../context.js'
import { fundStockPayment } from '../stockTrading.js'
import { transitionTo } from '../transitions.js'
import { activePlayers } from '../turns.js'

import type { CommandContext } from './context.js'

export function handleAssets({ current, state, player, playerId, events, random, now }: CommandContext, command: Extract<GameCommand, { type: 'BUY_PROPERTY' | 'SKIP_PURCHASE' | 'UPGRADE_PROPERTY' | 'SKIP_UPGRADE' | 'MORTGAGE_ASSET' | 'REDEEM_ASSET' | 'SELL_BUILDING' }>): CommandResult | undefined {
  switch (command.type) {
    case 'BUY_PROPERTY': {
      const decision = state.pendingDecision
      if (state.phase !== 'WAITING_FOR_PURCHASE' || decision?.playerId !== playerId) {
        return commandError(current, '当前没有待购买的资产')
      }
      const tile = getTile(decision.tileIndex)
      const tileState = state.tiles[tile.index]
      if (!tileState || tileState.ownerId) return commandError(current, '该资产已经被购买')
      if (!tile.price) return commandError(current, '该资产不能购买')
      const fundingError = fundStockPayment(state, player, tile.price, command.stockFunding, events)
      if (fundingError) return commandError(current, fundingError)
      player.cash -= tile.price
      tileState.ownerId = playerId
      transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
      addEvent(state, events, {
        type: 'PROPERTY_PURCHASED',
        playerId,
        tileIndex: tile.index,
        amount: tile.price,
        message: `${player.name} 以 ${tile.price} 元购买 ${tile.name}`,
      })
      return
    }
    case 'SKIP_PURCHASE': {
      if (state.phase !== 'WAITING_FOR_PURCHASE' || state.pendingDecision?.playerId !== playerId) {
        return commandError(current, '当前没有待处理的购买')
      }
      const tileIndex = state.pendingDecision.tileIndex
      const participants = activePlayers(state).filter(candidate => candidate.id !== playerId)
      const minimum = auctionMinimumBid(tileIndex)
      const bids = Object.fromEntries(participants.filter(candidate => stockPaymentCapacity(state, candidate.id) < minimum).map(candidate => [candidate.id, 0]))
      transitionTo(state, { phase: 'WAITING_FOR_AUCTION', pendingAuction: { id: `auction-${state.revision}`, tileIndex, initiatorId: playerId, participantIds: participants.map(candidate => candidate.id), bids, deadline: now + 30000 } })
      addEvent(state, events, { type: 'AUCTION_STARTED', playerId, tileIndex, message: `${player.name} 放弃购买 ${getTile(tileIndex).name}，其他玩家开始竞拍，底价为抵押金额 ${auctionMinimumBid(tileIndex)} 元` })
      finishAuction(state, random, events)
      return
    }
    case 'UPGRADE_PROPERTY': {
      const decision = state.pendingDecision
      if (state.phase !== 'WAITING_FOR_UPGRADE' || decision?.playerId !== playerId) {
        return commandError(current, '当前没有待升级的地产')
      }
      const tile = getTile(decision.tileIndex)
      const tileState = state.tiles[tile.index]
      const cost = tile.buildCost ?? 0
      if (!tileState || tileState.ownerId !== playerId || tile.kind !== 'property') {
        return commandError(current, '不能升级该地产')
      }
      if (tileState.level >= MAX_PROPERTY_LEVEL || tileState.mortgaged) return commandError(current, '该地产不能继续升级')
      const fundingError = fundStockPayment(state, player, cost, command.stockFunding, events)
      if (fundingError) return commandError(current, fundingError)
      player.cash -= cost
      tileState.level += 1
      transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
      addEvent(state, events, {
        type: 'PROPERTY_UPGRADED',
        playerId,
        tileIndex: tile.index,
        amount: cost,
        message: `${player.name} 支付 ${cost} 元，将 ${tile.name} 升至 ${tileState.level} 级`,
      })
      return
    }
    case 'SKIP_UPGRADE':
      if (state.phase !== 'WAITING_FOR_UPGRADE' || state.pendingDecision?.playerId !== playerId) {
        return commandError(current, '当前没有待处理的升级')
      }
      addEvent(state, events, { type: 'DECISION_SKIPPED', playerId, tileIndex: state.pendingDecision.tileIndex, message: `${player.name} 暂不加盖 ${getTile(state.pendingDecision.tileIndex).name}` })
      transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
      return
    case 'MORTGAGE_ASSET': {
      if (!canManageAssets(state, playerId)) return commandError(current, '当前不能抵押资产')
      const tile = getTile(command.tileIndex)
      const tileState = state.tiles[command.tileIndex]
      if (!tileState || tileState.ownerId !== playerId || !isOwnable(tile)) {
        return commandError(current, '你不拥有该资产')
      }
      if (tileState.mortgaged) return commandError(current, '该资产已经抵押')
      if (tileState.level > 0) return commandError(current, '请先出售该地产上的建筑')
      const amount = tile.mortgage ?? 0
      tileState.mortgaged = true
      player.cash += amount
      addEvent(state, events, {
        type: 'ASSET_MORTGAGED',
        playerId,
        tileIndex: tile.index,
        amount,
        message: `${player.name} 抵押 ${tile.name}，获得 ${amount} 元`,
      })
      return
    }
    case 'REDEEM_ASSET': {
      if (!canManageAssets(state, playerId)) return commandError(current, '当前不能赎回资产')
      const tile = getTile(command.tileIndex)
      const tileState = state.tiles[command.tileIndex]
      if (!tileState || tileState.ownerId !== playerId || !tileState.mortgaged) {
        return commandError(current, '该资产未被抵押')
      }
      const amount = redeemCost(tile.index)
      const fundingError = fundStockPayment(state, player, amount, command.stockFunding, events)
      if (fundingError) return commandError(current, fundingError)
      player.cash -= amount
      tileState.mortgaged = false
      addEvent(state, events, {
        type: 'ASSET_REDEEMED',
        playerId,
        tileIndex: tile.index,
        amount,
        message: `${player.name} 支付 ${amount} 元赎回 ${tile.name}，恢复收费`,
      })
      return
    }
    case 'SELL_BUILDING': {
      if (!canManageAssets(state, playerId)) return commandError(current, '当前不能出售建筑')
      const tile = getTile(command.tileIndex)
      const tileState = state.tiles[command.tileIndex]
      if (!tileState || tileState.ownerId !== playerId || tile.kind !== 'property' || tileState.level <= 0) {
        return commandError(current, '该地产没有可出售的建筑')
      }
      const amount = buildingSaleValue(tile.index)
      tileState.level -= 1
      player.cash += amount
      addEvent(state, events, {
        type: 'BUILDING_SOLD',
        playerId,
        tileIndex: tile.index,
        amount,
        message: `${player.name} 出售 ${tile.name} 的一级建筑，获得 ${amount} 元`,
      })
      return
    }

  }
}
