import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { BOARD, BOARD_GRID_SIZE, BOARD_SIDE_STEPS } from '@fortune/game'
import { canvasTexture, solid, withSolidMaterialCache } from './sceneUtils.js'
import { batchStaticLandmarks } from './batchStaticLandmarks.js'
import { bangkokDistrict } from './BangkokDistrict.js'
import { CORNER_CELL_SIZE, cornerFootprint, cornerLandmark } from './CornerLandmarks.js'
import {
  amsterdamLandmark,
  athensLandmark,
  barcelonaLandmark,
  beijingLandmark,
  berlinLandmark,
  dubaiLandmark,
  istanbulLandmark,
  londonLandmark,
  losAngelesLandmark,
  melbourneLandmark,
  newYorkLandmark,
  parisLandmark,
  romeLandmark,
  sanFranciscoLandmark,
  seoulLandmark,
  shanghaiLandmark,
  singaporeLandmark,
  sydneyLandmark,
  tokyoLandmark,
  torontoLandmark,
  viennaLandmark,
} from './CityLandmarks.js'
import { airportLandmark, eventLandmark, taxLandmark, utilityBadge, utilityLandmark } from './LandmarkModels.js'
import { BOARD_SIZE, inwardAt, landmarkPosition, TILE_SIZE, WORLD_SIZE } from './worldRoute.js'
import { itemLandmark } from './ItemModels.js'
import { cairoLandmark, hongKongLandmark } from './ExpansionLandmarks.js'
import { optimizeStaticModel } from './optimizeStaticModel.js'
import type { ContactShadows } from './ContactShadows.js'

interface LandscapeOptions {
  multiDraw: boolean
  /** Landmarks this close to the focus tile (in route steps) are built before the first frame. */
  focusIndex: number
  eagerSteps: number
  /** Called whenever more of the landscape becomes visible; `ready` once it is complete and batched. */
  onChange: (ready: boolean) => void
}

const CITY_LANDMARKS: Record<string, () => THREE.Group> = {
  曼谷: () => bangkokDistrict().group,
  新加坡: singaporeLandmark,
  东京: tokyoLandmark,
  首尔: seoulLandmark,
  悉尼: sydneyLandmark,
  墨尔本: melbourneLandmark,
  迪拜: dubaiLandmark,
  伊斯坦布尔: istanbulLandmark,
  开罗: cairoLandmark,
  雅典: athensLandmark,
  罗马: romeLandmark,
  维也纳: viennaLandmark,
  柏林: berlinLandmark,
  阿姆斯特丹: amsterdamLandmark,
  巴塞罗那: barcelonaLandmark,
  巴黎: parisLandmark,
  伦敦: londonLandmark,
  多伦多: torontoLandmark,
  纽约: newYorkLandmark,
  洛杉矶: losAngelesLandmark,
  旧金山: sanFranciscoLandmark,
  香港: hongKongLandmark,
  上海: shanghaiLandmark,
  北京: beijingLandmark,
}

