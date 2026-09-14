import { type DiceValues, type GameEvent, type GameView } from '@fortune/game'
import { useCallback, useEffect, useRef, useState } from 'react'
import { playEventSound } from '../audio/sound.js'
import { eventDuration, movementFrame } from './presentationTimings.js'
import { subscribePresentationFrames } from './SceneRenderLoop.js'

const positions = (game: GameView) => Object.fromEntries(game.players.map((player) => [player.id, player.position]))

function hazardsBefore(game: GameView, events: GameEvent[]) {
  let hazards = [...game.hazards]
  for (const event of [...events].reverse()) {
    if (!event.hazard) continue
    if (event.type === 'ITEM_USED') hazards = hazards.filter((hazard) => hazard.id !== event.hazard!.id)
    if (event.type === 'HAZARD_TRIGGERED' && !hazards.some((hazard) => hazard.id === event.hazard!.id)) hazards.push(event.hazard)
  }
  return hazards
}

export function useGamePresentation(game: GameView, events: GameEvent[], soundEnabled: boolean) {
  const [displayPositions, setDisplayPositions] = useState(() => positions(game))
  const [displayHazards, setDisplayHazards] = useState(() => hazardsBefore(game, events))
  const [displayDice, setDisplayDice] = useState<DiceValues>(game.lastRoll?.dice ?? [1, 1])
  const [queue, setQueue] = useState<GameEvent[]>([])
  const [presentedEvents, setPresentedEvents] = useState<GameEvent[]>(() => game.actionLog.filter((event) => !events.some((incoming) => incoming.id === event.id)))
  const [eventTiming, setEventTiming] = useState({ id: '', startedAt: 0 })
  const seen = useRef(new Set<string>())
  const latest = useRef({ game, events, soundEnabled })
  latest.current = { game, events, soundEnabled }
  const activeEvent = queue[0] && eventDuration(queue[0]) > 0 ? queue[0] : null

  const skipToLive = useCallback(() => {
    const { game: current, events: incoming } = latest.current
    incoming.forEach((event) => seen.current.add(event.id))
    setQueue([])
    setPresentedEvents(current.actionLog)
    setDisplayPositions(positions(current))
    setDisplayHazards(current.hazards)
    setDisplayDice(current.lastRoll?.dice ?? [1, 1])
  }, [])

  useEffect(() => {
    const additions = events.filter((event) => !seen.current.has(event.id))
    additions.forEach((event) => seen.current.add(event.id))
    if (additions.length) setQueue((current) => [...current, ...additions])
    // Bound memory to the retained transport window.
    seen.current = new Set(events.map((event) => event.id))
  }, [events])

  useEffect(() => {
    const nextAnimation = queue.findIndex(event => eventDuration(event) > 0)
    const immediate = nextAnimation < 0 ? queue : queue.slice(0, nextAnimation)
    if (!immediate.length) return
    // Publish related results together; only motion occupies the action timeline.
    const ids = new Set(immediate.map(event => event.id))
    setPresentedEvents(current => [...current.filter(event => !ids.has(event.id)), ...immediate].slice(-300))
    setDisplayHazards(current => {
      let hazards = current
      for (const event of immediate) {
        if (event.type === 'ITEM_USED' && event.hazard) hazards = [...hazards.filter(hazard => hazard.id !== event.hazard!.id), event.hazard]
        if (event.type === 'HAZARD_TRIGGERED' && event.hazard) hazards = hazards.filter(hazard => hazard.id !== event.hazard!.id)
      }
      return hazards
    })
    const audible = immediate.findLast(event => !['TURN_CHANGED', 'AUCTION_BID', 'EXTRA_MOVE_FINISHED'].includes(event.type))
    if (audible) playEventSound(audible.type, latest.current.soundEnabled)
    setQueue(current => current.filter(event => !ids.has(event.id)))
  }, [queue])

  useEffect(() => {
    if (!queue.length && events.every((event) => presentedEvents.some((shown) => shown.id === event.id))) { setDisplayPositions(positions(game)); setDisplayHazards(game.hazards) }
  }, [game.players, queue.length, events, presentedEvents])

  useEffect(() => {
    // Returning from a background tab should restore the live board, not replay expired decisions.
    const visible = () => { if (!document.hidden) skipToLive() }
    document.addEventListener('visibilitychange', visible)
    return () => document.removeEventListener('visibilitychange', visible)
  }, [skipToLive])

  useEffect(() => {
    if (!activeEvent) return
    const event = activeEvent
    const startedAt = performance.now()
    setEventTiming({ id: event.id, startedAt })
    const publish = () => setPresentedEvents((current) => current.some((item) => item.id === event.id) ? current : [...current, event].slice(-300))
    if (event.type !== 'DICE_ROLLED') publish()
    if (event.type === 'ITEM_USED' && event.hazard) setDisplayHazards((current) => [...current.filter((hazard) => hazard.id !== event.hazard!.id), event.hazard!])
    if (event.type === 'HAZARD_TRIGGERED' && event.hazard) setDisplayHazards((current) => current.filter((hazard) => hazard.id !== event.hazard!.id))
    playEventSound(event.type, latest.current.soundEnabled)
    if (event.type === 'DICE_ROLLED' && event.dice) setDisplayDice(event.dice)
    if ((event.type === 'PLAYER_SENT_TO_JAIL' || event.type === 'PLAYER_SENT_TO_HOSPITAL') && event.playerId && event.to !== undefined) setDisplayPositions(current => ({ ...current, [event.playerId!]: event.to! }))
    let displayedTile: number | undefined
    return subscribePresentationFrames(time => {
      const elapsed = time - startedAt
      const motion = event.type === 'TOKEN_MOVED' ? movementFrame(event, elapsed) : null
      if (motion && event.playerId && motion.to !== displayedTile) {
        displayedTile = motion.to
        setDisplayPositions(current => ({ ...current, [event.playerId!]: motion.to }))
      }
      if (elapsed < eventDuration(event)) return true
      if (event.type === 'DICE_ROLLED') publish()
      setQueue(current => current.filter(item => item.id !== event.id))
      return false
    })
  }, [activeEvent])

  return { displayPositions, displayHazards, displayDice, activeEvent, activeEventStartedAt: eventTiming.id === activeEvent?.id ? eventTiming.startedAt : 0, isPlaying: queue.some(event => eventDuration(event) > 0) || events.some(event => !seen.current.has(event.id) && eventDuration(event) > 0),
    presentedEvents, skipToLive }
}
