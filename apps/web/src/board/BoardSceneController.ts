import { BOARD, BOARD_SIDE_STEPS } from '@fortune/game'
import * as THREE from 'three'
import { bombExplosion } from './BombExplosion.js'
import { contactShadows } from './ContactShadows.js'
import { hazardModel } from './ItemModels.js'
import { optimizeStaticModel } from './optimizeStaticModel.js'
import { ownershipMarkers } from './OwnershipMarkers.js'
import { BOMB_EXPLOSION_MS } from './presentationTimings.js'
import { propertyBuildings } from './PropertyBuildings.js'
import { sceneRenderLoop } from './SceneRenderLoop.js'
import { canvasTexture, disposeScene, solid } from './sceneUtils.js'
import { tokenModel } from './TokenModel.js'
import { worldLandscape } from './WorldLandscape.js'
import { inwardAt, TILE_SIZE, TILE_TOP, worldPosition } from './worldRoute.js'

import { cameraDestination } from './boardCamera.js'
import { bindBoardInput } from './boardInput.js'
import type { BoardSceneProps, CameraMode, ViewAction } from './boardSceneTypes.js'
import { movementFrame } from './presentationTimings.js'

export function createBoardScene(container: HTMLDivElement, getProps: () => BoardSceneProps, onFailure: () => void) {
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }) } catch { onFailure(); return null }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = false
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .98
    container.prepend(renderer.domElement)
    const scene = new THREE.Scene()
    scene.matrixWorldAutoUpdate = false
    const profile = import.meta.env.DEV && new URLSearchParams(location.search).has('renderStats')
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 700)
    const cameraTarget = new THREE.Vector3()
    renderer.domElement.style.touchAction = 'pan-y'
    let cameraMode: CameraMode = 'follow', zoom = 1, compact = container.clientWidth < 700
    const mobileViewport = matchMedia('(max-width: 800px)')
    const defaultZoom = () => cameraMode === 'overview' ? 1 : 1.2 ** (mobileViewport.matches ? 6 : 3)
    let initialized = false
    let loop: ReturnType<typeof sceneRenderLoop> | undefined
    const positions = BOARD.map(tile => worldPosition(tile.index))
    const facings = BOARD.map(tile => inwardAt(tile.index))
    const tokenTarget = new THREE.Vector3(), tangent = new THREE.Vector3(), occupancyOffset = new THREE.Vector3()
    const desiredCamera = new THREE.Vector3(), desired = new THREE.Vector3()
    scene.add(new THREE.HemisphereLight('#f3faff', '#74937d', 1.7))
    const sun = new THREE.DirectionalLight('#fff0d5', 2.4)
    sun.position.set(-30, 48, 24); scene.add(sun)
    const grounding = contactShadows(scene)
    const landscape = worldLandscape(scene, grounding)
    const houses = new Map<number, ReturnType<typeof propertyBuildings>>()
    const houseGrounding = new Map<number, ReturnType<typeof grounding.add>[]>()
    const tiles: THREE.Mesh[] = [], rings: THREE.Mesh[] = []
    const tileGeometry = new THREE.BoxGeometry(TILE_SIZE - .06, .2, TILE_SIZE - .06)
    const half = TILE_SIZE / 2 - .06, inner = half - .055
    const outline = new THREE.Shape()
    outline.moveTo(-half, -half); outline.lineTo(half, -half); outline.lineTo(half, half); outline.lineTo(-half, half); outline.closePath()
    const hole = new THREE.Path()
    hole.moveTo(-inner, -inner); hole.lineTo(-inner, inner); hole.lineTo(inner, inner); hole.lineTo(inner, -inner); hole.closePath()
    outline.holes.push(hole)
    const ringGeometry = new THREE.ShapeGeometry(outline)
    const nameGeometry = new THREE.PlaneGeometry(TILE_SIZE * .8, TILE_SIZE * .3)
    for (const tile of BOARD) {
      const mesh = solid(scene, tileGeometry, '#e5e8db')
      mesh.position.copy(worldPosition(tile.index)); mesh.position.y = TILE_TOP - .1
      mesh.userData.tileIndex = tile.index; tiles.push(mesh)
      const ring = solid(scene, ringGeometry, '#c6d1b8', mesh.position.x, TILE_TOP + .006, mesh.position.z)
      ring.rotation.x = -Math.PI / 2; rings.push(ring)
      const nameTexture = canvasTexture(512, 192, (ctx) => {
        let size = 76
        ctx.font = `600 ${size}px sans-serif`
        size = Math.min(size, size * 456 / Math.max(1, ctx.measureText(tile.name).width))
        ctx.font = `600 ${size}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2c5045'
        const price = tile.price ? `¥${tile.price.toLocaleString('zh-CN')}` : tile.taxAmount ? `缴税 ¥${tile.taxAmount.toLocaleString('zh-CN')}` : ''
        ctx.fillText(tile.name, 256, price ? 56 : 96)
        if (price) {
          ctx.font = '500 48px sans-serif'; ctx.fillStyle = '#597261'
          ctx.fillText(price, 256, 145)
        }
      })
      const name = new THREE.Mesh(nameGeometry, new THREE.MeshBasicMaterial({ map: nameTexture, transparent: true, depthWrite: false, toneMapped: false }))
      const inward = inwardAt(tile.index), corner = tile.index % BOARD_SIDE_STEPS === 0
      name.position.copy(worldPosition(tile.index)).addScaledVector(inward, corner ? .8 : TILE_SIZE * (tile.price ? .24 : .3))
      name.position.y = TILE_TOP + .012
      // The bottom of the text faces the reader on the inside of each board edge.
      name.rotation.set(-Math.PI / 2, 0, Math.atan2(inward.x, inward.z))
      if (corner) name.scale.setScalar(.78)
      scene.add(name)
      if (tile.kind === 'property') {
        const row = propertyBuildings()
        row.group.position.copy(worldPosition(tile.index)).addScaledVector(inward, -TILE_SIZE * .31)
        row.group.rotation.y = Math.atan2(inward.x, inward.z)
        scene.add(row.group); houses.set(tile.index, row)
        houseGrounding.set(tile.index, row.footprints.map((local) => {
          const at = row.group.localToWorld(local.clone())
          return grounding.add({ x: at.x, y: at.y - .002, z: at.z, width: .78, depth: .72, rotation: row.group.rotation.y, shape: 'rounded', opacity: 0 })
        }))
      }
    }
    const ownership = ownershipMarkers(scene, () => loop?.invalidate())
    const tokens = new Map<string, THREE.Group>()
    const marker = new THREE.Group()
    marker.scale.setScalar(1.5)
    const arrow = solid(marker, new THREE.ConeGeometry(.14, .25, 4), '#36e784'); arrow.rotation.z = Math.PI
    const arrowMaterial = arrow.material as THREE.MeshStandardMaterial
    arrowMaterial.emissive.set('#13ac58'); arrowMaterial.emissiveIntensity = .8; scene.add(marker)
    const hazardModels = new Map<string, THREE.Group>()
    const hazardGrounding = new Map<string, ReturnType<typeof grounding.add>>()
    const tokenGrounding = new Map<string, ReturnType<typeof grounding.add>>()
    const explosion = bombExplosion(); scene.add(explosion.group)
    const buildingStates = new Map<number, string>()
    const update = () => {
      const { game, selectedTile } = getProps()
      ownership.update(game)
      for (const [id, model] of hazardModels) {
        if (game.hazards.some((hazard) => hazard.id === id)) continue
        scene.remove(model); disposeScene(model); hazardModels.delete(id)
        hazardGrounding.get(id)?.remove(); hazardGrounding.delete(id)
      }
      for (const hazard of game.hazards) {
        if (hazardModels.has(hazard.id)) continue
        const model = hazardModel(hazard.kind)
        model.position.copy(worldPosition(hazard.tileIndex))
        model.position.addScaledVector(inwardAt(hazard.tileIndex), -.6)
        const inward = inwardAt(hazard.tileIndex)
        model.rotation.y = Math.atan2(inward.x, inward.z)
        model.traverse((object) => { object.userData.tileIndex = hazard.tileIndex })
        scene.add(model); hazardModels.set(hazard.id, model)
        hazardGrounding.set(hazard.id, grounding.add({ x: model.position.x, y: TILE_TOP + .005, z: model.position.z, width: 1.85, depth: 1.5, rotation: model.rotation.y, opacity: .24 }))
      }
      for (const player of game.players) {
        if (tokens.has(player.id)) continue
        const model = tokenModel(player.token, player.color)
        optimizeStaticModel(model, new Set(), true)
        const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3())
        model.userData.tokenHeight = bounds.max.y
        model.userData.footprintWidth = Math.max(.55, size.x) * 1.15
        model.userData.footprintDepth = Math.max(.45, size.z) * 1.15
        model.position.copy(worldPosition(getProps().displayPositions[player.id] ?? player.position))
        scene.add(model); tokens.set(player.id, model)
        tokenGrounding.set(player.id, grounding.add({ x: model.position.x, y: TILE_TOP + .006, z: model.position.z, width: 1.8, depth: 1.4, opacity: .23 }))
      }
      for (const tile of BOARD) {
        const asset = game.tiles[tile.index]!, owner = game.players.find((player) => player.id === asset.ownerId)
        ;(tiles[tile.index]!.material as THREE.MeshStandardMaterial).color.set(selectedTile === tile.index ? '#b1efd1' : asset.mortgaged ? '#a0aaa3' : '#e5e8db')
        ;(rings[tile.index]!.material as THREE.MeshStandardMaterial).color.set(owner?.color ?? (tile.kind === 'chance' ? '#cba955' : tile.kind === 'fate' ? '#b889a1' : tile.kind === 'item' ? '#6ba28a' : '#c6d1b8'))
        const buildingState = `${asset.level}:${asset.mortgaged}`
        if (buildingStates.get(tile.index) !== buildingState) {
          houses.get(tile.index)?.setLevel(asset.level, asset.mortgaged)
          houseGrounding.get(tile.index)?.forEach((shadow, index) => shadow.set({ opacity: !asset.mortgaged && index < asset.level ? .22 : 0 }))
          buildingStates.set(tile.index, buildingState)
        }
      }
      loop?.invalidate()
    }
    update()
    const setView = (action: ViewAction) => {
      loop?.invalidate()
      if (action === 'in' || action === 'out') {
        const factor = action === 'in' ? .83 : 1.2
        zoom = THREE.MathUtils.clamp(zoom * factor, .65 / defaultZoom(), 1.7)
        return
      }
      cameraMode = action; zoom = 1
    }
    const unbindInput = bindBoardInput(container, renderer.domElement, camera, () => [...tiles, ...ownership.objects.filter(object => object.visible), ...landscape.lots, ...landscape.models, ...hazardModels.values()], index => getProps().onSelectTile(index))
    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return
      compact = w < 700; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
      loop?.invalidate()
    }
    const observer = new ResizeObserver(resize); observer.observe(container); resize()
    loop = sceneRenderLoop(container, 'board', ({ time, delta: dt, reducedMotion: reduced }) => {
      let animating = false
      const { game, displayPositions, focusPlayerId } = getProps()
      const event = getProps().activeEvent, startedAt = getProps().eventStartedAt ?? 0
      if (event?.type === 'HAZARD_TRIGGERED' && event.itemKind === 'bomb' && event.tileIndex !== undefined && startedAt > 0) {
        explosion.group.position.copy(worldPosition(event.tileIndex)).addScaledVector(inwardAt(event.tileIndex), -.6)
        explosion.update((time - startedAt) / BOMB_EXPLOSION_MS, reduced)
        animating ||= !reduced && time < startedAt + BOMB_EXPLOSION_MS
      } else explosion.group.visible = false
      const actorId = focusPlayerId ?? game.currentPlayerId
      marker.visible = false
      for (const player of game.players) {
        const model = tokens.get(player.id); if (!model) continue
        model.visible = !player.isBankrupt
        const index = displayPositions[player.id] ?? player.position, target = tokenTarget.copy(positions[index]!)
        const occupants = game.players.filter((p) => !p.isBankrupt && (displayPositions[p.id] ?? p.position) === index)
        const order = occupants.findIndex((p) => p.id === player.id)
        const facing = facings[index]!; model.rotation.y = Math.atan2(facing.x, facing.z)
        if (occupants.length > 1) {
          const columns = Math.min(occupants.length, 3), rows = Math.ceil(occupants.length / 3)
          const across = ((order % 3) - (columns - 1) / 2) * 1.25
          const depth = (Math.floor(order / 3) - (rows - 1) / 2) * 1.3
          target.addScaledVector(tangent.set(facing.z, 0, -facing.x), across).addScaledVector(facing, depth)
          model.scale.setScalar(2.2 * .8)
        } else model.scale.setScalar(2.8 * .8)
        const motion = event?.type === 'TOKEN_MOVED' && event.playerId === player.id && startedAt > 0 ? movementFrame(event, time - startedAt) : null
        if (motion && !reduced) {
          const origin = positions[motion.from]!
          const destination = positions[motion.to]!
          const easing = motion.progress * motion.progress * (3 - 2 * motion.progress)
          model.position.copy(origin).lerp(destination, easing)
          if (motion.finalStep) model.position.addScaledVector(occupancyOffset.copy(target).sub(destination), easing)
          animating ||= motion.progress < 1
        } else {
          model.position.lerp(target, !initialized || reduced || getProps().teleportPlayerId === player.id ? 1 : 1 - Math.exp(-18 * dt))
          if (model.position.distanceToSquared(target) > .0001) animating = true
          else model.position.copy(target)
        }
        tokenGrounding.get(player.id)?.set({ x: model.position.x, z: model.position.z, width: model.userData.footprintWidth * model.scale.x, depth: model.userData.footprintDepth * model.scale.z, rotation: model.rotation.y, opacity: player.isBankrupt ? 0 : .23 })
        if (player.id === actorId && !player.isBankrupt) {
          marker.position.copy(model.position); marker.position.y += model.userData.tokenHeight * model.scale.y + .35; marker.visible = true
        }
      }
      const actor = game.players.find((player) => player.id === actorId)
      const index = actor ? displayPositions[actor.id] ?? actor.position : 0
      const actorModel = actor ? tokens.get(actor.id) : null
      cameraDestination(camera, cameraMode, zoom * defaultZoom(), compact, index, actorModel?.position ?? positions[index]!, desired, desiredCamera)
      const easing = !initialized || reduced ? 1 : 1 - Math.exp(-(cameraMode === 'follow' ? 6.5 : 3.8) * dt)
      cameraTarget.lerp(desired, easing); camera.position.lerp(desiredCamera, easing)
      if (camera.position.distanceToSquared(desiredCamera) > .0001 || cameraTarget.distanceToSquared(desired) > .0001) animating = true
      else { camera.position.copy(desiredCamera); cameraTarget.copy(desired) }
      camera.lookAt(cameraTarget); initialized = true
      camera.updateMatrixWorld()
      ownership.resize(camera, container.clientHeight)
      const renderStart = profile ? performance.now() : 0
      scene.updateMatrixWorld(true)
      renderer.render(scene, camera)
      if (profile) container.dataset.renderStats = JSON.stringify({ shadowPasses: 0, mainCalls: renderer.info.render.calls, submissionMs: performance.now() - renderStart })
      return animating
    })
    let wasActive = getProps().active ?? true
    const setEnabled = (active: boolean) => {
      if (active && !wasActive) initialized = false
      wasActive = active; loop?.setEnabled(active)
    }
    setEnabled(wasActive)
    const lost = (event: Event) => { event.preventDefault(); onFailure(); loop?.setEnabled(false) }
    renderer.domElement.addEventListener('webglcontextlost', lost)
    const dispose = () => {
      loop?.dispose(); observer.disconnect()
      unbindInput(); renderer.domElement.removeEventListener('webglcontextlost', lost)
      ownership.dispose(); disposeScene(scene); renderer.dispose(); renderer.domElement.remove()
    }
    return { update, setView, setEnabled, dispose }
}