export function worldLandscape(scene: THREE.Scene, grounding: ContactShadows, options: LandscapeOptions) {
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const cached = <T>(build: () => T) => withSolidMaterialCache(build, materials)
  scene.background = new THREE.Color('#b8d9e1')
  scene.fog = new THREE.Fog('#b8d9e1', 180, 450)
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ map: seaTexture(), roughness: 0.38, metalness: 0.05 }),
  )
  water.rotation.x = -Math.PI / 2
  water.position.y = -0.95
  scene.add(water)
  cached(() => {
    solid(scene, new RoundedBoxGeometry(WORLD_SIZE + 4, 0.7, WORLD_SIZE + 4, 2, 1), '#a9bca0', 0, -0.48)
    solid(scene, new RoundedBoxGeometry(BOARD_SIZE + 0.15, 0.38, BOARD_SIZE + 0.15, 2, 0.12), '#557e70', 0, -0.06)
    solid(
      scene,
      new THREE.BoxGeometry(TILE_SIZE * (BOARD_GRID_SIZE - 2), 0.08, TILE_SIZE * (BOARD_GRID_SIZE - 2)),
      '#8faf9e',
      0,
      0.14,
    )
  })
  const centerMap = canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = '#8faf9e'
    ctx.fillRect(0, 0, 1024, 1024)
    ctx.strokeStyle = '#9fbcac'
    ctx.lineWidth = 2
    for (let i = 0; i <= BOARD_GRID_SIZE - 2; i++) {
      const p = (i * 1024) / (BOARD_GRID_SIZE - 2)
      ctx.beginPath()
      ctx.moveTo(p, 0)
      ctx.lineTo(p, 1024)
      ctx.moveTo(0, p)
      ctx.lineTo(1024, p)
      ctx.stroke()
    }
    ctx.textAlign = 'center'
    ctx.fillStyle = '#547e6f'
    ctx.font = '600 44px sans-serif'
    ctx.fillText('大富翁世界之旅', 512, 500)
    ctx.font = '20px sans-serif'
    ctx.fillText('WORLD TOUR', 512, 544)
  })
  const center = new THREE.Mesh(
    new THREE.PlaneGeometry(TILE_SIZE * (BOARD_GRID_SIZE - 2), TILE_SIZE * (BOARD_GRID_SIZE - 2)),
    new THREE.MeshStandardMaterial({ map: centerMap, roughness: 1 }),
  )
  center.rotation.x = -Math.PI / 2
  center.position.y = 0.185
  center.receiveShadow = true
  scene.add(center)

  const lots: THREE.Mesh[] = []
  const lotGeometry = new THREE.BoxGeometry(TILE_SIZE, 0.12, TILE_SIZE)
  const cornerLotGeometry = cornerFootprint(TILE_SIZE, 0.12)
  const padGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.9, 0.025, TILE_SIZE * 0.9)
  const lotMaterial = new THREE.MeshStandardMaterial({ color: '#c2ccbb', roughness: 1 })
  const padMaterial = new THREE.MeshStandardMaterial({ color: '#b3c4a5', roughness: 1 })
  const models: THREE.Group[] = []
  // Shared prototypes are built on first use, so deferred tiles do not pay for them up front.
  const once = <T>(make: () => T) => {
    let value: T | undefined
    return () => (value ??= make())
  }
  const airport = once(airportLandmark),
    utility = once(utilityLandmark),
    chance = once(() => eventLandmark('chance')),
    fate = once(() => eventLandmark('fate'))
  const place = (model: THREE.Group, index: number) => {
    const bounds = new THREE.Box3().setFromObject(model)
    // Preserve the authored central axis; asymmetric details must not shift the building.
    const extent = Math.max(
      Math.abs(bounds.min.x),
      Math.abs(bounds.max.x),
      Math.abs(bounds.min.z),
      Math.abs(bounds.max.z),
    )
    const scale = (TILE_SIZE * 0.9) / (extent * 2)
    model.scale.setScalar(scale)
    model.position.set(0, -bounds.min.y * scale, 0)
    const display = new THREE.Group(),
      inward = inwardAt(index)
    display.add(model)
    display.position.copy(landmarkPosition(index))
    display.position.y = 0.155
    display.rotation.y = Math.atan2(inward.x, inward.z)
    display.traverse((object) => {
      object.userData.tileIndex = index
    })
    scene.add(display)
    models.push(display)
  }
  const jobs: { index: number; build: () => void }[] = []
  for (const tile of BOARD) {
    const position = landmarkPosition(tile.index)
    if (tile.kind === 'go' || tile.kind === 'jail' || tile.kind === 'hospital' || tile.kind === 'go_to_jail') {
      // Quarter turns preserve the three-cell L instead of rotating it diagonally.
      const angle = ((-tile.index / BOARD_SIDE_STEPS) * Math.PI) / 2
      const lot = new THREE.Mesh(cornerLotGeometry, lotMaterial)
      lot.position.copy(position)
      lot.position.y = 0.02
      lot.rotation.y = angle
      lot.receiveShadow = true
      lot.userData.tileIndex = tile.index
      scene.add(lot)
      lots.push(lot)
      const kind = tile.kind
      jobs.push({
        index: tile.index,
        build() {
          const model = cornerLandmark(kind)
          model.scale.setScalar(TILE_SIZE / CORNER_CELL_SIZE)
          model.position.copy(position)
          model.position.y = 0.155
          model.rotation.y = angle
          model.traverse((object) => {
            object.userData.tileIndex = tile.index
          })
          scene.add(model)
          models.push(model)
        },
      })
      for (const [x, z] of [
        [0, 0],
        [-TILE_SIZE, 0],
        [0, -TILE_SIZE],
      ]) {
        const at = new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).add(position)
        // The outer lot top is .08; the main route's taller tiles are a separate row.
        grounding.add({
          x: at.x,
          y: 0.087,
          z: at.z,
          width: 4.1,
          depth: 4.1,
          rotation: angle,
          shape: 'rounded',
          opacity: 0.2,
        })
      }
      continue
    }
    const lot = new THREE.Mesh(lotGeometry, lotMaterial)
    lot.position.copy(position)
    lot.position.y = 0.08
    lot.receiveShadow = true
    lot.userData.tileIndex = tile.index
    scene.add(lot)
    lots.push(lot)
    grounding.add({ x: position.x, y: 0.147, z: position.z, width: 3.98, depth: 3.98, shape: 'rounded', opacity: 0.22 })
    const create: (() => THREE.Group) | undefined =
      CITY_LANDMARKS[tile.id] ??
      (tile.kind === 'item'
        ? itemLandmark
        : tile.kind === 'tax'
          ? () => taxLandmark(tile.id === 'income' ? 'income' : 'maintenance')
          : tile.kind === 'airport'
            ? () => airport().clone(true)
            : tile.kind === 'utility'
              ? () =>
                  utility()
                    .clone(true)
                    .add(utilityBadge(tile.utilityKind ?? 'water'))
              : tile.kind === 'chance'
                ? () => chance().clone(true)
                : tile.kind === 'fate'
                  ? () => fate().clone(true)
                  : undefined)
    if (create) jobs.push({ index: tile.index, build: () => place(create(), tile.index) })
    else {
      const pad = new THREE.Mesh(padGeometry, padMaterial)
      pad.position.y = 0.073
      pad.receiveShadow = true
      pad.userData.tileIndex = tile.index
      lot.add(pad)
    }
  }
  const scenery = cached(seaScenery)
  scene.add(scenery)

  // Landmarks in view come first; the rest follow in idle slices so loading never blocks for long.
  const steps = (index: number) => {
    const distance = Math.abs(index - options.focusIndex) % BOARD.length
    return Math.min(distance, BOARD.length - distance)
  }
  jobs.sort((a, b) => steps(a.index) - steps(b.index))
  const run = (job: (typeof jobs)[number]) =>
    cached(() => {
      const before = models.length
      job.build()
      // Decorative scenery rests while players think; gameplay objects animate separately.
      for (const model of models.slice(before)) optimizeStaticModel(model, new Set())
    })
  let next = 0
  while (next < jobs.length && steps(jobs[next]!.index) <= options.eagerSteps) run(jobs[next++]!)

  let batched: ReturnType<typeof batchStaticLandmarks> | undefined
  let pending = 0,
    disposed = false
  const finish = () => {
    batched = batchStaticLandmarks(scene, [...lots, ...models, scenery], options.multiDraw)
    options.onChange(true)
  }
  const slice = (remaining: () => number) => {
    pending = 0
    if (disposed) return
    // Always progress at least one landmark, even when the idle deadline has already passed.
    do run(jobs[next++]!)
    while (next < jobs.length && remaining() > 4)
    if (next < jobs.length) {
      options.onChange(false)
      schedule()
    } else finish()
  }
  // Safari has no requestIdleCallback; a short timer slice stands in for it.
  const idleCallbacks = typeof requestIdleCallback === 'function'
  const schedule = () => {
    if (idleCallbacks)
      pending = requestIdleCallback((deadline) => slice(() => deadline.timeRemaining()), { timeout: 250 })
    else
      pending = window.setTimeout(() => {
        const end = performance.now() + 8
        slice(() => end - performance.now())
      }, 16)
  }
  if (next < jobs.length) schedule()
  else finish()
  return {
    get ready() {
      return batched !== undefined
    },
    get objects(): THREE.Object3D[] {
      return batched?.objects ?? [...lots, ...models]
    },
    get stats() {
      return batched?.stats ?? { mode: 'building', built: next, total: jobs.length }
    },
    dispose() {
      disposed = true
      if (!pending) return
      if (idleCallbacks) cancelIdleCallback(pending)
      else window.clearTimeout(pending)
    },
  }
}

