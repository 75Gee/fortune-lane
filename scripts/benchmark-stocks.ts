import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { advanceStockMarket, createStockMarket, maximumStockQuantity, stockCashValue, STOCKS, STOCK_IDS, type StockId } from '../packages/game/src/stockMarket/index.js'

const updates = Number(process.argv[3] ?? 70), runs = Number(process.argv[4] ?? 50_000), firstSeed = Number(process.argv[5] ?? 2026291700)
assert.ok([updates, runs, firstSeed].every(Number.isSafeInteger) && updates > 0 && runs > 1)
const modelVersion = createStockMarket([], 1, () => .5).modelVersion
const output = resolve(process.argv[2] ?? fileURLToPath(new URL('../docs/previews/stock-v8/benchmark-50000/', import.meta.url))) + '/'
mkdirSync(output, { recursive: true })
function seeded(seed: number) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}
function quantile(sorted: number[], p: number) {
  const at = (sorted.length - 1) * p, lo = Math.floor(at), hi = Math.ceil(at)
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo)
}
function statistics(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b), mean = sorted.reduce((a, b) => a + b, 0) / runs
  const variance = sorted.reduce((s, value) => s + (value - mean) ** 2, 0) / (runs - 1), margin = 1.96 * Math.sqrt(variance / runs)
  return { meanReturnPercent: mean, meanReturnCI95: [mean - margin, mean + margin], medianReturnPercent: quantile(sorted, .5),
    outcomeRange90: [quantile(sorted, .05), quantile(sorted, .95)], positivePercent: sorted.filter(v => v > 0).length / runs * 100,
    doubledPercent: sorted.filter(v => v >= 100).length / runs * 100, halvedPercent: sorted.filter(v => v <= -50).length / runs * 100,
    observedRange: [sorted[0], sorted.at(-1)], returnStdDevPercent: Math.sqrt(variance) }
}
const ids = [...STOCK_IDS, 'equal_weight'] as const
const samples = Object.fromEntries(ids.map(id => [id, { returns: [] as number[], drawdowns: [] as number[], volatility: 0, lowSum: 0, highSum: 0 }])) as Record<typeof ids[number], { returns: number[]; drawdowns: number[]; volatility: number; lowSum: number; highSum: number }>
const strategies = ['hold', 'band_95_105', 'momentum_3', 'contrarian_3', 'contrarian_1', 'ma_5_20', 'project_good_news'] as const
type Strategy = typeof strategies[number]
const strategySamples = Object.fromEntries(STOCK_IDS.map(id => [id, Object.fromEntries(strategies.map(strategy => [strategy, {
  returns: [] as number[], excess: [] as number[], drawdowns: [] as number[], trades: 0, exposure: 0,
}]))])) as Record<StockId, Record<Strategy, { returns: number[]; excess: number[]; drawdowns: number[]; trades: number; exposure: number }>>

