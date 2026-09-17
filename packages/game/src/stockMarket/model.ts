import type { RandomSource } from '../types.js'
import { MARKET_NOISE, STOCK_MODEL_PARAMETERS as PARAMETERS, STOCK_UPDATE_INTERVAL } from './parameters.js'
import { STOCK_IDS, type CurrentStockMarketState, type StockId, type StockMarketState, type SentimentStockState } from './types.js'

export const STOCK_HISTORY_LENGTH = 601
const clipPrice = (price: number) => Math.min((Number.MAX_SAFE_INTEGER - 100) / 100, Math.max(.01, price))
const normal = (random: RandomSource) => Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(2 * Math.PI * random())
const integer = (random: RandomSource, low: number, high: number) => low + Math.min(high - low, Math.floor(random() * (high - low + 1)))
function initialInternal(prices: Record<StockId, number>, turn: number, random: RandomSource): CurrentStockMarketState['internal'] {
  const base = (id: StockId) => ({ price: prices[id], fundamental: prices[id], sentiment: 0, sentimentVariance: 0 })
  return {
    civic: base('civic'),
    transit: { ...base('transit'), cycle: [0, 0], cycleVariance: 0, period: 24 + 12 * random() },
    travel: { ...base('travel'), trend: 0, trendVariance: 0, covariance: 0 },
    tech: { price: prices.tech, fundamental: prices.tech, projectValue: 1, project: null, nextProjectTurn: turn + integer(random, 6, 10) * STOCK_UPDATE_INTERVAL },
  }
}
export function createStockMarket(playerIds: readonly string[], turn = 1, random: RandomSource = Math.random): CurrentStockMarketState {
  return {
    modelVersion: 8, nextUpdateTurn: turn + STOCK_UPDATE_INTERVAL,
    quoteRevision: 1, updatedTurn: turn, project: null, projectNews: null,
    stocks: Object.fromEntries(STOCK_IDS.map(id => [id, { priceCents: 10_000, previousPriceCents: 10_000, history: [{ turn, priceCents: 10_000 }] }])) as CurrentStockMarketState['stocks'],
    internal: initialInternal({ civic: 100, transit: 100, travel: 100, tech: 100 }, turn, random),
    portfolios: Object.fromEntries(playerIds.map(id => [id, { positions: {}, realizedProfit: 0 }])),
  }
}
/** Preserve existing quotes, high precision prices and holdings on migration. */
function upgradeModel(market: StockMarketState, random: RandomSource): asserts market is CurrentStockMarketState {
  if (market.modelVersion === 8) return
  const prices = Object.fromEntries(STOCK_IDS.map(id => [id, market.internal[id].price])) as Record<StockId, number>
  Object.assign(market, { modelVersion: 8, nextUpdateTurn: market.updatedTurn + STOCK_UPDATE_INTERVAL,
    internal: initialInternal(prices, market.updatedTurn, random), project: null, projectNews: null })
}
function sentiment(state: SentimentStockState, memory: number, noise: number, random: RandomSource): void {
  state.sentiment = memory * state.sentiment + noise * normal(random)
  state.sentimentVariance = memory ** 2 * state.sentimentVariance + noise ** 2
}
function updateProject(market: CurrentStockMarketState, turn: number, random: RandomSource): void {
  const state = market.internal.tech
  if (!state.project && turn >= state.nextProjectTurn) {
    const duration = integer(random, 7, 9)
    state.project = { age: 0, duration, probability: .5, exposure: random() < .25 ? .26 : .16,
      revealTurn: turn + (duration - 1) * STOCK_UPDATE_INTERVAL }
    market.projectNews = { turn, kind: 'start', probability: .5 }
  }
  const project = state.project
  if (project) {
    project.age += 1
    // Both clues and final outcomes are priced at their conditional expectation.
    // A higher success probability is already reflected in the published quote.
    if (project.age === 3 || project.age === 5) {
      const before = 1 + project.exposure * (2 * project.probability - 1)
      project.probability += random() < .5 ? .12 : -.12
      state.projectValue *= (1 + project.exposure * (2 * project.probability - 1)) / before
      market.projectNews = { turn, kind: 'update', probability: project.probability }
    }
    if (project.age >= project.duration) {
      const success = random() < project.probability
      state.projectValue *= (1 + (success ? project.exposure : -project.exposure))
        / (1 + project.exposure * (2 * project.probability - 1))
      market.projectNews = { turn, kind: success ? 'success' : 'failure', probability: project.probability }
      state.nextProjectTurn = turn + integer(random, 8, 12) * STOCK_UPDATE_INTERVAL
      state.project = null
    }
  }
  market.project = state.project ? { probability: state.project.probability, exposure: state.project.exposure, revealTurn: state.project.revealTurn } : null
  // Fold completed events into fundamental value; avoid unbounded accumulated
  // project multipliers in long-lived games. This does not change the price.
  if (!state.project) {
    state.fundamental = clipPrice(state.fundamental * state.projectValue)
    state.projectValue = 1
  }
  state.price = clipPrice(state.fundamental * state.projectValue)
}
function tick(market: CurrentStockMarketState, turn: number, random: RandomSource): void {
  const commonShock = MARKET_NOISE * normal(random)
  for (const id of STOCK_IDS) {
    const p = PARAMETERS[id], state = market.internal[id]
    const variance = (p.beta * MARKET_NOISE) ** 2 + p.noise ** 2
    state.fundamental = clipPrice(state.fundamental * Math.exp(p.growth - variance / 2 + p.beta * commonShock + p.noise * normal(random)))
  }
  const civic = market.internal.civic, cp = PARAMETERS.civic
  sentiment(civic, cp.sentimentMemory, cp.sentimentNoise, random)
  civic.price = clipPrice(civic.fundamental * Math.exp(civic.sentiment - civic.sentimentVariance / 2))

  const transit = market.internal.transit, tp = PARAMETERS.transit
  // The oscillator is continuously perturbed; its period wanders instead of
  // restarting a preset wave on a fixed phase boundary.
  transit.period = .9 * transit.period + .1 * (24 + 12 * random())
  const angle = 2 * Math.PI / transit.period, [a, b] = transit.cycle
  transit.cycle = [tp.cycleMemory * (Math.cos(angle) * a - Math.sin(angle) * b) + tp.cycleNoise * normal(random),
    tp.cycleMemory * (Math.sin(angle) * a + Math.cos(angle) * b) + tp.cycleNoise * normal(random)]
  transit.cycleVariance = tp.cycleMemory ** 2 * transit.cycleVariance + tp.cycleNoise ** 2
  sentiment(transit, tp.sentimentMemory, tp.sentimentNoise, random)
  transit.price = clipPrice(transit.fundamental * Math.exp(transit.cycle[0] + transit.sentiment - (transit.cycleVariance + transit.sentimentVariance) / 2))

  const travel = market.internal.travel, gp = PARAMETERS.travel
  travel.trend = gp.trendMemory * travel.trend + gp.trendNoise * normal(random)
  travel.sentiment = gp.sentimentMemory * travel.sentiment + gp.trendImpact * travel.trend + gp.sentimentNoise * normal(random)
  const trendVariance = gp.trendMemory ** 2 * travel.trendVariance + gp.trendNoise ** 2
  const covariance = gp.sentimentMemory * gp.trendMemory * travel.covariance + gp.trendImpact * trendVariance
  travel.sentimentVariance = gp.sentimentMemory ** 2 * travel.sentimentVariance + gp.trendImpact ** 2 * trendVariance
    + 2 * gp.sentimentMemory * gp.trendImpact * gp.trendMemory * travel.covariance + gp.sentimentNoise ** 2
  travel.trendVariance = trendVariance; travel.covariance = covariance
  travel.price = clipPrice(travel.fundamental * Math.exp(travel.sentiment - travel.sentimentVariance / 2))
  updateProject(market, turn, random)

  for (const id of STOCK_IDS) {
    const quote = market.stocks[id]
    quote.previousPriceCents = quote.priceCents
    quote.priceCents = Math.max(1, Math.round(market.internal[id].price * 100))
    quote.history.push({ turn, priceCents: quote.priceCents })
    if (quote.history.length > STOCK_HISTORY_LENGTH) quote.history.splice(0, quote.history.length - STOCK_HISTORY_LENGTH)
  }
  market.updatedTurn = turn
  market.quoteRevision += 1
  market.nextUpdateTurn = turn + STOCK_UPDATE_INTERVAL
}
/** Only player handoffs advance the clock; trading never advances quotes. */
export function advanceStockMarket(market: StockMarketState, turn: number, random: RandomSource): void {
  if (turn <= market.updatedTurn) return
  upgradeModel(market, random)
  while (turn >= market.nextUpdateTurn) tick(market, market.nextUpdateTurn, random)
}
