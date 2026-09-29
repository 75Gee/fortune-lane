import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import {
  BOARD, TOKEN_IDS, MAX_PROPERTY_LEVEL, createGame, applyCommand,
  isOwnable, isDetained, itemUseBlockReason, itemPlacementOptions, itemPlacementBlockReason,
  movementPreview, rentForTile, scaleRent, redeemCost, buildingSaleValue, cardPropertyCandidates,
  wheelProperties, WHEEL_SPIN_MS, rentGrowthStart, type GameState, type GameCommand, type GameEvent,
  type PlayerState, type TileDefinition,
} from '../packages/game/src/index.js'

const options = process.argv.slice(2)
const option = (name: string, fallback: number) => Number(options.find(arg => arg.startsWith(`--${name}=`))?.split('=')[1] ?? fallback)
const sampleCount = Number(options.find(arg => !arg.startsWith('--')) ?? 5000)
const playerCount = option('players', 5), reserve = option('reserve', 2000), seedStart = option('seed', 2026092800)
const reference = options.includes('--reference'), maxTurns = 2000
if (![sampleCount, playerCount, reserve, seedStart].every(Number.isSafeInteger) || sampleCount < 1 || playerCount < 2 || playerCount > 6 || reserve < 0) throw new Error('Invalid simulation options')
const cities = BOARD.filter(tile => tile.kind === 'property')
const ownables = BOARD.filter(isOwnable)
const cityTarget = Math.ceil(cities.length * .8), assetTarget = Math.ceil(ownables.length * .8)
const accelerationTurn = rentGrowthStart(playerCount), majority = Math.floor(playerCount / 2) + 1
const checkpoints = [...new Set([...Array.from({ length: Math.floor(maxTurns / 50) }, (_, i) => (i + 1) * 50), accelerationTurn])].sort((a, b) => a - b)
const checkpointSet = new Set(checkpoints)
// Exact P(sum >= distance), including paths stopped by an earlier hazard.
const singleTail = Array.from({ length: 7 }, (_, d) => Array.from({ length: 6 }, (_, i) => i + 1).filter(n => n >= d).length / 6)
const doubleTail = Array.from({ length: 13 }, (_, d) => {
  let hits = 0
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= d) hits++
  return hits / 36
})
function seeded(seed: number) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}
function pick<T>(values: readonly T[], random: () => number): T | undefined { return values[Math.floor(random() * values.length)] }
function quantiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const q = (p: number) => sorted.length ? sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)]! : null
  return { count: values.length, mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    p10: q(.1), p25: q(.25), median: q(.5), p75: q(.75), p90: q(.9), p95: q(.95) }
}
function probability(successes: number, total: number) {
  if (!total) return { value: null, low95: null, high95: null }
  const p = successes / total, z2 = 1.96 ** 2, scale = 1 + z2 / total
  const center = (p + z2 / (2 * total)) / scale
  const radius = 1.96 * Math.sqrt(p * (1 - p) / total + z2 / (4 * total ** 2)) / scale
  return { value: p, low95: Math.max(0, center - radius), high95: Math.min(1, center + radius) }
}
function emptyCheckpoint() {
  return { games: 0, players: 0, levels: [0, 0, 0, 0, 0], cash: [] as number[], developed: 0,
    cityOwners: 0, cashBelow1000: 0, cashBelow500: 0, mortgagedCities: 0, ownedCities: 0, ownedAssets: 0,
    atLeast80Cities: 0, atLeast80Assets: 0, majorityDeveloped: 0, bothTargets: 0, allAlive: 0,
    playersHadRent: 0, playersHadUpgrade: 0, detained: 0, incomeFromStart: 0, purchaseSpend: 0, upgradeSpend: 0, upgradeOffers: 0, skippedUpgrades: 0, totalCash: 0,
    rentPaid: 0, rentPayments: 0, upgrades: 0, chosenUses: 0, heldChosen: 0, chosenDevelopments: 0, giftBatches: 0, gifts: 0 }
}
const checkpointTotals = new Map(checkpoints.map(turn => [turn, emptyCheckpoint()]))
function simulate(seed: number) {
  const random = seeded(seed), policyRandom = seeded(seed ^ 0x4b529f17), marketRandom = seeded(seed ^ 0x713a329e)
  let state: GameState = createGame(Array.from({ length: playerCount }, (_, i) => ({ id: `p${i + 1}`, name: `玩家${i + 1}`, token: TOKEN_IDS[i]! })), random, 0, marketRandom)
  const hasEnded = () => state.phase === 'FINISHED'
  let commands = 0, clock = 0, first80Cities: number | null = null, first80Assets: number | null = null, firstMajorityTwo: number | null = null
  const eliminations: { playerId: string; turn: number }[] = []
  const counters = { bought: 0, upgrades: 0, itemsReceived: 0, chosen: 0, roadblock: 0, bomb: 0, turtle: 0,
    hospitalized: 0, jailed: 0, startIncome: 0, cashCalls: 0, buildingSales: 0, mortgages: 0, rentPayments: 0, rentPaid: 0,
    chosenDevelopments: 0, roadblockSelfDevelopments: 0, scheduledGiftBatches: 0, scheduledGifts: 0, purchaseSpend: 0, upgradeSpend: 0, upgradeOffers: 0, skippedUpgrades: 0 }
  const firstUpgrade = new Map<string, number>(), firstRent = new Map<string, number>()
  const debtPlayers = new Set<string>(), sellerPlayers = new Set<string>()
  const checkpointStates: unknown[] = []
  let lastGiftTurn = 0, developmentItem: 'chosen' | 'roadblock' | null = null, developmentPlayer = ''
  let lastTurnWithDevelopment = 0, longestDevelopmentGap = 0, developmentTurns = 0

  function observe() {
    const alive = state.players.filter(player => !player.isBankrupt)
    let ownedCities = 0, ownedAssets = 0
    const levels = [0, 0, 0, 0, 0], developed = new Set<string>(), owners = new Set<string>()
    let mortgagedCities = 0
    for (const tile of ownables) {
      const asset = state.tiles[tile.index]!
      if (!asset.ownerId) continue
      ownedAssets++
      if (tile.kind !== 'property') continue
      ownedCities++; levels[asset.level]!++; owners.add(asset.ownerId)
      if (asset.mortgaged) mortgagedCities++
      else if (asset.level >= 2) developed.add(asset.ownerId)
    }
    // Milestones are sampled at player handoffs, not every UI command.
    const completedTurn = state.turnNumber - 1
    if (first80Cities === null && ownedCities >= cityTarget) first80Cities = completedTurn
    if (first80Assets === null && ownedAssets >= assetTarget) first80Assets = completedTurn
    if (firstMajorityTwo === null && developed.size >= majority) firstMajorityTwo = completedTurn
    if (!checkpointSet.has(state.turnNumber)) return
    const row = checkpointTotals.get(state.turnNumber)!
    row.games++; row.players += alive.length
    row.incomeFromStart += counters.startIncome; row.purchaseSpend += counters.purchaseSpend
    row.upgradeSpend += counters.upgradeSpend; row.upgradeOffers += counters.upgradeOffers
    row.skippedUpgrades += counters.skippedUpgrades
    row.rentPaid += counters.rentPaid; row.rentPayments += counters.rentPayments
    row.upgrades += counters.upgrades; row.chosenUses += counters.chosen
    row.chosenDevelopments += counters.chosenDevelopments
    row.giftBatches += counters.scheduledGiftBatches; row.gifts += counters.scheduledGifts
    row.heldChosen += alive.reduce((sum, player) => sum + player.items.filter(item => item === 'chosen-die').length, 0)
    row.totalCash += alive.reduce((sum, player) => sum + player.cash, 0)
    levels.forEach((count, level) => { row.levels[level]! += count })
    row.cash.push(...alive.map(player => player.cash))
    row.developed += developed.size; row.cityOwners += owners.size
    row.ownedCities += ownedCities; row.ownedAssets += ownedAssets; row.mortgagedCities += mortgagedCities
    row.cashBelow1000 += alive.filter(player => player.cash < 1000).length
    row.cashBelow500 += alive.filter(player => player.cash < 500).length
    row.detained += alive.filter(isDetained).length
    row.playersHadRent += alive.filter(player => firstRent.has(player.id)).length
    row.playersHadUpgrade += alive.filter(player => firstUpgrade.has(player.id)).length
    row.atLeast80Cities += Number(ownedCities >= cityTarget)
    row.atLeast80Assets += Number(ownedAssets >= assetTarget)
    row.majorityDeveloped += Number(developed.size >= majority)
    row.bothTargets += Number(ownedCities >= cityTarget && developed.size >= majority)
    row.allAlive += Number(alive.length === playerCount)
    checkpointStates.push([state.turnNumber, levels, alive.map(player => [player.id, player.cash]), developed.size, ownedAssets])
  }
  function collect(events: GameEvent[]) {
    for (const event of events) {
      const turn = event.turnNumber ?? state.turnNumber
      if (event.type === 'DICE_ROLLED' && event.dicePurpose === 'movement') developmentItem = null
      if (event.type === 'ITEM_USED' && event.itemKind === 'chosen-die') { developmentItem = 'chosen'; developmentPlayer = event.playerId! }
      if (event.type === 'HAZARD_TRIGGERED' && event.itemKind === 'roadblock' && event.playerId === event.targetPlayerId) {
        developmentItem = 'roadblock'; developmentPlayer = event.playerId!
      }
      if (event.type === 'PLAYER_BANKRUPT') eliminations.push({ playerId: event.playerId!, turn })
      if (event.type === 'PROPERTY_PURCHASED' || (event.type === 'AUCTION_RESOLVED' && event.playerId)) { counters.bought++; counters.purchaseSpend += event.amount ?? 0 }
      if (event.type === 'PROPERTY_UPGRADED') {
        counters.upgrades++; counters.upgradeSpend += event.amount ?? 0
        if (!firstUpgrade.has(event.playerId!)) firstUpgrade.set(event.playerId!, turn)
      }
      if (event.type === 'PROPERTY_PURCHASED' || event.type === 'PROPERTY_UPGRADED' || (event.type === 'AUCTION_RESOLVED' && event.playerId)) {
        if (lastTurnWithDevelopment !== turn) {
          longestDevelopmentGap = Math.max(longestDevelopmentGap, turn - lastTurnWithDevelopment - 1)
          lastTurnWithDevelopment = turn; developmentTurns++
        }
        if (developmentPlayer === event.playerId && event.type !== 'AUCTION_RESOLVED') {
          if (developmentItem === 'chosen') counters.chosenDevelopments++
          if (developmentItem === 'roadblock') counters.roadblockSelfDevelopments++
          developmentItem = null
        }
      }
      if (event.type === 'PLAYER_SENT_TO_HOSPITAL') counters.hospitalized++
      if (event.type === 'PLAYER_SENT_TO_JAIL') counters.jailed++
      if (event.type === 'PASSED_START') counters.startIncome += event.amount ?? 0
      if (event.type === 'DEBT_CREATED') { counters.cashCalls++; debtPlayers.add(event.playerId!) }
      if (event.type === 'BUILDING_SOLD') { counters.buildingSales++; sellerPlayers.add(event.playerId!) }
      if (event.type === 'ASSET_MORTGAGED') counters.mortgages++
      if (event.type === 'RENT_PAID') {
        counters.rentPayments++; counters.rentPaid += -(event.amount ?? 0)
        if (event.targetPlayerId && !firstRent.has(event.targetPlayerId)) firstRent.set(event.targetPlayerId, turn)
      }
      if (event.type === 'ITEM_RECEIVED') {
        counters.itemsReceived++
        if (event.message.startsWith('第 ') && event.message.includes('回合道具补给')) {
          counters.scheduledGifts++
          if (lastGiftTurn !== turn) { lastGiftTurn = turn; counters.scheduledGiftBatches++ }
        }
      }
      if (event.type === 'ITEM_USED') {
        const key = event.itemKind === 'chosen-die' ? 'chosen' : event.itemKind
        if (key && key in counters) counters[key as 'chosen' | 'roadblock' | 'bomb' | 'turtle']++
      }
      if (event.type === 'TURN_CHANGED' || event.type === 'EXTRA_MOVE_FINISHED' || event.type === 'LANDING_RESOLVED' || event.type === 'PLAYER_SENT_TO_HOSPITAL' || event.type === 'PLAYER_SENT_TO_JAIL') developmentItem = null
    }
  }
  function execute(command: GameCommand, playerId = state.currentPlayerId) {
    commands++
    if (command.type === 'UPGRADE_PROPERTY' || command.type === 'SKIP_UPGRADE') counters.upgradeOffers++
    if (command.type === 'SKIP_UPGRADE') counters.skippedUpgrades++
    const wheel = state.pendingWheel
    const now = clock = command.type === 'RESOLVE_WHEEL' && wheel?.startedAt !== null && wheel?.startedAt !== undefined
      ? Math.max(clock + 100, wheel.startedAt + WHEEL_SPIN_MS) : clock + 100
    const result = applyCommand(state, playerId, command, random, now, false, marketRandom)
    if (!result.ok) throw new Error(JSON.stringify({ seed, turn: state.turnNumber, phase: state.phase, command, error: result.error }))
    state = result.state
    collect(result.events)
  }
  function liquidateOne(player: PlayerState): GameCommand | null {
    const choices: { command: GameCommand; loss: number }[] = []
    for (const tile of BOARD) {
      const asset = state.tiles[tile.index]!
      if (asset.ownerId !== player.id || asset.mortgaged) continue
      if (asset.level > 0) choices.push({ command: { type: 'SELL_BUILDING', tileIndex: tile.index }, loss: ((scaleRent(tile.rents![asset.level]!, state.turnNumber, playerCount) - scaleRent(tile.rents![asset.level - 1]!, state.turnNumber, playerCount)) / buildingSaleValue(tile.index)) })
      else choices.push({ command: { type: 'MORTGAGE_ASSET', tileIndex: tile.index }, loss: rentForTile(state, tile.index, 7) / (tile.mortgage ?? 1) })
    }
    choices.sort((a, b) => a.loss - b.loss)
    return choices[0]?.command ?? null
  }
  function developmentScore(player: PlayerState, tile: TileDefinition): number {
    const asset = state.tiles[tile.index]!
    if (!isOwnable(tile)) return 0
    if (!asset.ownerId && player.cash - (tile.price ?? Infinity) >= reserve) {
      const owned = state.tiles.filter(t => t.ownerId === player.id).length
      const airports = tile.kind === 'airport' ? BOARD.filter(t => t.kind === 'airport' && state.tiles[t.index]!.ownerId === player.id).length : 0
      return 75 + (owned < 4 ? 35 : 0) + 15 * airports + (tile.rents?.[0] ?? 200) / (tile.price ?? 1) * 20
    }
    if (asset.ownerId === player.id && tile.kind === 'property' && !asset.mortgaged && asset.level < MAX_PROPERTY_LEVEL && player.cash - tile.buildCost! >= reserve) {
      const gain = tile.rents![asset.level + 1]! - tile.rents![asset.level]!
      return 80 + 25 * gain / tile.buildCost! + (asset.level === 1 ? 25 : 0)
    }
    return 0
  }
  function reachProbability(player: PlayerState, tileIndex: number) {
    if (reference) {
      let hits = 0, total = 0
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= (player.turtleRollsRemaining ? 1 : 6); b++) {
        total++
        if (movementPreview(state, player.position, player.turtleRollsRemaining ? a : a + b).path.includes(tileIndex)) hits++
      }
      return hits / total
    }
    const distance = (tileIndex - player.position + BOARD.length) % BOARD.length
    const tail = player.turtleRollsRemaining ? singleTail : doubleTail
    if (!distance || distance >= tail.length) return 0
    for (const hazard of state.hazards) {
      const blockedAt = (hazard.tileIndex - player.position + BOARD.length) % BOARD.length
      if (blockedAt > 0 && blockedAt < distance) return 0
    }
    return tail[distance]!
  }
  function itemCommand(player: PlayerState): GameCommand | null {
    if (itemUseBlockReason(state, player.id)) return null
    const beforeRoll = state.phase === 'WAITING_FOR_ROLL'
    const moreMovement = beforeRoll || !!state.lastRoll?.isDouble
    if (player.items.includes('chosen-die')) {
      let best = 0, value = 0
      for (let die = 1; die <= 6; die++) {
        const preview = movementPreview(state, player.position, die)
        if (preview.hazard?.kind === 'bomb') continue
        const score = developmentScore(player, BOARD[preview.destination]!)
        if (score > best) { best = score; value = die }
      }
      if (value) return { type: 'USE_CHOSEN_DIE', value }
    }
    if (player.items.includes('roadblock')) {
      const options: { index: number; score: number }[] = []
      for (const option of itemPlacementOptions(player.position)) {
        if (itemPlacementBlockReason(state, player.id, option.tileIndex)) continue
        const asset = state.tiles[option.tileIndex]!
        if (asset.ownerId !== player.id || asset.mortgaged) continue
        const forward = (option.tileIndex - player.position + BOARD.length) % BOARD.length
        const selfUpgrade = beforeRoll && forward >= 1 && forward <= 2 ? developmentScore(player, BOARD[option.tileIndex]!) : 0
        if (selfUpgrade) { options.push({ index: option.tileIndex, score: 1000 + selfUpgrade }); continue }
        // Do not consume a toll trap ourselves before other players can move.
        if (moreMovement && forward >= 1 && forward <= 2) continue
        const expectedRent = state.players.filter(p => p.id !== player.id && !p.isBankrupt)
          .reduce((sum, p) => sum + reachProbability(p, option.tileIndex) * rentForTile(state, option.tileIndex, p.turtleRollsRemaining ? 3.5 : 7), 0)
        if (expectedRent > 0) options.push({ index: option.tileIndex, score: expectedRent })
      }
      options.sort((a, b) => b.score - a.score)
      if (options[0]) return { type: 'PLACE_ROADBLOCK', tileIndex: options[0].index }
    }
    if (player.items.includes('turtle')) {
      const target = pick(state.players.filter(p => p.id !== player.id && !p.isBankrupt && !p.turtleRollsRemaining), policyRandom)
      if (target) return { type: 'USE_TURTLE', targetPlayerId: target.id }
    }
    // Random legal placement at the end of movement avoids knowingly bombing
    // ourselves immediately before rolling; it can still hit us on a later lap.
    if (!moreMovement && player.items.includes('bomb')) {
      const option = pick(itemPlacementOptions(player.position).filter(o => !itemPlacementBlockReason(state, player.id, o.tileIndex)), policyRandom)
      if (option) return { type: 'PLACE_BOMB', tileIndex: option.tileIndex }
    }
    return null
  }
  function chooseBuilding(candidates: readonly TileDefinition[], gain: boolean) {
    return [...candidates].sort((a, b) => {
      const aLevel = state.tiles[a.index]!.level, bLevel = state.tiles[b.index]!.level
      const delta = (tile: TileDefinition, level: number) => gain ? tile.rents![level + 1]! - tile.rents![level]! : tile.rents![level]! - tile.rents![level - 1]!
      return gain ? delta(b, bLevel) - delta(a, aLevel) : delta(a, aLevel) - delta(b, bLevel)
    })[0]!
  }

  let lastObservedTurn = state.turnNumber
  while (!hasEnded() && state.turnNumber <= maxTurns) {
    if (commands > 100000) throw new Error(`Command loop: ${seed}`)
    const player = state.players.find(p => p.id === state.currentPlayerId)!
    if (state.phase === 'WAITING_FOR_ROLL' || state.phase === 'WAITING_FOR_END_TURN') {
      if (state.phase === 'WAITING_FOR_ROLL' && isDetained(player)) {
        if (player.cash >= 500) execute({ type: 'PAY_JAIL_FINE' })
        else {
          const sale = liquidateOne(player)
          if (sale) execute(sale)
          else execute({ type: 'TRY_JAIL_ROLL' })
        }
      } else {
        const item = itemCommand(player)
        const redeem = BOARD.filter(t => state.tiles[t.index]!.ownerId === player.id && state.tiles[t.index]!.mortgaged
          && player.cash - redeemCost(t.index) >= reserve + 1000).sort((a, b) => (b.rents?.[0] ?? 300) / redeemCost(b.index) - (a.rents?.[0] ?? 300) / redeemCost(a.index))[0]
        if (item) execute(item)
        else if (redeem) execute({ type: 'REDEEM_ASSET', tileIndex: redeem.index })
        else execute({ type: state.phase === 'WAITING_FOR_ROLL' ? 'ROLL_DICE' : 'END_TURN' })
      }
    } else if (state.phase === 'WAITING_FOR_PURCHASE' || state.phase === 'WAITING_FOR_UPGRADE') {
      const tile = BOARD[state.pendingDecision!.tileIndex]!
      const buy = state.phase === 'WAITING_FOR_PURCHASE'
      const affordable = player.cash - (buy ? tile.price! : tile.buildCost!) >= reserve
      execute({ type: buy ? affordable ? 'BUY_PROPERTY' : 'SKIP_PURCHASE' : affordable ? 'UPGRADE_PROPERTY' : 'SKIP_UPGRADE' })
    } else if (state.phase === 'WAITING_FOR_AUCTION') {
      const auction = state.pendingAuction!
      const bidderId = auction.participantIds.find(id => !Object.hasOwn(auction.bids, id))
      if (!bidderId) throw new Error('Auction did not resolve')
      const bidder = state.players.find(p => p.id === bidderId)!, tile = BOARD[auction.tileIndex]!
      const budget = Math.max(0, bidder.cash - reserve)
      const bid = Math.min(budget, Math.floor(tile.price! * (.65 + .35 * policyRandom())))
      execute({ type: 'BID_AUCTION', auctionId: auction.id, amount: bid >= tile.mortgage! ? bid : 0 }, bidderId)
    } else if (state.phase === 'WAITING_FOR_DEBT') {
      if (player.cash >= state.pendingDebt!.amount) execute({ type: 'SETTLE_DEBT' })
      else {
        const sale = liquidateOne(player)
        if (!sale) throw new Error('Solvent debt had no liquidation option')
        execute(sale)
      }
    } else if (state.phase === 'WAITING_FOR_CARD_CHOICE') {
      execute({ type: 'CHOOSE_CARD', choiceId: state.pendingCardChoice!.id, cardIndex: Math.floor(policyRandom() * 3) as 0 | 1 | 2 })
    } else if (state.phase === 'WAITING_FOR_CARD_PROPERTY') {
      execute({ type: 'CHOOSE_CARD_PROPERTY', choiceId: state.pendingCardProperty!.id, tileIndex: chooseBuilding(cardPropertyCandidates(state, player.id), false).index })
    } else if (state.phase === 'WAITING_FOR_WHEEL') {
      const wheel = state.pendingWheel!
      if (wheel.stage === 'ready') execute({ type: 'SPIN_WHEEL', wheelId: wheel.id })
      else if (wheel.stage === 'spinning') execute({ type: 'RESOLVE_WHEEL', wheelId: wheel.id })
      else execute({ type: 'CHOOSE_WHEEL_PROPERTY', wheelId: wheel.id, tileIndex: chooseBuilding(wheelProperties(state, player.id, wheel.outcome), wheel.outcome === 'gain_house').index })
    } else throw new Error(`Unhandled phase ${state.phase}`)

    if (state.turnNumber !== lastObservedTurn && !hasEnded()) {
      observe()
      lastObservedTurn = state.turnNumber
    }
  }
  const ended = hasEnded()
  longestDevelopmentGap = Math.max(longestDevelopmentGap, state.turnNumber - lastTurnWithDevelopment)
  const finalState = { phase: state.phase, currentPlayerId: state.currentPlayerId, turnNumber: state.turnNumber,
    players: state.players, tiles: state.tiles, hazards: state.hazards, chanceDeck: state.chanceDeck, fateDeck: state.fateDeck }
  return { seed, ended, endTurn: ended ? state.turnNumber : null, firstEliminationTurn: eliminations[0]?.turn ?? null,
    eliminations, winner: state.winnerPlayerId, first80Cities, first80Assets, firstMajorityTwo, counters,
    firstUpgrade: [...firstUpgrade.values()], firstRent: [...firstRent.values()], everUpgraded: firstUpgrade.size,
    everCollectedRent: firstRent.size, debtPlayers: debtPlayers.size, sellerPlayers: sellerPlayers.size,
    developmentTurns, longestDevelopmentGap, commands,
    fingerprint: createHash('sha256').update(JSON.stringify([finalState, checkpointStates, counters, eliminations])).digest('hex') }
}

