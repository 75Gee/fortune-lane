import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { advanceStockMarket, createStockMarket, STOCKS, STOCK_IDS } from '../packages/game/src/stockMarket/index.js'

const output = resolve(process.argv[2] ?? fileURLToPath(new URL('../docs/previews/stock-v8', import.meta.url)))
const updates = Number(process.argv[3] ?? 70)
assert.ok(Number.isSafeInteger(updates) && updates > 0)
const modelVersion = createStockMarket([], 1, () => .5).modelVersion
mkdirSync(output, { recursive: true })
function seeded(seed: number) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}
// Five independent full markets, with the same fixed seed list as v3.
// Fixed in advance, no path selection, smoothing or terminal-price fitting.
const runs = Array.from({ length: 5 }, (_, index) => {
  const seed = 2026091601 + index, random = seeded(seed)
  const market = createStockMarket(['sample'], 1, random)
  const intervals: number[] = []
  const events: { turn: number; kind: string }[] = []
  for (let update = 0; update < updates; update++) {
    const previousTurn = market.updatedTurn, previousRevision = market.quoteRevision
    const target = market.nextUpdateTurn
    for (let turn = previousTurn + 1; turn < target; turn++) {
      advanceStockMarket(market, turn, () => { throw new Error('Waiting turns must not consume random draws') })
      assert.equal(market.quoteRevision, previousRevision)
    }
    advanceStockMarket(market, target, random)
    if (market.projectNews?.turn === target) events.push({ turn: target, kind: market.projectNews.kind })
    intervals.push(market.updatedTurn - previousTurn)
    assert.equal(intervals.at(-1), 5)
    assert.equal(market.quoteRevision, previousRevision + 1)
  }
  for (const id of STOCK_IDS) {
    assert.equal(market.stocks[id].history.length, updates + 1)
    assert.ok(market.stocks[id].history.every(p => Number.isSafeInteger(p.priceCents) && p.priceCents > 0))
  }
  return { run: index + 1, seed, intervals, events, stocks: market.stocks }
})
const summaries = STOCKS.map(stock => ({ ...stock, runs: runs.map(run => {
  const points = run.stocks[stock.id].history, prices = points.map(p => p.priceCents / 100)
  const changes = prices.slice(1).map((price, i) => price / prices[i]! - 1)
  let peak = prices[0]!, drawdown = 0
  for (const price of prices) { peak = Math.max(peak, price); drawdown = Math.min(drawdown, price / peak - 1) }
  return { run: run.run, seed: run.seed, finalTurn: points.at(-1)!.turn, endPrice: prices.at(-1), returnPercent: (prices.at(-1)! / 100 - 1) * 100, minPrice: Math.min(...prices), maxPrice: Math.max(...prices), maxDrawdownPercent: drawdown * 100, meanAbsoluteChangePercent: changes.reduce((s, r) => s + Math.abs(r), 0) / changes.length * 100, maxAbsoluteChangePercent: Math.max(...changes.map(Math.abs)) * 100 }
}) }))
writeFileSync(resolve(output, 'simulation.json'), JSON.stringify({ modelVersion, updateInterval: 5, updates, runs, summaries }, null, 2))
writeFileSync(resolve(output, 'prices.csv'), 'stock,run,seed,update,player_turn,price\n' + STOCK_IDS.flatMap(id => runs.flatMap(run => run.stocks[id].history.map((p, index) => `${id},${run.run},${run.seed},${index},${p.turn},${(p.priceCents / 100).toFixed(2)}`))).join('\n') + '\n')
console.log(JSON.stringify(summaries.map(s => ({ stock: s.name, returns: s.runs.map(r => +r.returnPercent.toFixed(1)), meanAbsoluteChange: +(s.runs.reduce((sum, r) => sum + r.meanAbsoluteChangePercent, 0) / 5).toFixed(2) })), null, 2))
console.log(output)
