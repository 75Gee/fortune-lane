import { DICE_ROLL_MS, type DiceValues } from '@fortune/game'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { diceTrajectories } from './DiceTrajectories.js'
import type { DiceFrame } from './DicePhysics.js'
import { contactShadows } from './ContactShadows.js'
import { sceneRenderLoop } from './SceneRenderLoop.js'
import { disposeScene } from './sceneUtils.js'

const pips: Record<number, [number, number][]> = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
}
const faceValues = [3, 4, 1, 6, 2, 5]
const normals = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]

function faceTexture(value: number, bump: boolean, second: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  context.fillStyle = bump ? '#fff' : second ? '#e1f1eb' : '#fffaf0'
  context.fillRect(0, 0, 128, 128)
  for (const [x, y] of pips[value]!) {
    const cx = 64 + x * 30, cy = 64 + y * 30
    const shade = context.createRadialGradient(cx, cy, 5, cx, cy, 11)
    shade.addColorStop(0, bump ? '#454545' : second ? '#175949' : '#34465e')
    shade.addColorStop(.72, bump ? '#666' : second ? '#287963' : '#52647a')
    shade.addColorStop(1, bump ? '#fff' : second ? '#a2cabb' : '#d2cec3')
    context.fillStyle = shade
    context.beginPath()
    context.arc(cx, cy, 11, 0, Math.PI * 2)
    context.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  if (!bump) texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function DiceFallback({ dice, rolling = false }: { dice: DiceValues; rolling?: boolean }) {
  return <div className={`dice-fallback ${rolling ? 'is-rolling' : ''}`}>
    {dice.map((value, index) => <svg key={index} viewBox="0 0 64 64" aria-hidden="true"><rect x="3" y="5" width="58" height="56" rx="10" fill={index ? '#a5c6b9' : '#c9c7be'} /><rect x="3" y="2" width="58" height="56" rx="10" fill={index ? '#e1f1eb' : '#fffaf0'} stroke="#bcc9cd" />{pips[value]?.map(([x, y]) => <circle key={`${x}-${y}`} cx={32 + x * 14} cy={29 + y * 14} r="4.5" fill={index ? '#287963' : '#34465e'} />)}</svg>)}
  </div>
}

export default function DiceScene({ dice, rollId, rollStartedAt }: { dice: DiceValues; rollId: string | null; rollStartedAt: number }) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const latest = useRef({ dice, rollId, rollStartedAt })
  latest.current = { dice, rollId, rollStartedAt }
  const controls = useRef<((values: DiceValues, animate: boolean, startedAt: number) => void) | null>(null)

  useEffect(() => {
    const container = host.current
    if (!container) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = false
    renderer.setClearColor(0x000000, 0)
    container.append(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-4.8, 4.8, 3, -3, .1, 50)
    camera.position.set(0, 9, 6)
    camera.lookAt(0, .85, 0)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x799a9b, 2.2))
    const light = new THREE.DirectionalLight(0xffffff, 3)
    light.position.set(-3, 7, 4)
    scene.add(light)
    const grounding = contactShadows(scene, 2)
    const footprints = [0, 1].map(() => grounding.add({ x: 0, y: .012, z: 0, width: 1.7, depth: 1.5, opacity: .22, shape: 'rounded' }))
    const tray = new THREE.Group(); scene.add(tray)
    const trayMaterial = new THREE.MeshStandardMaterial({ color: '#9cb9ac', roughness: .85 })
    for (const [x, z, width, depth] of [[-3.45, 0, .24, 4.52], [3.45, 0, .24, 4.52], [0, -2.2, 7.14, .24], [0, 2.2, 7.14, .24]] as const) {
      const edgeGeometry = new RoundedBoxGeometry(width, .26, depth, 2, .05)
      const edge = new THREE.Mesh(edgeGeometry, trayMaterial); edge.position.set(x, .13, z); edge.castShadow = edge.receiveShadow = true; tray.add(edge)
    }
    const geometry = new RoundedBoxGeometry(1.2, 1.2, 1.2, 3, .13)
    const diceMeshes = [0, 1].map((index) => {
      const faces = faceValues.map((value) => {
        const material = new THREE.MeshStandardMaterial({ map: faceTexture(value, false, index === 1), bumpMap: faceTexture(value, true, index === 1), bumpScale: .075, roughness: .3, metalness: .06 })
        return material
      })
      const mesh = new THREE.Mesh(geometry, faces)
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
      return mesh
    })
    const originalFaces = diceMeshes.map(mesh => [...mesh.material])
    const trajectories = diceTrajectories()
    let generation = 0
    let animation: { frames: DiceFrame[]; count: number; startedAt: number } | null = null
    const position = new THREE.Vector3(), rotation = new THREE.Quaternion()
    const loop = sceneRenderLoop(container, 'foreground', ({ time, reducedMotion }) => {
      let moving = false
      tray.visible = latest.current.rollId !== null && !reducedMotion
      if (animation) {
        const { frames, count, startedAt } = animation
        const elapsed = Math.max(0, time - startedAt)
        const progress = reducedMotion ? 1 : Math.min(1, elapsed / DICE_ROLL_MS)
        const at = progress * (frames.length - 1), lower = Math.floor(at), upper = Math.min(frames.length - 1, lower + 1)
        diceMeshes.forEach((mesh, index) => {
          if (index >= count) return
          const from = frames[lower]!.dice[index]!, to = frames[upper]!.dice[index]!
          mesh.position.fromArray(from.position).lerp(position.fromArray(to.position), at - lower)
          mesh.quaternion.fromArray(from.quaternion).slerp(rotation.fromArray(to.quaternion), at - lower)
        })
        moving = !reducedMotion && progress < 1
        if (!moving) animation = null
      }
      diceMeshes.forEach((mesh, index) => {
        const height = Math.max(0, mesh.position.y - .6)
        footprints[index]!.set({ x: mesh.position.x, z: mesh.position.z, width: 1.7 + height * .16, depth: 1.5 + height * .14, opacity: mesh.visible ? .22 / (1 + height * .45) : 0 })
      })
      renderer.render(scene, camera)
      return moving
    })
    const resize = () => {
      const width = container.clientWidth, height = container.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height, false)
      const aspect = width / height
      camera.left = -2.85 * aspect
      camera.right = 2.85 * aspect
      camera.top = 2.85
      camera.bottom = -2.85
      camera.updateProjectionMatrix()
      loop.invalidate()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    const play = (values: DiceValues, animate: boolean, startedAt: number) => {
      animation = null
      const request = ++generation
      diceMeshes.forEach((mesh, index) => { mesh.visible = index < values.length })
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      tray.visible = animate && !reduced
      if (!animate || reduced) {
        diceMeshes.forEach((mesh, index) => {
          if (index >= values.length) return
          mesh.material = originalFaces[index]!
          mesh.position.set(values.length === 1 ? 0 : index ? .95 : -.95, .6, 0)
          mesh.quaternion.setFromUnitVectors(normals[faceValues.indexOf(values[index]!)]!, new THREE.Vector3(0, 1, 0))
        })
        loop.invalidate(); return
      }
      void trajectories.next(values.length).then(frames => {
      if (request !== generation || !frames.length) return
      const final = frames.at(-1)!
      diceMeshes.forEach((mesh, index) => {
          if (index >= values.length) return
        const rotation = new THREE.Quaternion().fromArray(final.dice[index]!.quaternion)
        let top = 0, highest = -Infinity
        normals.forEach((normal, face) => { const height = normal.clone().applyQuaternion(rotation).y; if (height > highest) { highest = height; top = face } })
        const mapping = new THREE.Quaternion().setFromUnitVectors(normals[faceValues.indexOf(values[index]!)]!, normals[top]!)
        mesh.material = normals.map(normal => originalFaces[index]![normals.findIndex(source => source.clone().applyQuaternion(mapping).dot(normal) > .99)]!)
      })
      animation = { frames, count: values.length, startedAt }
      loop.invalidate()
      })
    }
    controls.current = play
    const lost = (event: Event) => { event.preventDefault(); loop.setEnabled(false); setFailed(true) }
    renderer.domElement.addEventListener('webglcontextlost', lost)
    resize()
    play(latest.current.dice, latest.current.rollId !== null, latest.current.rollStartedAt)
    return () => {
      controls.current = null
      generation++; trajectories.dispose()
      loop.dispose()
      observer.disconnect()
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      disposeScene(scene)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => { controls.current?.(dice, rollId !== null, rollStartedAt) }, [dice[0], dice[1], rollId, rollStartedAt])

  return <div className={`dice-scene ${failed ? 'has-fallback' : ''}`} role="img" aria-label={rollId ? '骰子投掷中' : `骰子点数 ${dice.join(" 和 ")}`}>
    <div className="dice-canvas" ref={host} aria-hidden="true" />
    {failed && <DiceFallback dice={dice} rolling={rollId !== null} />}
  </div>
}
