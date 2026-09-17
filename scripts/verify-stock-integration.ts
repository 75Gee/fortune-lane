import assert from 'node:assert/strict'
import { applyCommand, createGame } from '../packages/game/src/engine.js'
import { getTileById, MAX_PROPERTY_LEVEL } from '../packages/game/src/board.js'
import { resolveLanding } from '../packages/game/src/engine/landing.js'
import { assetActionQuote } from '../packages/game/src/queries.js'
import { advanceStockMarket, createStockMarket, suggestStockSales } from '../packages/game/src/stockMarket/index.js'
import { decisionKey, timeoutCommand } from '../apps/server/src/turnPolicy.js'
import { publicGameState } from '../packages/protocol/src/publicState.js'
import type { StockMarketState } from '../packages/game/src/stockMarket/types.js'

const tile = getTileById('曼谷')
function fixture() {
  const game = createGame([{ id: 'a', name: '甲', token: 'camera' }, { id: 'b', name: '乙', token: 'train' }], () => .5)
  const player = game.players.find(p => p.id === 'a')!
  game.currentPlayerId = player.id
  player.position = tile.index; player.cash = 100
  game.tiles[tile.index] = { ownerId: player.id, level: 1, mortgaged: false }
  game.stockMarket!.portfolios.a!.positions = { civic: { quantity: 2, costBasis: 200 }, transit: { quantity: 1, costBasis: 100 } }
  return game
}
let game = fixture()
resolveLanding(game, game.players.find(p => p.id === 'a')!, () => .5, [])
assert.equal(game.phase, 'WAITING_FOR_UPGRADE', 'Combined cash and shares exactly cover upgrade')
assert.equal(assetActionQuote(game, 'a', tile.index, 'UPGRADE_PROPERTY').allowed, false)
const key = decisionKey(game), quoteRevision = game.stockMarket!.quoteRevision, initialTurn = game.turnNumber
for (const sale of suggestStockSales(game.stockMarket, 'a', 300)) {
  const result = applyCommand(game, 'a', { type: 'TRADE_STOCK', side: 'sell', ...sale, quoteRevision }, () => .5)
  assert.equal(result.error, undefined)
  game = result.state
  assert.equal(decisionKey(game), key, 'Selling preserves the upgrade decision/deadline key')
  assert.equal(game.turnNumber, initialTurn)
  assert.equal(game.stockMarket!.quoteRevision, quoteRevision)
}
assert.equal(game.players.find(p => p.id === 'a')!.cash, 400)
assert.equal(assetActionQuote(game, 'a', tile.index, 'UPGRADE_PROPERTY').allowed, true)
const upgraded = applyCommand(game, 'a', { type: 'UPGRADE_PROPERTY' }, () => .5)
assert.equal(upgraded.error, undefined)
assert.equal(upgraded.state.tiles[tile.index]!.level, 2)
assert.equal(upgraded.state.players.find(p => p.id === 'a')!.cash, 0)

for (const condition of ['insufficient', 'mortgaged', 'max-level', 'no-market'] as const) {
  const state = fixture()
  if (condition === 'insufficient') state.stockMarket!.stocks.transit.priceCents = 9999 // 99 yuan after rounding
  if (condition === 'mortgaged') state.tiles[tile.index]!.mortgaged = true
  if (condition === 'max-level') state.tiles[tile.index]!.level = MAX_PROPERTY_LEVEL
  if (condition === 'no-market') delete state.stockMarket
  resolveLanding(state, state.players.find(p => p.id === 'a')!, () => .5, [])
  assert.equal(state.phase, 'WAITING_FOR_END_TURN', condition)
}
const timeout = fixture()
resolveLanding(timeout, timeout.players.find(p => p.id === 'a')!, () => .5, [])
assert.deepEqual(timeoutCommand(timeout, true), { type: 'SKIP_UPGRADE' }, 'Timeout never sells shares for an optional upgrade')
const rejected = applyCommand(timeout, 'a', { type: 'TRADE_STOCK', stockId: 'civic', side: 'sell', quantity: 1, quoteRevision: -1 })
assert.ok(rejected.error)
assert.deepEqual(rejected.state, timeout)

