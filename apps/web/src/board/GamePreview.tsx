import { advanceStockMarket, applyCommand, CHANCE_CARDS, createGame, FATE_CARDS, getTileById, STOCK_IDS, WHEEL_SPIN_MS, type GameCommand, type GameEvent } from '@fortune/game'
import { publicGameState, type RoomSnapshot } from '@fortune/protocol'
import { useEffect, useState } from 'react'
import { CommandAvailabilityContext, ModalErrorContext } from '../components/Modal.js'
import { GamePage } from '../pages/GamePage.js'

/** Local artwork scene using the real game UI; no server or saved rooms involved. */
function previewGame() {
  let marketSeed = 7509
  const marketRandom = () => { marketSeed = (Math.imul(marketSeed, 1664525) + 1013904223) >>> 0; return marketSeed / 0x1_0000_0000 }
  let game = createGame([
    { id: 'xiaoman', name: '小满', token: 'train' },
    { id: 'alan', name: '阿岚', token: 'camera' },
    { id: 'muzi', name: '木子', token: 'teapot' },
    { id: 'xiaoyu', name: '小雨', token: 'kite' },
  ], () => .5, Date.now(), marketRandom)
  game.currentPlayerId = 'xiaoman'; game.turnNumber = 14; game.revision = 38
  const places = ['香港', '旧金山', '开罗', 'item-north'], cash = [14300, 10800, 12600, 9400]
  game.players.forEach((player, index) => { player.position = getTileById(places[index]!).index; player.cash = cash[index]! })
  game.players[0]!.items = ['turtle', 'chosen-die', 'bomb']
  game.players[1]!.items = ['roadblock']; game.players[1]!.turtleRollsRemaining = 1
  for (const [id, owner, level] of [
    ['香港', 0, 2], ['上海', 0, 1], ['东京', 0, 1], ['纽约', 1, 1], ['旧金山', 1, 2],
    ['开罗', 2, 2], ['伦敦', 2, 1], ['新加坡', 2, 1], ['洛杉矶', 3, 3], ['巴黎', 3, 1], ['北京', 3, 2],
  ] as const) game.tiles[getTileById(id).index] = { ownerId: game.players[owner]!.id, level, mortgaged: false }
  game.hazards = [
    { id: 'preview-roadblock', kind: 'roadblock', ownerId: 'alan', tileIndex: getTileById('fate-east').index },
    { id: 'preview-bomb', kind: 'bomb', ownerId: 'muzi', tileIndex: getTileById('airport-east').index },
  ]
  game.actionLog = [{ id: 'preview-purchase', revision: 38, turnNumber: 14, type: 'PROPERTY_UPGRADED', playerId: 'xiaoman', tileIndex: getTileById('香港').index, amount: 1100, message: '小满完善香港的游览设施，城市升至 2 级。' }]
  const query = new URLSearchParams(location.search)
  if (query.has('stocks')) {
    // Isolated artwork fixture: deterministic history, real trade accounting.
    for (const playerId of ['xiaoman', 'alan']) for (const stockId of STOCK_IDS) {
      game = applyCommand(game, playerId, { type: 'TRADE_STOCK', stockId, side: 'buy', quantity: playerId === 'xiaoman' ? 15 : 8, quoteRevision: game.stockMarket!.quoteRevision }).state
    }
    for (let turn = 2; turn <= 121; turn++) advanceStockMarket(game.stockMarket!, turn, marketRandom)
    game.turnNumber = 121
    game = applyCommand(game, 'xiaoman', { type: 'TRADE_STOCK', stockId: 'tech', side: 'sell', quantity: 5, quoteRevision: game.stockMarket!.quoteRevision }).state
    game.actionLog = []
  }
  const previewCash = Number(query.get('cash'))
  if (query.has('cash') && Number.isSafeInteger(previewCash) && previewCash >= 0) game.players[0]!.cash = previewCash
  const decision = query.get('decision')
  if (decision === 'purchase' || decision === 'upgrade' || decision === 'auction') {
    const tileIndex = getTileById(decision === 'upgrade' ? '香港' : '维也纳').index
    game.players[0]!.position = tileIndex
    game.pendingDecision = { type: decision === 'upgrade' ? 'upgrade' : 'purchase', playerId: 'xiaoman', tileIndex }
    game.phase = decision === 'upgrade' ? 'WAITING_FOR_UPGRADE' : 'WAITING_FOR_PURCHASE'
    if (decision === 'auction') {
      game.players[1]!.cash = 0
      return applyCommand(game, 'xiaoman', { type: 'SKIP_PURCHASE' }).state
    }
  }
  if (decision === 'debt') {
    game.players[0]!.cash = 200
    game.phase = 'WAITING_FOR_DEBT'
    game.pendingDebt = { debtorId: 'xiaoman', creditorId: 'alan', amount: query.has('stocks') ? 7000 : 2000, reason: '纽约游览费用', tileIndex: getTileById('纽约').index, continuation: { type: 'READY_TO_END' } }
  }
  const requestedCard = [...CHANCE_CARDS, ...FATE_CARDS].find((card) => card.id === query.get('card'))
  const deckKind = requestedCard?.deck ?? query.get('deck')
  if (deckKind === 'chance' || deckKind === 'fate') {
    const deck = deckKind === 'chance' ? game.chanceDeck : game.fateDeck
    if (requestedCard) deck.order = [requestedCard.id, ...deck.order.filter((id) => id !== requestedCard.id)]
    game.players[0]!.position = getTileById(deckKind === 'chance' ? 'chance-south' : 'fate-east').index
    game.pendingCardChoice = { id: `preview-choice-${game.revision}`, playerId: 'xiaoman', deck: deckKind, cardIds: [deck.order[0]!, deck.order[1]!, deck.order[2]!], depth: 0 }
    game.phase = 'WAITING_FOR_CARD_CHOICE'
  }
  if (requestedCard) return applyCommand(game, 'xiaoman', { type: 'CHOOSE_CARD', choiceId: game.pendingCardChoice!.id, cardIndex: 0 }, () => .5).state
  if (query.has('result')) {
    // Deliberately illustrative data for artwork exports, never used in live rooms.
    game.phase = 'FINISHED'; game.winnerPlayerId = 'xiaoman'; game.turnNumber = 148
    game.statistics.startedAt = Date.now() - 3475000; game.statistics.finishedAt = Date.now()
    game.statistics.eliminations = [
      { playerId: 'xiaoyu', turnNumber: 104, reason: 'bankruptcy' },
      { playerId: 'muzi', turnNumber: 126, reason: 'bankruptcy' },
      { playerId: 'alan', turnNumber: 148, reason: 'bankruptcy' },
    ]
    const values = [
      [42800, 18500, 7400, 9, 465, 5, 4, 1, 250],
      [30100, 8800, 16800, 8, 410, 4, 11, 1, 500],
      [27900, 6100, 12000, 7, 502, 7, 5, 4, 600],
      [25300, 3200, 14500, 6, 389, 3, 3, 2, 1500],
    ]
    game.players.forEach((player, index) => {
      const v = values[index]!
      Object.assign(game.statistics.players[player.id]!, { peakNetWorth: v[0], rentReceived: v[1], rentPaid: v[2], assetsAcquired: v[3], steps: v[4], itemUses: v[5], doubles: v[6], trapHits: v[7], bestAuctionSaving: v[8], auctionWins: 2 })
      if (index) { player.isBankrupt = true; player.cash = 0 }
    })
    game.statistics.players.xiaoman!.receivedFrom = { alan: 9200, muzi: 6200, xiaoyu: 3100 }
    game.statistics.players.xiaoman!.earnedByTile = { [getTileById('上海').index]: 9800, [getTileById('香港').index]: 6000, [getTileById('东京').index]: 2700 }
    game.statistics.largestPayment = { payerId: 'alan', receiverId: 'xiaoman', tileIndex: getTileById('上海').index, amount: 4200, turnNumber: 148 }
    game.statistics.bestAuction = { playerId: 'xiaoyu', tileIndex: getTileById('巴黎').index, amount: getTileById('巴黎').price! - 1500, saving: 1500, turnNumber: 69 }
  }
  return game
}