// Decisions at quote t use only data through t, then experience t -> t+1.
// All strategies use actual public cent quotes and the engine's integer-share,
// buy-ceil/sell-floor settlement. No added fee, leverage, borrowing or shorting.
function tradePath(prices: number[], probabilities: (number | null)[], strategy: Strategy) {
  let cash = 10_000, shares = 0, trades = 0, exposure = 0, peak = cash, drawdown = 0
  for (let t = 0; t < updates; t++) {
    const price = prices[t]!
    let invested = shares > 0
    if (strategy === 'hold') invested = true
    if (strategy === 'band_95_105') { if (price < 9500) invested = true; if (price > 10500) invested = false }
    if (strategy === 'momentum_3' || strategy === 'contrarian_3') invested = t >= 3 && (strategy === 'momentum_3' ? price > prices[t - 3]! : price < prices[t - 3]!)
    if (strategy === 'contrarian_1') invested = t >= 1 && price < prices[t - 1]!
    if (strategy === 'ma_5_20') invested = t >= 19 && prices.slice(t - 4, t + 1).reduce((a, b) => a + b, 0) / 5 > prices.slice(t - 19, t + 1).reduce((a, b) => a + b, 0) / 20
    if (strategy === 'project_good_news') invested = (probabilities[t] ?? 0) > .5
    if (invested && shares === 0) {
      shares = maximumStockQuantity(cash, price)
      if (shares > 0) { cash -= stockCashValue(price, shares, true); trades++ }
    } else if (!invested && shares > 0) {
      cash += stockCashValue(price, shares); shares = 0; trades++
    }
    if (shares > 0) exposure++
    // Mark liquidatable wealth after each trade and after the next market move.
    for (const quote of [price, prices[t + 1]!]) {
      const wealth = cash + stockCashValue(quote, shares)
      peak = Math.max(peak, wealth); drawdown = Math.max(drawdown, 1 - wealth / peak)
    }
  }
  if (shares > 0) { cash += stockCashValue(prices[updates]!, shares); trades++ }
  assert.ok(Number.isSafeInteger(cash) && cash >= 0)
  return { returnPercent: (cash / 10_000 - 1) * 100, drawdown: drawdown * 100, trades, exposure: exposure / updates * 100 }
}
const rows = ['run,seed,civic_return_pct,transit_return_pct,travel_return_pct,tech_return_pct,equal_weight_return_pct']
for (let run = 0; run < runs; run++) {
  const random = seeded(firstSeed + run), market = createStockMarket(['sample'], 1, random)
  const probabilities: (number | null)[] = [null]
  for (let step = 0; step < updates; step++) {
    advanceStockMarket(market, market.nextUpdateTurn, random)
    probabilities.push(market.project?.probability ?? null)
  }
  assert.equal(market.quoteRevision, updates + 1); assert.equal(market.updatedTurn, updates * 5 + 1)
  const paths = STOCK_IDS.map(id => market.stocks[id].history.map(p => p.priceCents))
  paths.push(paths[0]!.map((_, t) => paths.reduce((sum, path) => sum + path[t]!, 0) / 4))
  const terminalReturns: number[] = []
  ids.forEach((id, index) => {
    const prices = paths[index]!, returns = prices.slice(1).map((p, t) => p / prices[t]! - 1)
    const result = (prices.at(-1)! / 10_000 - 1) * 100, meanStep = returns.reduce((a, b) => a + b, 0) / updates
    let peak = 10_000, drawdown = 0
    for (const price of prices) { assert.ok(Number.isFinite(price) && price > 0); peak = Math.max(peak, price); drawdown = Math.max(drawdown, 1 - price / peak) }
    samples[id].returns.push(result); samples[id].drawdowns.push(drawdown * 100)
    samples[id].lowSum += Math.min(...prices) / 100; samples[id].highSum += Math.max(...prices) / 100
    samples[id].volatility += Math.sqrt(returns.reduce((s, r) => s + (r - meanStep) ** 2, 0) / (updates - 1)) * 100
    terminalReturns.push(result)
    if (id === 'equal_weight') return
    for (const strategy of strategies) {
      if (strategy === 'project_good_news' && id !== 'tech') continue
      const trial = tradePath(prices, probabilities, strategy), sample = strategySamples[id][strategy]
      sample.returns.push(trial.returnPercent); sample.excess.push(trial.returnPercent - result); sample.drawdowns.push(trial.drawdown)
      sample.trades += trial.trades; sample.exposure += trial.exposure
    }
  })
  rows.push(`${run + 1},${firstSeed + run},${terminalReturns.map(r => r.toFixed(6)).join(',')}`)
  if ((run + 1) % 5000 === 0) console.log(`Completed ${run + 1}/${runs} markets`)
}
const sourceHashes = Object.fromEntries(['model.ts', 'parameters.ts', 'portfolio.ts'].map(name => [name, createHash('sha256').update(readFileSync(new URL(`../packages/game/src/stockMarket/${name}`, import.meta.url))).digest('hex')]))
const result = { modelVersion, runsPerStock: runs, updatesPerPath: updates, playerHandoffs: updates * 5, startPrice: 100, random: 'Mulberry32', firstSeed, lastSeed: firstSeed + runs - 1, sourceHashes,
  methodology: '50k is the final default; CLI may override for disjoint development runs. Each market generates four correlated paths. Buy and hold uses 100 shares per stock (10000 yuan); equal weight buys 100 of each (40000 yuan), no rebalancing. Strategies each start with 10000 yuan, trade whole shares all-in/all-out using actual integer settlement, no proportional fees. Signals observe quote t and trade at t, before update t+1. No future data, no hidden states. All sell at final quote. Projects use only currently published probability. 95/105 holds its position between strict thresholds; momentum means 3-period cumulative gain; moving averages wait for 20 quotes. No property cash needs or game-winning utility included.',
  confidenceMethod: 'Mean ± 1.96 sample standard error; excess is paired against hold on the same path. These intervals do not describe individual outcomes or correct for multiple strategy comparisons.',
  statistics: ids.map(id => ({ id, name: STOCKS.find(stock => stock.id === id)?.name ?? '四股等额组合', ...statistics(samples[id].returns),
    meanPathLowPrice: samples[id].lowSum / runs, meanPathHighPrice: samples[id].highSum / runs,
    meanPerPeriodVolatilityPercent: samples[id].volatility / runs, medianMaxDrawdownPercent: quantile(samples[id].drawdowns.sort((a, b) => a - b), .5) })),
  strategies: STOCK_IDS.flatMap(id => strategies.filter(strategy => strategy !== 'project_good_news' || id === 'tech').map(strategy => {
    const sample = strategySamples[id][strategy]
    return { id, strategy, ...statistics(sample.returns), pairedExcessOverHold: statistics(sample.excess),
      medianMaxDrawdownPercent: quantile(sample.drawdowns.sort((a, b) => a - b), .5), meanTrades: sample.trades / runs, meanExposurePercent: sample.exposure / runs }
  })) }
writeFileSync(output + 'summary.json', JSON.stringify(result, null, 2) + '\n')
writeFileSync(output + 'terminal-returns.csv', rows.join('\n') + '\n')
console.log(JSON.stringify({ statistics: result.statistics, strategies: result.strategies.map(s => ({ id: s.id, strategy: s.strategy, mean: s.meanReturnPercent, median: s.medianReturnPercent, positive: s.positivePercent, excess: s.pairedExcessOverHold.meanReturnPercent })) }, null, 2))
