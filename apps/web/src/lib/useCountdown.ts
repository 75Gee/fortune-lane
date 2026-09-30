import { useEffect, useRef, useState } from 'react'

/**
 * Seconds left until a server deadline, plus the fraction remaining. The server only sends the
 * deadline, so the span is taken from the first time each deadline is seen (turns, auctions and
 * debts all have different lengths).
 */
export function useCountdown(deadline: number | null, offset: number) {
  const [now, setNow] = useState(Date.now())
  const span = useRef<{ deadline: number; total: number } | null>(null)
  useEffect(() => {
    if (deadline === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [deadline])
  if (deadline === null) return null
  const remaining = Math.max(0, deadline - now - offset)
  if (span.current?.deadline !== deadline) span.current = { deadline, total: Math.max(remaining, 1) }
  return {
    seconds: Math.ceil(remaining / 1000),
    fraction: Math.min(1, remaining / span.current.total),
  }
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const change = () => setMatches(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [query])
  return matches
}
