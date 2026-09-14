import { simulateDiceAsync, type DiceFrame } from './DicePhysics.js'

export function diceTrajectories() {
  let worker: Worker | null = null, sequence = 0, disposed = false
  const pending = new Map<number, { seed: string; count: 1 | 2; resolve: (frames: DiceFrame[]) => void }>()
  try { worker = new Worker(new URL('./DicePhysics.worker.ts', import.meta.url), { type: 'module' }) } catch { /* Chunked fallback also yields to the UI. */ }
  if (worker) {
    worker.onmessage = ({ data }: MessageEvent<{ id: number; frames: DiceFrame[] }>) => {
      pending.get(data.id)?.resolve(data.frames); pending.delete(data.id)
    }
    worker.onerror = () => {
      worker?.terminate(); worker = null
      for (const request of pending.values()) void simulateDiceAsync(request.seed, request.count).then(request.resolve)
      pending.clear()
    }
  }
  const prepare = (count: 1 | 2) => {
    const id = ++sequence, seed = `throw-${id}-${Math.random()}`
    if (!worker) return simulateDiceAsync(seed, count)
    return new Promise<DiceFrame[]>(resolve => {
      pending.set(id, { seed, count, resolve }); worker!.postMessage({ id, seed, count })
    })
  }
  // Prepare cosmetic trajectories before a roll; face numbering still comes from the server.
  const ready = { 1: prepare(1), 2: prepare(2) }
  return {
    next(count: 1 | 2 = 2) {
      if (disposed) return Promise.resolve([] as DiceFrame[])
      const result = ready[count]; ready[count] = prepare(count); return result
    },
    dispose() {
      disposed = true; worker?.terminate()
      pending.forEach(request => request.resolve([])); pending.clear()
    },
  }
}
