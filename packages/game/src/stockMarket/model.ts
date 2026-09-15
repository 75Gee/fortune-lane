import type { RandomSource } from '../types.js'
import { STOCK_MODEL_PARAMETERS } from './parameters.js'
import { STOCK_IDS, type CurrentStockMarketState, type StockId, type StockMarketState, type StockModelState, type StockTrend } from './types.js'

export const STOCK_HISTORY_LENGTH = 601

function initialModelState(id: StockId, random: RandomSource): StockModelState {
  const trendDraw = random()
  return { price: 100, referencePrice: 100, jumpBias: 0,
    trend: trendDraw < .30 ? 'down' : trendDraw < .70 ? 'sideways' : 'up',
    active: random() < STOCK_MODEL_PARAMETERS[id].initialActiveProbability }
}

export function createStockMarket(playerIds: readonly string[], turn = 1, random: RandomSource = Math.random): CurrentStockMarketState {
  return {
    modelVersion: 2,
    quoteRevision: 1, updatedTurn: turn,
    stocks: Object.fromEntries(STOCK_IDS.map(id => [id, { priceCents: 10_000, previousPriceCents: 10_000, history: [{ turn, priceCents: 10_000 }] }])) as CurrentStockMarketState['stocks'],
    internal: Object.fromEntries(STOCK_IDS.map(id => [id, initialModelState(id, random)])) as CurrentStockMarketState['internal'],
    portfolios: Object.fromEntries(playerIds.map(id => [id, { positions: {}, realizedProfit: 0 }])),
  }
}

/** Upgrade only on the next price tick, never during a trade. Keep quotes,
 * balances, positions and cost basis; reconstruct R from retained history. */
function upgradeModel(market: StockMarketState, random: RandomSource): asserts market is CurrentStockMarketState {
  if (market.modelVersion === 2) return
  const internal = Object.fromEntries(STOCK_IDS.map(id => {
    const previous = market.internal[id], quote = market.stocks[id], model = STOCK_MODEL_PARAMETERS[id]
    let referencePrice = (quote.history[0]?.priceCents ?? quote.priceCents) / 100
    for (const point of quote.history.slice(1)) referencePrice = (1 - model.referenceRate) * referencePrice + model.referenceRate * (point.priceCents / 100)
    return [id, { ...previous, referencePrice, jumpBias: 0, active: random() < model.initialActiveProbability }]
  })) as CurrentStockMarketState['internal']
  Object.assign(market, { modelVersion: 2, internal })
}

function nextTrend(trend: StockTrend, persistence: number, draw: number): StockTrend {
  if (trend === 'sideways') return draw < .15 ? 'down' : draw < .85 ? 'sideways' : 'up'
  if (draw < persistence) return trend
  if (draw < persistence + .75 * (1 - persistence)) return 'sideways'
  return trend === 'up' ? 'down' : 'up'
}

/** Called only when the engine hands control to the next player. */
export function advanceStockMarket(market: StockMarketState, turn: number, random: RandomSource): void {
  if (turn <= market.updatedTurn) return
  upgradeModel(market, random)
  for (const id of STOCK_IDS) {
    const model = STOCK_MODEL_PARAMETERS[id], previous = market.internal[id], quote = market.stocks[id]
    // Six independent draws, matching the offline simulation's ordering.
    const trendDraw = random(), volatilityDraw = random(), tierDraw = random()
    const amplitudeDraw = random(), directionDraw = random(), jumpDraw = random()
    const trend = nextTrend(previous.trend, model.trendPersistence, trendDraw)
    const active = previous.active ? volatilityDraw >= .15 : volatilityDraw < .05
    const multiplier = active ? model.activeMultiplier : model.calmMultiplier
    const tier = tierDraw < model.largeFrequency * multiplier ? 2
      : tierDraw < (model.largeFrequency + model.mediumFrequency) * multiplier ? 1 : 0
    const [low, high] = model.magnitudeRanges[tier]
    const amplitude = low + amplitudeDraw * (high - low)
    const directionOfTrend = trend === 'up' ? 1 : trend === 'down' ? -1 : 0
    const upProbability = Math.min(.75, Math.max(.25, .5 + model.directionBias + model.trendStrength * directionOfTrend
      - model.reversionStrength * Math.tanh(Math.log(previous.price / previous.referencePrice) / .12) + previous.jumpBias))
    const direction = directionDraw < upProbability ? 1 : -1
    const price = previous.price * (1 + direction * amplitude)
    const referencePrice = (1 - model.referenceRate) * previous.referencePrice + model.referenceRate * price
    const techJump = id === 'tech' && tier === 2
    const jumpBias = id !== 'tech' ? 0 : techJump ? (jumpDraw < .40 ? .08 * direction : jumpDraw < .70 ? -.08 * direction : 0) : .7 * previous.jumpBias
    market.internal[id] = { price, referencePrice, trend, jumpBias, active: active || techJump }
    quote.previousPriceCents = quote.priceCents
    // Only the public quote is rounded. P and R keep their original precision.
    quote.priceCents = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.round(price * 100)))
    quote.history.push({ turn, priceCents: quote.priceCents })
    if (quote.history.length > STOCK_HISTORY_LENGTH) quote.history.splice(0, quote.history.length - STOCK_HISTORY_LENGTH)
  }
  market.updatedTurn = turn
  market.quoteRevision += 1
}