/** Shallow turquoise at the shore deepening towards the horizon, with a soft foam line. */
function seaTexture() {
  const size = 512,
    shore = WORLD_SIZE / 2 + 2
  const texture = canvasTexture(size, size, (ctx) => {
    const image = ctx.createImageData(size, size)
    // Canvas pixels are sRGB, so stops are interpolated as sRGB bytes rather than linear THREE.Colors.
    const stops = (
      [
        [0, '#cfe9e2'],
        [1.6, '#96d0cc'],
        [12, '#86c3c9'],
        [40, '#7bbac5'],
        [110, '#74b0c0'],
      ] as const
    ).map(([at, hex]) => [at, [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))] as const)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const wx = ((x + 0.5) / size - 0.5) * 700,
          wz = ((y + 0.5) / size - 0.5) * 700
        // A rounded-square distance follows the island outline.
        const distance = (Math.abs(wx) ** 6 + Math.abs(wz) ** 6) ** (1 / 6) - shore
        let i = 0
        while (i < stops.length - 2 && distance > stops[i + 1]![0]) i++
        const [from, a] = stops[i]!,
          [to, b] = stops[i + 1]!
        const t = THREE.MathUtils.clamp((distance - from) / (to - from), 0, 1)
        const offset = (y * size + x) * 4
        for (let c = 0; c < 3; c++) image.data[offset + c] = a[c]! + (b[c]! - a[c]!) * t
        image.data[offset + 3] = 255
      }
    ctx.putImageData(image, 0, 0)
  })
  return texture
}

