import type { GameEvent } from '@fortune/game'
import { useEffect, useRef, useState } from 'react'
import { moneyDeltas } from '../../lib/moneyEvents.js'

export interface FloatingDelta {
  key: string
  amount: number
}

export interface MoneyNotice {
  key: string
  amount: number
  message: string
}

const DELTA_MS = 2400
const NOTICE_MS = 4000

/**
 * Turns newly presented events into short-lived cash deltas per player and a notice when money
 * moves to or from the viewer through someone else (rent, cards, auctions). Events already in the
 * log when the page mounts are not replayed.
 */
export function useMoneyFeedback(presentedEvents: readonly GameEvent[], playerId: string) {
  const seen = useRef<Set<string> | null>(null)
  const [deltas, setDeltas] = useState<Record<string, FloatingDelta[]>>({})
  const [notice, setNotice] = useState<MoneyNotice | null>(null)

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(presentedEvents.map((event) => event.id))
      return
    }
    const fresh = presentedEvents.filter((event) => !seen.current!.has(event.id))
    if (!fresh.length) return
    const added: Record<string, FloatingDelta[]> = {}
    for (const event of fresh) {
      seen.current.add(event.id)
      for (const delta of moneyDeltas(event)) {
        const key = `${event.id}:${delta.playerId}`
        ;(added[delta.playerId] ??= []).push({ key, amount: delta.amount })
        const mine = delta.playerId === playerId
        // Own purchases and pass-start subsidies are expected; rent, cards and auctions deserve a notice.
        if (mine && (delta.kind === 'rent' || delta.kind === 'bank' || delta.kind === 'auction'))
          setNotice({ key, amount: delta.amount, message: event.message })
      }
    }
    if (!Object.keys(added).length) return
    setDeltas((current) => {
      const next = { ...current }
      for (const [id, list] of Object.entries(added)) next[id] = [...(next[id] ?? []), ...list]
      return next
    })
    const keys = new Set(Object.values(added).flatMap((list) => list.map((entry) => entry.key)))
    window.setTimeout(() => {
      setDeltas((current) =>
        Object.fromEntries(
          Object.entries(current).map(([id, list]) => [id, list.filter((entry) => !keys.has(entry.key))]),
        ),
      )
    }, DELTA_MS)
  }, [presentedEvents, playerId])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  return { deltas, notice, dismissNotice: () => setNotice(null) }
}
