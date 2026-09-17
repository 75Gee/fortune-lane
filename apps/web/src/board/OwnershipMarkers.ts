import { BOARD, type GameView, type TokenId } from '@fortune/game'
import * as THREE from 'three'
import { TOKEN_META } from '../components/tokenMeta.js'
import { canvasTexture } from './sceneUtils.js'
import { inwardAt, TILE_SIZE, TILE_TOP, worldPosition } from './worldRoute.js'

type Owner = GameView['players'][number]

/** Ground strips show territory; camera-facing badges identify its owner. */
export function ownershipMarkers(scene: THREE.Scene, invalidate: () => void) {
  let disposed = false
  const images = new Map<TokenId, HTMLImageElement>()
  const markers = new Map<number, {
    strip: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>
    badge: THREE.Sprite
    texture: THREE.CanvasTexture
    owner: Owner | undefined
    mortgaged: boolean
    signature: string
  }>()
  const stripGeometry = new THREE.BoxGeometry(TILE_SIZE - .16, .06, TILE_SIZE * .1)

  function paint(marker: NonNullable<ReturnType<typeof markers.get>>) {
    const owner = marker.owner
    if (!owner || disposed) return
    const ctx = (marker.texture.image as HTMLCanvasElement).getContext('2d')!
    ctx.clearRect(0, 0, 160, 160)
    ctx.beginPath(); ctx.arc(80, 76, 65, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'; ctx.fill()
    ctx.lineWidth = 12; ctx.strokeStyle = owner.color; ctx.stroke()
    const image = images.get(owner.token)
    if (image?.complete && image.naturalWidth) {
      ctx.drawImage(image, 35, 31, 90, 90)
    } else {
      ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = '#304d3b'; ctx.fillText(TOKEN_META[owner.token].fallback, 80, 78)
    }
    if (marker.mortgaged) {
      // Keep the owner visible and add a separate, high-contrast lock.
      ctx.beginPath(); ctx.arc(123, 122, 30, 0, Math.PI * 2)
      ctx.fillStyle = '#606b70'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.stroke()
      ctx.beginPath(); ctx.arc(123, 117, 10, Math.PI, 0)
      ctx.lineTo(133, 126); ctx.stroke()
      ctx.fillStyle = '#ffffff'; ctx.fillRect(109, 120, 28, 21)
      ctx.fillStyle = '#606b70'; ctx.fillRect(121, 126, 4, 9)
    }
    marker.texture.needsUpdate = true
  }

  for (const tile of BOARD) {
    if (!tile.price) continue
    const inward = inwardAt(tile.index)
    const strip = new THREE.Mesh(stripGeometry, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }))
    strip.position.copy(worldPosition(tile.index)).addScaledVector(inward, TILE_SIZE * .445)
    strip.position.y = TILE_TOP + .035
    strip.rotation.y = Math.atan2(inward.x, inward.z)
    strip.userData.tileIndex = tile.index
    const texture = canvasTexture(160, 160, () => {})
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }))
    badge.position.copy(worldPosition(tile.index)).addScaledVector(inward, TILE_SIZE * .61)
    badge.position.y = TILE_TOP + .12
    badge.center.set(.5, 0)
    badge.userData.tileIndex = tile.index
    strip.visible = badge.visible = false
    scene.add(strip, badge)
    markers.set(tile.index, { strip, badge, texture, owner: undefined, mortgaged: false, signature: '' })
  }

  const cameraSpace = new THREE.Vector3()
  return {
    objects: [...markers.values()].flatMap(({ strip, badge }) => [strip, badge]),
    update(game: GameView) {
      for (const [index, marker] of markers) {
        const asset = game.tiles[index]!
        const owner = game.players.find(player => player.id === asset.ownerId)
        marker.strip.visible = marker.badge.visible = !!owner
        marker.owner = owner
        marker.mortgaged = asset.mortgaged
        const signature = owner ? `${owner.id}:${owner.token}:${owner.color}:${asset.mortgaged}` : ''
        if (signature === marker.signature) continue
        marker.signature = signature
        if (!owner) continue
        marker.strip.material.color.set(owner.color)
        if (!images.has(owner.token)) {
          const image = new Image()
          images.set(owner.token, image)
          image.onload = () => {
            if (disposed) return
            for (const entry of markers.values()) if (entry.owner?.token === owner.token) paint(entry)
            invalidate()
          }
          image.src = TOKEN_META[owner.token].image
        }
        paint(marker)
      }
    },
    resize(camera: THREE.PerspectiveCamera, viewportHeight: number) {
      // Aim for 28 CSS pixels, but cap world size to prevent overlapping
      // neighboring badges when the whole board is shown.
      const pixelFactor = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, viewportHeight)
      for (const { badge } of markers.values()) {
        if (!badge.visible) continue
        cameraSpace.copy(badge.position).applyMatrix4(camera.matrixWorldInverse)
        const size = THREE.MathUtils.clamp(-cameraSpace.z * pixelFactor * 28, .85, TILE_SIZE * .42)
        badge.scale.set(size, size, 1)
      }
    },
    dispose() {
      disposed = true
      for (const image of images.values()) image.onload = null
      // Geometry, materials and textures belong to the scene and are disposed with it.
    },
  }
}
