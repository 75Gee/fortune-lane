import { liquidationQuote } from '../../queries.js'
import type { CommandResult, GameCommand } from '../../types.js'
import { commandError } from '../context.js'
import { settleDebt } from '../landing.js'
import { handleAssets } from './assets.js'
import type { CommandContext } from './context.js'
import { handleStocks } from './stocks.js'

export function handleLiquidation(context: CommandContext, command: Extract<GameCommand, { type: 'LIQUIDATE_ASSETS' }>): CommandResult | undefined {
  const { current, state, player, playerId, events, random } = context
  const quote = liquidationQuote(state, playerId, command.selections, command.stockSales, command.quoteRevision)
  if (!quote.allowed) return commandError(current, quote.reason!)
  // Validate the whole plan before touching the command's cloned state. Any
  // rejection returns the original state, including statistics and event log.
  for (const sale of command.stockSales ?? []) {
    const rejected = handleStocks(context, { type: 'TRADE_STOCK', side: 'sell', ...sale, quoteRevision: command.quoteRevision! })
    if (rejected) return rejected
  }
  for (const { tileIndex, sellLevels, mortgage } of command.selections) {
    for (let level = 0; level < sellLevels; level += 1) {
      const rejected = handleAssets(context, { type: 'SELL_BUILDING', tileIndex })
      if (rejected) return rejected
    }
    if (mortgage) {
      const rejected = handleAssets(context, { type: 'MORTGAGE_ASSET', tileIndex })
      if (rejected) return rejected
    }
  }
  const error = settleDebt(state, player, random, events)
  if (error) return commandError(current, error)
}