const old = createStockMarket(['a'], 1, () => .5)
old.portfolios.a!.positions.civic = { quantity: 7, costBasis: 700 }
const legacy = { ...old, modelVersion: 2 } as unknown as StockMarketState
const holdings = structuredClone(legacy.portfolios)
advanceStockMarket(legacy, 2, () => .5)
assert.equal(legacy.modelVersion, 8)
assert.equal(legacy.quoteRevision, 1)
assert.deepEqual(legacy.portfolios, holdings)
advanceStockMarket(legacy, 6, () => .5)
assert.equal(legacy.quoteRevision, 2)
assert.deepEqual(legacy.portfolios, holdings)
const serialized = publicGameState({ ...fixture(), stockMarket: legacy }, 'a').stockMarket!
assert.ok(!('internal' in serialized) && !('nextUpdateTurn' in serialized))
console.log('PASS: upgrade funding, multi-stock sales, exact cash boundary, integer rounding, blocked assets, legacy state, timeout, stale quotes and private model fields')

// Fixed schedule, missed-turn catchup, and idempotent calls.
const schedule = createStockMarket(['a'], 1, () => .5)
assert.equal(schedule.nextUpdateTurn, 6)
advanceStockMarket(schedule, 21, () => .5)
assert.deepEqual(schedule.stocks.civic.history.map(p => p.turn), [1, 6, 11, 16, 21])
advanceStockMarket(schedule, 21, () => { throw new Error('Duplicate update') })
assert.equal(schedule.quoteRevision, 5)
// All retired versions retain holdings, public history and high precision prices.
for (const version of [1, 2, 3, 4, 5, 6, 7] as const) {
  const current = createStockMarket(['a'], 11, () => .5)
  current.internal.civic.price = 91.2345
  current.stocks.civic.priceCents = 9123
  current.portfolios.a!.positions.civic = { quantity: 9, costBasis: 900 }
  const retired = { ...current, modelVersion: version } as unknown as StockMarketState
  const before = structuredClone({ stocks: retired.stocks, portfolios: retired.portfolios })
  advanceStockMarket(retired, 12, () => .5)
  assert.equal(retired.modelVersion, 8)
  assert.equal(retired.quoteRevision, 1)
  assert.equal(retired.internal.civic.price, 91.2345)
  assert.deepEqual({ stocks: retired.stocks, portfolios: retired.portfolios }, before)
  assert.equal((retired as ReturnType<typeof createStockMarket>).nextUpdateTurn, 16)
}
console.log('PASS: fixed schedule, catchup, idempotence and v1–v7 migration without repricing')

// Follow full successful and unsuccessful projects. Public dates must match
// actual settlement, and clues must already appear in the same public quote.
for (const randomValue of [.1, .9]) {
  const project = createStockMarket(['a'], 1, () => randomValue)
  let reveals = 0, clues = 0
  for (let n = 0; n < 70; n++) {
    const previous = structuredClone(project.internal.tech)
    const previousQuote = project.project ? { ...project.project } : null
    advanceStockMarket(project, project.nextUpdateTurn, () => randomValue)
    const news = project.projectNews
    if (news?.turn === project.updatedTurn && news.kind === 'update') {
      clues++
      assert.ok(previousQuote && project.project)
      const before = 1 + previousQuote.exposure * (2 * previousQuote.probability - 1)
      const after = 1 + project.project.exposure * (2 * project.project.probability - 1)
      assert.ok(Math.abs(project.internal.tech.projectValue / previous.projectValue - after / before) < 1e-12)
    }
    if (project.project) {
      assert.ok(project.project.probability >= .26 && project.project.probability <= .74)
      assert.ok(project.project.revealTurn > project.updatedTurn)
      if (previousQuote) assert.equal(project.project.revealTurn, previousQuote.revealTurn)
    }
    if (news?.turn === project.updatedTurn && (news.kind === 'success' || news.kind === 'failure')) {
      reveals++
      assert.ok(previousQuote)
      assert.equal(project.updatedTurn, previousQuote.revealTurn)
      assert.equal(news.kind, randomValue < .5 ? 'success' : 'failure')
      assert.equal(project.project, null)
      assert.equal(project.internal.tech.projectValue, 1, 'Resolved multiplier is folded into fundamental')
    }
  }
  assert.ok(reveals >= 3 && clues >= 6)
}
const privateState = fixture()
privateState.stockMarket = createStockMarket(['a'], 1, () => .1)
advanceStockMarket(privateState.stockMarket, 31, () => .1)
assert.ok(privateState.stockMarket.project)
const publicMarket = publicGameState(privateState, 'a').stockMarket!
assert.deepEqual(publicMarket.project, privateState.stockMarket.project)
assert.ok(!('internal' in publicMarket) && !('modelVersion' in publicMarket))
assert.deepEqual(Object.keys(publicMarket.project!).sort(), ['exposure', 'probability', 'revealTurn'])
console.log('PASS: project dates, immediate clue pricing, success/failure settlement and public-field allowlist')