/** Islets and boats in the strip of sea that the follow camera sees beyond the landmarks. */
function seaScenery() {
  const group = new THREE.Group()
  const shore = WORLD_SIZE / 2 + 2
  const hull = new THREE.Shape()
  hull.moveTo(-1, 0.25)
  hull.lineTo(1.15, 0.25)
  hull.lineTo(0.8, -0.15)
  hull.lineTo(-0.85, -0.15)
  hull.closePath()
  const hullGeometry = new THREE.ExtrudeGeometry(hull, { depth: 0.6, bevelEnabled: false }).translate(0, 0, -0.3)
  const sail = new THREE.Shape()
  sail.moveTo(0, 0)
  sail.lineTo(0.9, 0)
  sail.lineTo(0, 1.15)
  sail.closePath()
  const sailGeometry = new THREE.ExtrudeGeometry(sail, { depth: 0.03, bevelEnabled: false })
  const boat = (x: number, z: number, heading: number) => {
    const piece = new THREE.Group()
    solid(piece, hullGeometry, '#f0e9d5')
    solid(piece, new THREE.BoxGeometry(1.9, 0.08, 0.62), '#9b584d', 0.05, 0.2)
    solid(piece, new THREE.CylinderGeometry(0.04, 0.04, 1.35, 6), '#9b7a52', -0.05, 0.88)
    solid(piece, sailGeometry, '#f7f3e6', 0, 0.35)
    piece.position.set(x, -0.95, z)
    piece.rotation.y = heading
    group.add(piece)
  }
  const islet = (x: number, z: number, radius: number, palms: number, lighthouse = false) => {
    const piece = new THREE.Group()
    // A shallow lagoon ring grounds the islet in the water instead of letting it float.
    solid(piece, new THREE.CylinderGeometry(radius * 1.7, radius * 1.7, 0.04, 20), '#a8dbd3', 0, 0.02)
    solid(piece, new THREE.CylinderGeometry(radius, radius * 1.18, 0.5, 14), '#e8d9ae', 0, -0.05)
    solid(piece, new THREE.CylinderGeometry(radius * 0.72, radius * 0.82, 0.3, 14), '#a9c88f', 0, 0.3)
    for (let i = 0; i < palms; i++) {
      const angle = (i / palms) * Math.PI * 2 + radius
      const px = Math.cos(angle) * radius * 0.38,
        pz = Math.sin(angle) * radius * 0.38
      solid(piece, new THREE.CylinderGeometry(0.07, 0.1, 1.1, 6), '#9b7a52', px, 0.95, pz)
      solid(piece, new THREE.ConeGeometry(0.55, 0.5, 6), '#5f9a6e', px, 1.6, pz)
    }
    if (lighthouse) {
      solid(piece, new THREE.CylinderGeometry(0.22, 0.32, 1.9, 10), '#f7f3e6', 0, 1.35)
      solid(piece, new THREE.CylinderGeometry(0.24, 0.24, 0.3, 10), '#c95b54', 0, 1.9)
      solid(piece, new THREE.ConeGeometry(0.3, 0.35, 10), '#c95b54', 0, 2.5)
    }
    piece.position.set(x, -0.95, z)
    group.add(piece)
  }
  // Just offshore, so they sit in the strip above the landmarks and clear of the phone HUD.
  // Each side gets one islet and two boats, varied so sides do not repeat.
  const layouts = [
    {
      islet: [-12, 5.5, 1.6, 3, true],
      boats: [
        [6, 4, 0.4],
        [17, 7.5, -0.3],
      ],
    },
    {
      islet: [10, 6, 1.4, 2, false],
      boats: [
        [-8, 4.5, 2.6],
        [-19, 8, 3.3],
      ],
    },
    {
      islet: [-4, 6.5, 1.7, 3, false],
      boats: [
        [12, 4.5, 1.2],
        [-15, 3.5, 0.9],
      ],
    },
    {
      islet: [15, 5, 1.4, 2, true],
      boats: [
        [-3, 4, -1.1],
        [3, 8.5, 2.2],
      ],
    },
  ] as const
  layouts.forEach((layout, side) => {
    const turn = (side * Math.PI) / 2
    const at = (along: number, offshore: number) =>
      new THREE.Vector3(along, 0, shore + offshore).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn)
    const [along, offshore, radius, palms, lighthouse] = layout.islet
    const spot = at(along, offshore)
    islet(spot.x, spot.z, radius, palms, lighthouse)
    for (const [boatAlong, boatOffshore, heading] of layout.boats) {
      const place = at(boatAlong, boatOffshore)
      boat(place.x, place.z, heading + turn)
    }
  })
  optimizeStaticModel(group, new Set())
  return group
}
