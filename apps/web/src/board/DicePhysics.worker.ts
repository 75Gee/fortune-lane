import { simulateDice } from './DicePhysics.js'

self.onmessage = ({ data }: MessageEvent<{ id: number; seed: string; count: 1 | 2 }>) => {
  self.postMessage({ id: data.id, frames: simulateDice(data.seed, data.count) })
}
