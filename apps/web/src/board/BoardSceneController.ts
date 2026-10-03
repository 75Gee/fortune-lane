import { BOARD } from '@fortune/game'
import * as THREE from 'three'
import { bombExplosion } from './BombExplosion.js'
import { boardTiles } from './BoardTiles.js'
import { contactShadows } from './ContactShadows.js'
import { hazardModel } from './ItemModels.js'
import { optimizeStaticModel } from './optimizeStaticModel.js'
import { ownershipMarkers } from './OwnershipMarkers.js'
import { BOMB_EXPLOSION_MS } from './presentationTimings.js'
import { propertyBuildings } from './PropertyBuildings.js'
import { sceneRenderLoop } from './SceneRenderLoop.js'
import { disposeScene, solid } from './sceneUtils.js'
import { tokenModel } from './TokenModel.js'
import { worldLandscape } from './WorldLandscape.js'
import { inwardAt, TILE_SIZE, TILE_TOP, worldPosition } from './worldRoute.js'

import { boardCameraRig, type ViewInsets } from './boardCameraRig.js'
import { bindBoardGestures } from './boardGestures.js'
import { tilePicker } from './boardInput.js'
import type { BoardSceneProps, CameraMode, ViewAction } from './boardSceneTypes.js'
import { movementFrame } from './presentationTimings.js'

/** Events that put a token in motion; the camera returns to it for each one. */
const MOVEMENT_EVENTS = new Set(['DICE_ROLLED', 'TOKEN_MOVED', 'PLAYER_SENT_TO_JAIL', 'PLAYER_SENT_TO_HOSPITAL'])

// About 2.4 million device pixels: large desktop canvases drop resolution while moving; phones do not.
const MOTION_PIXEL_BUDGET = 2_400_000

