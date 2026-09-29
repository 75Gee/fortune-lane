// Run production rules, with optional isolated experiments; never edit the playable game or write reports.
// Usage: node scripts/simulate-pacing.mjs [games=5000] [--players=5] [--reserve=2000] [--seed=2026092800] [--reference]
// Scheduled gifts: --gift-interval=20 --gift-kind=chosen-die; always include the final acceleration-turn batch.
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('..', import.meta.url))
const serverRequire = createRequire(join(root, 'apps/server/package.json'))
const { build } = createRequire(serverRequire.resolve('tsx'))('esbuild')
const args = process.argv.slice(2)
const reference = args.includes('--reference')
const experimentKeys = ['salary-first', 'salary-step', 'salary-floor', 'start-cash', 'rent-start', 'rent-growth', 'build-cost', 'rent-base', 'gift-interval']
const experiments = Object.fromEntries(experimentKeys.flatMap(key => {
  const value = args.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3)
  if (value === undefined) return []
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) throw new Error(`Invalid --${key}`)
  return [[key, numeric]]
}))
const giftKind = args.find(arg => arg.startsWith('--gift-kind='))?.slice('--gift-kind='.length)
if (giftKind !== undefined && !['random', 'chosen-die'].includes(giftKind)) throw new Error('Invalid --gift-kind')
if (experiments['gift-interval'] !== undefined && (!Number.isSafeInteger(experiments['gift-interval']) || experiments['gift-interval'] < 1)) throw new Error('Gift interval must be a positive integer')
if (experiments['rent-start'] !== undefined && (experiments['rent-start'] < 25 || experiments['rent-start'] % 25 !== 0)) throw new Error('Rent start must coincide with a 25-turn gift boundary')
if (['start-cash', 'rent-growth', 'build-cost', 'rent-base'].some(key => experiments[key] === 0)) throw new Error('Cash, growth and multipliers must be positive')
if ((experiments['salary-floor'] ?? 2000) > (experiments['salary-first'] ?? 4000)) throw new Error('Salary floor exceeds first payment')
const temporary = mkdtempSync(join(tmpdir(), 'fortune-pacing-'))
const replace = (source, before, after) => {
  if (source.split(before).length !== 2) throw new Error(`Simulation optimization no longer matches source: ${before}`)
  return source.replace(before, after)
}
try {
  await build({
    entryPoints: [join(root, 'scripts/pacing-simulation.ts')],
    outfile: join(temporary, 'simulation.mjs'), bundle: true, platform: 'node', format: 'esm',
    plugins: [{ name: 'isolated-simulation', setup(builder) {
      builder.onLoad({ filter: /packages\/game\/src\/.*\.ts$/ }, args => {
        let contents = readFileSync(args.path, 'utf8')
        // Only explicit experimental flags alter rules inside this
        // disposable bundle. Without them the production rules are preserved.
        if (args.path.endsWith('/economy.ts')) {
          for (const [key, name, previous] of [
            ['salary-first', 'PASS_START_REWARD', '4_000'], ['salary-step', 'PASS_START_DECREMENT', '400'],
            ['salary-floor', 'PASS_START_MINIMUM', '2_000'], ['start-cash', 'STARTING_CASH', '15_000'],
          ]) if (experiments[key] !== undefined) contents = replace(contents, `export const ${name} = ${previous}`, `export const ${name} = ${experiments[key]}`)
          if (experiments['rent-start'] !== undefined) contents = replace(contents,
            'return 100 + (initialPlayerCount - 2) * ITEM_GRANT_INTERVAL', `return ${experiments['rent-start']}`)
          if (experiments['rent-growth'] !== undefined) contents = replace(contents,
            'return 1.02 **', `return ${1 + experiments['rent-growth']} **`)
          if (experiments['rent-base'] !== undefined) contents = replace(contents,
            'base * rentMultiplier(turnNumber, initialPlayerCount)', `base * ${experiments['rent-base']} * rentMultiplier(turnNumber, initialPlayerCount)`)
        }
        if (args.path.endsWith('/board.ts') && experiments['build-cost'] !== undefined) contents = replace(contents,
          '    buildCost,\n    rents,', `    buildCost: Math.round(buildCost * ${experiments['build-cost']}),\n    rents,`)
        if (args.path.endsWith('/engine.ts')) {
          // Do not change ITEM_GRANT_INTERVAL: it also defines how the rent
          // acceleration threshold scales with the initial player count.
          if (experiments['gift-interval'] !== undefined) contents = replace(contents,
            'state.turnNumber % ITEM_GRANT_INTERVAL === 0 && state.turnNumber <= rentGrowthStart(state.players.length)',
            `(state.turnNumber % ${experiments['gift-interval']} === 0 || state.turnNumber === rentGrowthStart(state.players.length)) && state.turnNumber <= rentGrowthStart(state.players.length)`)
          if (giftKind === 'random') {
            contents = replace(contents, "import { isDetained, ITEMS } from './items.js'", "import { isDetained, ITEM_KINDS, ITEMS } from './items.js'")
            contents = replace(contents, "const itemKind = 'chosen-die' as const",
              'const itemKind = ITEM_KINDS[Math.floor(random() * ITEM_KINDS.length)]!')
          }
        }
        if (reference) return { contents, loader: 'ts' }
        // Bookkeeping is irrelevant to this strategy. A rejected command aborts.

        if (args.path.endsWith('/engine.ts')) {
          contents = replace(contents, 'const state = structuredClone(current)', 'const previousTurnNumber = current.turnNumber\n  const state = current')
          contents = replace(contents, 'state.turnNumber !== current.turnNumber', 'state.turnNumber !== previousTurnNumber')
          // The strategy never trades; the market has its own independent RNG.
          contents = replace(contents, 'advanceStockMarket(state.stockMarket, state.turnNumber, marketRandom)', '')
          contents = replace(contents, '  updateNetWorthPeaks(state)', '')
        }
        if (args.path.endsWith('/engine/finance.ts')) contents = replace(contents, '  updateNetWorthPeaks(state)', '')
        if (args.path.endsWith('/engine/context.ts')) {
          contents = replace(contents, '  state.actionLog.push(next)\n  state.actionLog = state.actionLog.slice(-300)\n  recordStatistics(state, next)', '')
        }
        return { contents, loader: 'ts' }
      })
    } }],
  })
  const result = spawnSync(process.execPath, [join(temporary, 'simulation.mjs'), ...args], { stdio: 'inherit' })
  if (result.status !== 0) process.exitCode = result.status ?? 1
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
