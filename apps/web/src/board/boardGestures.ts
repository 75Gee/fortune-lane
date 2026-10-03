import type * as THREE from 'three'
import type { BoardCameraRig } from './boardCameraRig.js'

interface Point {
  x: number
  y: number
}

/**
 * Pointer gestures on the board canvas: one finger or the mouse drags the map, two fingers pinch
 * around their midpoint, the wheel zooms at the cursor, and a still tap selects what is under it.
 */
export function bindBoardGestures(
  canvas: HTMLCanvasElement,
  rig: BoardCameraRig,
  { onTap, onChange }: { onTap: (x: number, y: number) => void; onChange: () => void },
): () => void {
  const pointers = new Map<number, Point>()
  let start: Point | null = null,
    anchor: THREE.Vector3 | null = null,
    tap = false,
    dragging = false,
    pinch: { spread: number; distance: number } | null = null,
    samples: { t: number; dx: number; dz: number }[] = []

  const local = (event: PointerEvent | WheelEvent): Point => {
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const pair = () => {
    const [a, b] = [...pointers.values()] as [Point, Point]
    return { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, spread: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) }
  }
  const beginPinch = () => {
    const { mid, spread } = pair()
    rig.grab()
    anchor = rig.groundAt(mid.x, mid.y)
    pinch = { spread, distance: rig.distance }
  }
  const beginDrag = (point: Point) => {
    rig.grab()
    anchor = rig.groundAt(point.x, point.y)
    dragging = true
    samples = []
    canvas.style.cursor = 'grabbing'
  }

  const down = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    canvas.setPointerCapture(event.pointerId)
    const point = local(event)
    pointers.set(event.pointerId, point)
    if (pointers.size === 1) {
      start = { ...point }
      dragging = false
      // A touch that stops a glide only stops it; it does not also select a tile.
      tap = !rig.gliding
      if (rig.gliding) {
        rig.grab()
        rig.letGo()
        onChange()
      }
    } else {
      tap = false
      dragging = false
      if (pointers.size === 2) beginPinch()
    }
  }

  const move = (event: PointerEvent) => {
    const point = pointers.get(event.pointerId)
    if (!point) return
    Object.assign(point, local(event))
    if (pointers.size >= 2 && pinch && anchor) {
      const { mid, spread } = pair()
      rig.zoomAt((pinch.distance * pinch.spread) / spread, anchor, mid.x, mid.y)
      onChange()
      return
    }
    if (pointers.size !== 1 || !start) return
    if (!dragging) {
      const slop = event.pointerType === 'mouse' ? 5 : 10
      if (Math.hypot(point.x - start.x, point.y - start.y) <= slop) return
      tap = false
      beginDrag(start)
    }
    if (!anchor) return
    const moved = rig.drag(anchor, point.x, point.y)
    // Re-anchoring keeps the edge resistance from snapping back when the finger reverses.
    anchor = rig.groundAt(point.x, point.y) ?? anchor
    const t = event.timeStamp
    samples.push({ t, ...moved })
    while (samples.length > 1 && t - samples[0]!.t > 90) samples.shift()
    onChange()
  }

  const end = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    if (pointers.size >= 2) {
      beginPinch()
      return
    }
    if (pointers.size === 1) {
      // Lifting one finger of a pinch carries on as a drag with the other.
      pinch = null
      beginDrag([...pointers.values()][0]!)
      return
    }
    const point = local(event)
    if (tap && event.type === 'pointerup') onTap(point.x, point.y)
    else if (dragging) {
      const span = samples.length > 1 ? (event.timeStamp - samples[0]!.t) / 1000 : 0
      // A finger that paused before lifting should not throw the board.
      const fresh = samples.length > 1 && event.timeStamp - samples.at(-1)!.t < 60
      if (span > 0 && fresh) {
        const total = samples.slice(1).reduce((sum, s) => ({ dx: sum.dx + s.dx, dz: sum.dz + s.dz }), { dx: 0, dz: 0 })
        rig.fling(total.dx / span, total.dz / span)
      } else rig.letGo()
    } else if (pinch) rig.letGo()
    start = anchor = pinch = null
    tap = dragging = false
    canvas.style.cursor = ''
    onChange()
  }

  const wheel = (event: WheelEvent) => {
    event.preventDefault()
    const point = local(event)
    const lines = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1
    // Trackpad pinches arrive as ctrl+wheel with small deltas.
    const rate = event.ctrlKey ? 0.01 : 0.0015
    rig.grab()
    const at = rig.groundAt(point.x, point.y)
    if (at) rig.zoomAt(rig.distance * Math.exp(event.deltaY * lines * rate), at, point.x, point.y)
    rig.letGo()
    onChange()
  }
  const blockPageZoom = (event: Event) => event.preventDefault()

  canvas.style.touchAction = 'none'
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', end)
  canvas.addEventListener('pointercancel', end)
  canvas.addEventListener('wheel', wheel, { passive: false })
  canvas.addEventListener('gesturestart', blockPageZoom)
  return () => {
    canvas.removeEventListener('pointerdown', down)
    canvas.removeEventListener('pointermove', move)
    canvas.removeEventListener('pointerup', end)
    canvas.removeEventListener('pointercancel', end)
    canvas.removeEventListener('wheel', wheel)
    canvas.removeEventListener('gesturestart', blockPageZoom)
  }
}
