interface Frame { time: number; delta: number; reducedMotion: boolean }
interface SceneLoop {
  host: HTMLElement | SVGElement
  priority: 'board' | 'foreground'
  render: (frame: Frame) => boolean
  dirty: boolean
  animating: boolean
  visible: boolean
  enabled: boolean
  nextAt: number
  previous: number
}

const scenes = new Set<SceneLoop>()
const timelines = new Set<(time: number) => boolean>()
let listening = false
let frameId = 0, timer = 0
let motionPreference: MediaQueryList | null = null
const ready = (scene: SceneLoop) => scene.visible && scene.enabled && (scene.dirty || scene.animating)
const label = (scene: SceneLoop, state: string) => { if (scene.host.dataset.renderState !== state) scene.host.dataset.renderState = state }

function schedule() {
  if (frameId || timer || document.hidden) return
  const pending = [...scenes].filter(ready)
  if (!pending.length && !timelines.size) return
  const delay = timelines.size ? 0 : Math.min(...pending.map((scene) => scene.dirty ? 0 : scene.nextAt - performance.now()))
  // Wake before the target frame; waiting a full interval then asking for RAF halves 60 Hz motion.
  if (delay > 1000 / 60 + 1) timer = window.setTimeout(() => { timer = 0; schedule() }, Math.max(1, Math.floor(delay - 1000 / 60)))
  else frameId = requestAnimationFrame(draw)
}

function draw(time: number) {
  frameId = 0
  if (document.hidden) return
  for (const tick of timelines) if (!tick(time)) timelines.delete(tick)
  stopListeningIfIdle()
  // Render foreground animations first, so the board can share the remaining budget.
  const pending = [...scenes].filter(ready).sort((a, b) => Number(b.priority === 'foreground') - Number(a.priority === 'foreground'))
  for (const scene of pending) {
    if (!scenes.has(scene) || (!scene.dirty && scene.nextAt > time + 1)) continue
    scene.dirty = false
    const delta = Math.min(.05, Math.max(0, (time - scene.previous) / 1000)); scene.previous = time
    scene.animating = scene.render({ time, delta, reducedMotion: motionPreference?.matches ?? false })
    const foregroundBusy = [...scenes].some((candidate) => candidate.priority === 'foreground' && candidate.animating && candidate.visible && candidate.enabled)
    scene.nextAt = time + 1000 / (scene.priority === 'board' && foregroundBusy ? 15 : 60)
    label(scene, scene.animating ? 'animating' : 'idle')
  }
  schedule()
}

function invalidateAll() {
  for (const scene of scenes) { scene.dirty = true; scene.previous = performance.now() }
  schedule()
}

function visibilityChanged() {
  if (document.hidden) {
    cancelAnimationFrame(frameId); window.clearTimeout(timer); frameId = timer = 0
    scenes.forEach((scene) => label(scene, 'suspended'))
  } else invalidateAll()
}

/** All game canvases share one RAF. A render returns true only while it needs another frame. */
export function sceneRenderLoop(host: HTMLElement | SVGElement, priority: SceneLoop['priority'], render: SceneLoop['render']) {
  startListening()
  const scene: SceneLoop = { host, priority, render, dirty: true, animating: false, visible: false, enabled: true, nextAt: 0, previous: performance.now() }
  scenes.add(scene)
  const invalidate = () => {
    if (!scenes.has(scene)) return
    scene.dirty = true
    if (scene.visible && scene.enabled && !document.hidden) label(scene, 'pending')
    // An input must not wait for a background scene's throttled timer.
    window.clearTimeout(timer); timer = 0; schedule()
  }
  const observer = new IntersectionObserver(([entry]) => {
    scene.visible = entry?.isIntersecting ?? true
    if (scene.visible) invalidate()
    else label(scene, 'suspended')
  })
  observer.observe(host); schedule()
  return {
    invalidate,
    setEnabled(enabled: boolean) { scene.enabled = enabled; if (enabled) invalidate(); else label(scene, 'suspended') },
    dispose() {
      observer.disconnect(); scenes.delete(scene)
      stopListeningIfIdle()
    },
  }
}

function startListening() {
  if (listening) return
  listening = true
  motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
  motionPreference.addEventListener('change', invalidateAll)
  document.addEventListener('visibilitychange', visibilityChanged)
}
function stopListeningIfIdle() {
  if (scenes.size || timelines.size || !listening) return
  listening = false
  cancelAnimationFrame(frameId); window.clearTimeout(timer); frameId = timer = 0
  document.removeEventListener('visibilitychange', visibilityChanged)
  motionPreference?.removeEventListener('change', invalidateAll); motionPreference = null
}

/** Logical event playback and canvases advance on the same clock. */
export function subscribePresentationFrames(tick: (time: number) => boolean): () => void {
  startListening()
  timelines.add(tick)
  window.clearTimeout(timer); timer = 0; schedule()
  return () => { timelines.delete(tick); stopListeningIfIdle() }
}
