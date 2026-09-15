import { stockTradeQuote } from '../../stockMarket/quotes.js'
import type { StockTrade } from '../../stockMarket/types.js'
import type { CommandResult } from '../../types.js'
import { commandError } from '../context.js'
import { executeStockTrade } from '../stockTrading.js'
import type { CommandContext } from './context.js'

export function handleStocks({ current, state, player, playerId, events }: CommandContext, command: StockTrade): CommandResult | undefined {
  const quote = stockTradeQuote(state, playerId, command)
  if (!quote.allowed) return commandError(current, quote.reason!)
  executeStockTrade(state, player, command.stockId, command.side, command.quantity, quote.amount, events)
}
