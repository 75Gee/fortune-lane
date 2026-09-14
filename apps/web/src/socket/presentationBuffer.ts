import type { GameEvent } from '@fortune/game'

export function appendEvents(current: GameEvent[], incoming: GameEvent[]): GameEvent[] {
  const events = new Map(current.map(event => [event.id, event]))
  for (const event of incoming) events.set(event.id, event)
  return [...events.values()].slice(-120)
}

/** Events may arrive before snapshots; release only revisions we can render. */
export class PresentationBuffer {
  private pending = new Map<string, GameEvent>()
  reset(): void { this.pending.clear() }
  stage(events: GameEvent[]): void {
    for (const event of events) this.pending.set(event.id, event)
    while (this.pending.size > 300) this.pending.delete(this.pending.keys().next().value!)
  }
  release(revision: number): GameEvent[] {
    const ready: GameEvent[] = []
    for (const [id, event] of this.pending) if (event.revision <= revision) { ready.push(event); this.pending.delete(id) }
    return ready
  }
}
