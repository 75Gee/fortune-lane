import { getTile } from '../board.js'
import { auctionMinimumBid } from '../economy.js'
import { stockPaymentQuote } from '../stockMarket/quotes.js'
import { stockCashValue } from '../stockMarket/portfolio.js'
import { type GameEvent, type GameState, type RandomSource } from '../types.js'

import { addEvent, playerById } from './context.js'
import { transitionTo } from './transitions.js'
import { executeStockTrade } from './stockTrading.js'

export function finishAuction(state: GameState, random: RandomSource, events: GameEvent[]): void {
  const auction = state.pendingAuction
  if (!auction || auction.participantIds.some((id) => !Object.hasOwn(auction.bids, id))) return
  const minimumBid = auctionMinimumBid(auction.tileIndex)
  const eligible = auction.participantIds.filter((id) => {
    const player = playerById(state, id)
    return !player.isBankrupt && auction.bids[id]! >= minimumBid && stockPaymentQuote(state, id, auction.bids[id]!).allowed
  })
  const highest = Math.max(0, ...eligible.map((id) => auction.bids[id]!))
  const tied = eligible.filter((id) => auction.bids[id] === highest)
  const winnerId = tied[Math.floor(random() * tied.length)]
  const tile = getTile(auction.tileIndex)
  if (winnerId) {
    const winner = playerById(state, winnerId)
    // Bidding commits liquid funds; only the winner converts the cash shortfall.
    // Quotes cannot advance while an auction is pending.
    const payment = stockPaymentQuote(state, winnerId, highest)
    for (const sale of payment.stockFunding?.stockSales ?? []) executeStockTrade(state, winner, sale.stockId, 'sell', sale.quantity,
      stockCashValue(state.stockMarket!.stocks[sale.stockId].priceCents, sale.quantity), events)
    winner.cash -= highest
    state.tiles[tile.index] = { ownerId: winnerId, level: 0, mortgaged: false }
    addEvent(state, events, { type: 'AUCTION_RESOLVED', playerId: winnerId, tileIndex: tile.index, amount: highest, message: `${winner.name} 以 ${highest} 元竞得 ${tile.name}，款项支付银行${tied.length > 1 ? '（最高价相同，随机抽签）' : ''}` })
  } else addEvent(state, events, { type: 'AUCTION_RESOLVED', tileIndex: tile.index, message: `${tile.name} 无有效报价达到 ${minimumBid} 元底价，流拍，继续归银行所有` })
  transitionTo(state, { phase: 'WAITING_FOR_END_TURN' })
}