export default function GamePreview() {
  const [game, setGame] = useState(previewGame)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<GameEvent[]>(() => new URLSearchParams(location.search).has('card') ? game.actionLog.filter((event) => event.revision === game.revision) : [])
  const viewer = new URLSearchParams(location.search).get('viewer')
  const playerId = game.players.some((player) => player.id === viewer) ? viewer! : 'xiaoman'
  const room: RoomSnapshot = {
    roomCode: '画面预览', phase: game.phase === 'FINISHED' ? 'finished' : 'playing', turnDeadline: null, serverTime: Date.now(),
    settings: { maxPlayers: 6, turnSeconds: 30 },
    players: game.players.map((player, index) => ({ id: player.id, name: player.name, token: player.token, connected: true, ready: true, isHost: index === 0 })),
  }
  const command = (input: GameCommand) => {
    const result = applyCommand(game, playerId, input)
    if (result.ok) { setError(null); setGame(result.state); setEvents((current) => [...current, ...result.events].slice(-120)) }
    else setError(result.error ?? '操作未完成')
  }
  useEffect(() => {
    const wheel = game.pendingWheel
    if (wheel?.stage !== 'spinning' || wheel.startedAt === null) return
    const timer = window.setTimeout(() => {
      const result = applyCommand(game, wheel.playerId, { type: 'RESOLVE_WHEEL', wheelId: wheel.id })
      if (result.ok) { setGame(result.state); setEvents(current => [...current, ...result.events].slice(-120)) }
    }, Math.max(0, wheel.startedAt + WHEEL_SPIN_MS - Date.now()))
    return () => window.clearTimeout(timer)
  }, [game])
  return <ModalErrorContext.Provider value={{ error, clear: () => setError(null) }}><CommandAvailabilityContext.Provider value><GamePage game={publicGameState(game, playerId)} room={room} playerId={playerId} events={events} connectionStatus="connected" onCommand={command} onRestart={() => { setGame(previewGame()); setEvents([]); setError(null) }} onLeave={() => location.assign('/')} /></CommandAvailabilityContext.Provider></ModalErrorContext.Provider>
}