const started = performance.now()
const runs: ReturnType<typeof simulate>[] = []
for (let index = 0; index < sampleCount; index++) runs.push(simulate(seedStart + index))
const seconds = (performance.now() - started) / 1000
const completed = runs.filter(run => run.ended)
const ends = completed.map(run => run.endTurn!)
const firsts = runs.flatMap(run => run.firstEliminationTurn === null ? [] : [run.firstEliminationTurn])
const defeated = completed.flatMap(run => run.eliminations.map(e => ({ fraction: e.turn / run.endTurn!, watchMinutes: (run.endTurn! - e.turn) / 4 })))
const percent = (count: number, n = sampleCount) => n ? count / n : null
const counterMeans = Object.fromEntries(Object.keys(runs[0]!.counters).map(key => [key, runs.reduce((sum, run) => sum + run.counters[key as keyof typeof run.counters], 0) / sampleCount]))
const batchSize = 500
const batches = Array.from({ length: Math.ceil(sampleCount / batchSize) }, (_, i) => {
  const batch = runs.slice(i * batchSize, (i + 1) * batchSize)
  return { count: batch.length, firstMedian: quantiles(batch.flatMap(r => r.firstEliminationTurn === null ? [] : [r.firstEliminationTurn])).median,
    endMedian: quantiles(batch.flatMap(r => r.endTurn === null ? [] : [r.endTurn])).median }
})
console.log(JSON.stringify({
  configuration: { players: playerCount, cashReserve: reserve, samples: sampleCount, seedStart, maxTurns, reference,
    experiments: options.filter(arg => /^--(salary-|start-cash|rent-|build-cost|gift-)/.test(arg)),
    rentStarts: accelerationTurn, secondsPerTurn: 15, checkpointTiming: 'start of turn; ongoing games only; player means pooled over survivors',
    strategy: 'No stocks; buy/upgrade retaining reserve; sealed bids 65–100% list price within reserve; chosen die prioritizes development; roadblock prioritizes self-upgrade then expected rent; random turtle/opponent and legal bomb/end-of-movement; pay detention fee, liquidating if necessary, otherwise use legal dice attempt.' },
  runtime: { seconds, gamesPerSecond: sampleCount / seconds, commands: runs.reduce((sum, run) => sum + run.commands, 0) },
  fingerprint: createHash('sha256').update(runs.map(run => run.fingerprint).join('')).digest('hex'),
  completed: completed.length, censored: sampleCount - completed.length,
  firstElimination: quantiles(firsts), end: quantiles(ends),
  firstEliminationFraction: quantiles(completed.flatMap(r => r.firstEliminationTurn === null ? [] : [r.firstEliminationTurn / r.endTurn!])),
  firstNearTwoThirds: probability(completed.filter(r => r.firstEliminationTurn !== null && Math.abs(r.firstEliminationTurn / r.endTurn! - 2/3) <= .05).length, completed.length),
  firstSpectatingMinutes: quantiles(completed.flatMap(r => r.firstEliminationTurn === null ? [] : [(r.endTurn! - r.firstEliminationTurn) / 4])),
  defeatedSpectatingMinutes: quantiles(defeated.map(row => row.watchMinutes)),
  defeatedSurvivalFraction: quantiles(defeated.map(row => row.fraction)),
  defeatedWithin60To80Percent: percent(defeated.filter(row => row.fraction >= .6 && row.fraction <= .8).length, defeated.length),
  majorityAllPlayersWithin60To80Percent: percent(completed.filter(run => run.eliminations.filter(e => e.turn / run.endTurn! >= .6 && e.turn / run.endTurn! <= .8).length >= majority).length, completed.length),
  majorityAliveAt60Percent: percent(completed.filter(run => playerCount - run.eliminations.filter(e => e.turn <= run.endTurn! * .6).length >= majority).length, completed.length),
  majorityAliveAt80Percent: percent(completed.filter(run => playerCount - run.eliminations.filter(e => e.turn <= run.endTurn! * .8).length >= majority).length, completed.length),
  endedWithin30To60Minutes: probability(ends.filter(turn => turn >= 120 && turn <= 240).length, sampleCount),
  anyEliminationBeforeAcceleration: probability(firsts.filter(turn => turn < accelerationTurn).length, sampleCount),
  milestones: { first80Cities: quantiles(runs.flatMap(r => r.first80Cities === null ? [] : [r.first80Cities])),
    first80Assets: quantiles(runs.flatMap(r => r.first80Assets === null ? [] : [r.first80Assets])),
    firstMajorityTwo: quantiles(runs.flatMap(r => r.firstMajorityTwo === null ? [] : [r.firstMajorityTwo])),
    firstUpgrade: quantiles(runs.flatMap(r => r.firstUpgrade)), firstRent: quantiles(runs.flatMap(r => r.firstRent)) },
  experience: { neverUpgraded: 1 - runs.reduce((s, r) => s + r.everUpgraded, 0) / (sampleCount * playerCount),
    neverCollectedRent: 1 - runs.reduce((s, r) => s + r.everCollectedRent, 0) / (sampleCount * playerCount),
    hadCashShortfall: runs.reduce((s, r) => s + r.debtPlayers, 0) / (sampleCount * playerCount),
    soldBuildings: runs.reduce((s, r) => s + r.sellerPlayers, 0) / (sampleCount * playerCount),
    longestDevelopmentGap: quantiles(runs.map(r => r.longestDevelopmentGap)),
    turnsWithDevelopment: runs.reduce((s, r) => s + r.developmentTurns, 0) / runs.reduce((s, r) => s + (r.endTurn ?? maxTurns), 0) },
  countersPerGame: counterMeans,
  checkpoints: checkpoints.filter(turn => turn === accelerationTurn || turn === 50 || checkpointTotals.get(turn)!.games > 0 || (checkpointTotals.get(turn - 50)?.games ?? 0) > 0).map(turn => {
    const row = checkpointTotals.get(turn)!, div = (n: number) => row.players ? n / row.players : null
    return { turn, games: row.games, ongoing: percent(row.games), meanAlive: row.games ? row.players / row.games : null,
      levelsPerSurvivor: row.levels.map(div), meanOwnedCities: row.games ? row.ownedCities / row.games : null,
      cityOwnershipRate: row.games ? row.ownedCities / row.games / cities.length : null,
      cumulativeMoneyPerGame: row.games ? { startIncome: row.incomeFromStart / row.games, purchases: row.purchaseSpend / row.games,
        upgrades: row.upgradeSpend / row.games, totalCash: row.totalCash / row.games, rentTransferred: row.rentPaid / row.games,
        upgradeOffers: row.upgradeOffers / row.games, skippedUpgrades: row.skippedUpgrades / row.games } : null,
      cumulativeActionsPerGame: row.games ? { upgrades: row.upgrades / row.games, rentPayments: row.rentPayments / row.games,
        chosenUses: row.chosenUses / row.games, chosenDevelopments: row.chosenDevelopments / row.games,
        giftBatches: row.giftBatches / row.games, gifts: row.gifts / row.games } : null,
      heldChosenPerSurvivor: div(row.heldChosen),
      cash: quantiles(row.cash), cashBelow1000: div(row.cashBelow1000), cashBelow500: div(row.cashBelow500),
      haveLevel2Plus: div(row.developed), haveAnyCity: div(row.cityOwners), detained: div(row.detained),
      hadUpgrade: div(row.playersHadUpgrade), hadRent: div(row.playersHadRent),
      mortgagedCityShare: row.ownedCities ? row.mortgagedCities / row.ownedCities : null,
      atLeast80Cities: probability(row.atLeast80Cities, row.games), atLeast80Assets: probability(row.atLeast80Assets, row.games),
      majorityDeveloped: probability(row.majorityDeveloped, row.games), bothDevelopmentTargets: probability(row.bothTargets, row.games),
      allAlive: probability(row.allAlive, sampleCount),
      firstEliminationByTurn: probability(firsts.filter(t => t < turn).length, sampleCount),
      endedByTurn: probability(ends.filter(t => t < turn).length, sampleCount) }
  }), batches,
}))