export function createBoardScene(
  container: HTMLDivElement,
  getProps: () => BoardSceneProps,
  onFailure: () => void,
  onCameraMode: (mode: CameraMode) => void,
) {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  } catch {
    onFailure()
    return null
  }
  const fullPixelRatio = () => Math.min(devicePixelRatio, 2)
  renderer.setPixelRatio(fullPixelRatio())
  renderer.shadowMap.enabled = false
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.98
  container.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  scene.matrixWorldAutoUpdate = false
  const profile = import.meta.env.DEV && new URLSearchParams(location.search).has('renderStats')
  const buildStart = performance.now(),
    buildMs: Record<string, number> = {}
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 700)
  const rig = boardCameraRig(camera)
  let reportedMode: CameraMode = 'follow'
  const reportMode = () => {
    const mode = rig.following ? 'follow' : 'free'
    if (mode !== reportedMode) onCameraMode((reportedMode = mode))
  }
  let insets: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 },
    followedEvent = 0
  let initialized = false
  let loop: ReturnType<typeof sceneRenderLoop> | undefined
  const positions = BOARD.map((tile) => worldPosition(tile.index))
  const facings = BOARD.map((tile) => inwardAt(tile.index))
  const tokenTarget = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    occupancyOffset = new THREE.Vector3()
  scene.add(new THREE.HemisphereLight('#f3faff', '#74937d', 1.7))
  const sun = new THREE.DirectionalLight('#fff0d5', 2.4)
  sun.position.set(-30, 48, 24)
  scene.add(sun)
  const grounding = contactShadows(scene)
  const initial = getProps(),
    initialActor = initial.game.players.find(
      (player) => player.id === (initial.focusPlayerId ?? initial.game.currentPlayerId),
    )
  const landscape = worldLandscape(scene, grounding, {
    multiDraw: renderer.extensions.has('WEBGL_multi_draw'),
    focusIndex: initialActor ? (initial.displayPositions[initialActor.id] ?? initialActor.position) : 0,
    eagerSteps: 4,
    onChange(ready) {
      if (profile && ready) buildMs.landmarksReady = performance.now() - buildStart
      loop?.invalidate()
    },
  })
  if (profile) buildMs.landscape = performance.now() - buildStart
  const buildings = propertyBuildings(BOARD.filter((tile) => tile.kind === 'property').length)
  scene.add(buildings.group)
  const houses = new Map<number, ReturnType<typeof buildings.addRow>>()
  const houseGrounding = new Map<number, ReturnType<typeof grounding.add>[]>()
  const board = boardTiles()
  scene.add(board.group)
  for (const tile of BOARD) {
    if (tile.kind === 'property') {
      const inward = inwardAt(tile.index)
      const rotation = Math.atan2(inward.x, inward.z)
      const row = buildings.addRow(worldPosition(tile.index).addScaledVector(inward, -TILE_SIZE * 0.31), rotation)
      houses.set(tile.index, row)
      houseGrounding.set(
        tile.index,
        row.footprints.map((at) => {
          return grounding.add({
            x: at.x,
            y: at.y - 0.002,
            z: at.z,
            width: 0.78,
            depth: 0.72,
            rotation,
            shape: 'rounded',
            opacity: 0,
          })
        }),
      )
    }
  }
  const ownership = ownershipMarkers(scene, () => loop?.invalidate())
  const tokens = new Map<string, THREE.Group>()
  const marker = new THREE.Group()
  marker.scale.setScalar(1.5)
  const arrow = solid(marker, new THREE.ConeGeometry(0.14, 0.25, 4), '#36e784')
  arrow.rotation.z = Math.PI
  const arrowMaterial = arrow.material as THREE.MeshStandardMaterial
  arrowMaterial.emissive.set('#13ac58')
  arrowMaterial.emissiveIntensity = 0.8
  scene.add(marker)
  const hazardModels = new Map<string, THREE.Group>()
  const hazardGrounding = new Map<string, ReturnType<typeof grounding.add>>()
  const tokenGrounding = new Map<string, ReturnType<typeof grounding.add>>()
  const explosion = bombExplosion()
  scene.add(explosion.group)
  const buildingStates = new Map<number, string>()
  const update = () => {
    const { game, selectedTile, viewInsets, activeEvent, eventStartedAt = 0 } = getProps()
    if (viewInsets && (Object.keys(insets) as (keyof ViewInsets)[]).some((edge) => insets[edge] !== viewInsets[edge])) {
      insets = { ...viewInsets }
      rig.setInsets(insets, !initialized)
      loop?.invalidate()
    }
    if (activeEvent && MOVEMENT_EVENTS.has(activeEvent.type) && eventStartedAt !== followedEvent) {
      followedEvent = eventStartedAt
      rig.startFollowing()
      reportMode()
    }
    ownership.update(game)
    for (const [id, model] of hazardModels) {
      if (game.hazards.some((hazard) => hazard.id === id)) continue
      scene.remove(model)
      disposeScene(model)
      hazardModels.delete(id)
      hazardGrounding.get(id)?.remove()
      hazardGrounding.delete(id)
    }
    for (const hazard of game.hazards) {
      if (hazardModels.has(hazard.id)) continue
      const model = hazardModel(hazard.kind)
      model.position.copy(worldPosition(hazard.tileIndex))
      model.position.addScaledVector(inwardAt(hazard.tileIndex), -0.6)
      const inward = inwardAt(hazard.tileIndex)
      model.rotation.y = Math.atan2(inward.x, inward.z)
      model.traverse((object) => {
        object.userData.tileIndex = hazard.tileIndex
      })
      scene.add(model)
      hazardModels.set(hazard.id, model)
      hazardGrounding.set(
        hazard.id,
        grounding.add({
          x: model.position.x,
          y: TILE_TOP + 0.005,
          z: model.position.z,
          width: 1.85,
          depth: 1.5,
          rotation: model.rotation.y,
          opacity: 0.24,
        }),
      )
    }
    for (const player of game.players) {
      if (tokens.has(player.id)) continue
      const model = tokenModel(player.token, player.color)
      optimizeStaticModel(model, new Set(), true)
      const bounds = new THREE.Box3().setFromObject(model),
        size = bounds.getSize(new THREE.Vector3())
      model.userData.tokenHeight = bounds.max.y
      model.userData.footprintWidth = Math.max(0.55, size.x) * 1.15
      model.userData.footprintDepth = Math.max(0.45, size.z) * 1.15
      model.position.copy(worldPosition(getProps().displayPositions[player.id] ?? player.position))
      scene.add(model)
      tokens.set(player.id, model)
      tokenGrounding.set(
        player.id,
        grounding.add({
          x: model.position.x,
          y: TILE_TOP + 0.006,
          z: model.position.z,
          width: 1.8,
          depth: 1.4,
          opacity: 0.23,
        }),
      )
    }
    for (const tile of BOARD) {
      const asset = game.tiles[tile.index]!,
        owner = game.players.find((player) => player.id === asset.ownerId)
      board.setColors(
        tile.index,
        selectedTile === tile.index ? '#b1efd1' : asset.mortgaged ? '#a0aaa3' : '#e5e8db',
        owner?.color ??
          (tile.kind === 'chance'
            ? '#cba955'
            : tile.kind === 'fate'
              ? '#b889a1'
              : tile.kind === 'item'
                ? '#6ba28a'
                : '#c6d1b8'),
      )
      const buildingState = `${asset.level}:${asset.mortgaged}`
      if (buildingStates.get(tile.index) !== buildingState) {
        houses.get(tile.index)?.setLevel(asset.level, asset.mortgaged)
        houseGrounding
          .get(tile.index)
          ?.forEach((shadow, index) => shadow.set({ opacity: !asset.mortgaged && index < asset.level ? 0.22 : 0 }))
        buildingStates.set(tile.index, buildingState)
      }
    }
    loop?.invalidate()
  }
  if (profile) buildMs.scene = performance.now() - buildStart
  const setView = (action: ViewAction) => {
    if (action === 'in' || action === 'out') rig.zoomBy(action === 'in' ? 0.8 : 1.25)
    else if (action === 'follow') rig.startFollowing()
    else if (action === 'overview') rig.overview()
    else rig.rotate(action === 'rotate-left' ? -1 : 1)
    reportMode()
    loop?.invalidate()
  }
  const pick = tilePicker(renderer.domElement, camera, () => [
    board.tiles,
    ...ownership.objects.filter((object) => object.visible),
    ...landscape.objects,
    ...hazardModels.values(),
  ])
  const unbindGestures = bindBoardGestures(renderer.domElement, rig, {
    onTap(x, y) {
      const index = pick(x, y)
      if (index !== null) getProps().onSelectTile(index)
    },
    onChange() {
      reportMode()
      loop?.invalidate()
    },
  })
  function resize() {
    const w = container.clientWidth,
      h = container.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    rig.resize(w, h)
    loop?.invalidate()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()
  update()
  loop = sceneRenderLoop(container, 'board', ({ time, delta: dt, reducedMotion: reduced }) => {
    let animating = false
    const { game, displayPositions, focusPlayerId } = getProps()
    const event = getProps().activeEvent,
      startedAt = getProps().eventStartedAt ?? 0
    if (
      event?.type === 'HAZARD_TRIGGERED' &&
      event.itemKind === 'bomb' &&
      event.tileIndex !== undefined &&
      startedAt > 0
    ) {
      explosion.group.position.copy(worldPosition(event.tileIndex)).addScaledVector(inwardAt(event.tileIndex), -0.6)
      explosion.update((time - startedAt) / BOMB_EXPLOSION_MS, reduced)
      animating ||= !reduced && time < startedAt + BOMB_EXPLOSION_MS
    } else explosion.group.visible = false
    const actorId = focusPlayerId ?? game.currentPlayerId
    marker.visible = false
    for (const player of game.players) {
      const model = tokens.get(player.id)
      if (!model) continue
      model.visible = !player.isBankrupt
      const index = displayPositions[player.id] ?? player.position,
        target = tokenTarget.copy(positions[index]!)
      const occupants = game.players.filter((p) => !p.isBankrupt && (displayPositions[p.id] ?? p.position) === index)
      const order = occupants.findIndex((p) => p.id === player.id)
      const facing = facings[index]!
      model.rotation.y = Math.atan2(facing.x, facing.z)
      if (occupants.length > 1) {
        const columns = Math.min(occupants.length, 3),
          rows = Math.ceil(occupants.length / 3)
        const across = ((order % 3) - (columns - 1) / 2) * 1.25
        const depth = (Math.floor(order / 3) - (rows - 1) / 2) * 1.3
        target.addScaledVector(tangent.set(facing.z, 0, -facing.x), across).addScaledVector(facing, depth)
        model.scale.setScalar(2.2 * 0.8)
      } else model.scale.setScalar(2.8 * 0.8)
      const motion =
        event?.type === 'TOKEN_MOVED' && event.playerId === player.id && startedAt > 0
          ? movementFrame(event, time - startedAt)
          : null
      if (motion && !reduced) {
        const origin = positions[motion.from]!
        const destination = positions[motion.to]!
        const easing = motion.progress * motion.progress * (3 - 2 * motion.progress)
        model.position.copy(origin).lerp(destination, easing)
        if (motion.finalStep) model.position.addScaledVector(occupancyOffset.copy(target).sub(destination), easing)
        animating ||= motion.progress < 1
      } else {
        model.position.lerp(
          target,
          !initialized || reduced || getProps().teleportPlayerId === player.id ? 1 : 1 - Math.exp(-18 * dt),
        )
        if (model.position.distanceToSquared(target) > 0.0001) animating = true
        else model.position.copy(target)
      }
      tokenGrounding.get(player.id)?.set({
        x: model.position.x,
        z: model.position.z,
        width: model.userData.footprintWidth * model.scale.x,
        depth: model.userData.footprintDepth * model.scale.z,
        rotation: model.rotation.y,
        opacity: player.isBankrupt ? 0 : 0.23,
      })
      if (player.id === actorId && !player.isBankrupt) {
        marker.position.copy(model.position)
        marker.position.y += model.userData.tokenHeight * model.scale.y + 0.35
        marker.visible = true
      }
    }
    const actor = game.players.find((player) => player.id === actorId)
    const index = actor ? (displayPositions[actor.id] ?? actor.position) : 0
    const actorModel = actor ? tokens.get(actor.id) : null
    rig.follow(actorModel?.position ?? positions[index]!, facings[index]!, !initialized)
    if (rig.step(dt, !initialized || reduced)) animating = true
    initialized = true
    ownership.resize(camera, rig.lensHeight)
    // Moving frames stay within a pixel budget; the settled frame restores full sharpness.
    const pixelRatio = animating
      ? Math.max(
          1,
          Math.min(
            fullPixelRatio(),
            Math.sqrt(MOTION_PIXEL_BUDGET / Math.max(1, container.clientWidth * container.clientHeight)),
          ),
        )
      : fullPixelRatio()
    if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio)
    const renderStart = profile ? performance.now() : 0
    scene.updateMatrixWorld(true)
    renderer.render(scene, camera)
    if (profile) buildMs.firstRender ??= performance.now() - renderStart
    if (profile)
      container.dataset.renderStats = JSON.stringify({
        buildMs,
        shadowPasses: 0,
        mainCalls: renderer.info.render.calls,
        pixelRatio,
        landmarkBatching: landscape.stats,
        submissionMs: performance.now() - renderStart,
      })
    return animating
  })
  let wasActive = getProps().active ?? true
  const setEnabled = (active: boolean) => {
    if (active && !wasActive) initialized = false
    wasActive = active
    loop?.setEnabled(active)
  }
  setEnabled(wasActive)
  const lost = (event: Event) => {
    event.preventDefault()
    onFailure()
    loop?.setEnabled(false)
  }
  renderer.domElement.addEventListener('webglcontextlost', lost)
  const dispose = () => {
    loop?.dispose()
    landscape.dispose()
    observer.disconnect()
    unbindGestures()
    renderer.domElement.removeEventListener('webglcontextlost', lost)
    ownership.dispose()
    disposeScene(scene)
    renderer.dispose()
    renderer.domElement.remove()
  }
  return { update, setView, setEnabled, dispose }
}
