import { BOARD, BOARD_SIDE_STEPS } from '@fortune/game'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { canvasTexture } from './sceneUtils.js'
import { inwardAt, TILE_SIZE, TILE_TOP, worldPosition } from './worldRoute.js'

export function boardTiles() {
  const group = new THREE.Group()
  // White materials preserve the original colors through instanceColor.
  const material = () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.38, metalness: 0.05 })
  const tiles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(TILE_SIZE - 0.06, 0.2, TILE_SIZE - 0.06),
    material(),
    BOARD.length,
  )
  tiles.userData.tileIndices = BOARD.map((tile) => tile.index)
  const half = TILE_SIZE / 2 - 0.06,
    inner = half - 0.055
  const outline = new THREE.Shape()
  outline.moveTo(-half, -half)
  outline.lineTo(half, -half)
  outline.lineTo(half, half)
  outline.lineTo(-half, half)
  outline.closePath()
  const hole = new THREE.Path()
  hole.moveTo(-inner, -inner)
  hole.lineTo(-inner, inner)
  hole.lineTo(inner, inner)
  hole.lineTo(inner, -inner)
  hole.closePath()
  outline.holes.push(hole)
  const rings = new THREE.InstancedMesh(new THREE.ShapeGeometry(outline), material(), BOARD.length)
  for (const mesh of [tiles, rings]) {
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
  }

  // Preserve 512×192 label resolution; transparent gutters isolate neighbors.
  const columns = 5,
    cellWidth = 520,
    cellHeight = 200,
    padding = 4
  const width = columns * cellWidth,
    height = Math.ceil(BOARD.length / columns) * cellHeight
  const atlas = canvasTexture(width, height, (ctx) => {
    BOARD.forEach((tile, index) => {
      ctx.save()
      ctx.translate((index % columns) * cellWidth + padding, Math.floor(index / columns) * cellHeight + padding)
      ctx.beginPath()
      ctx.rect(0, 0, 512, 192)
      ctx.clip()
      let size = 76
      ctx.font = `600 ${size}px sans-serif`
      size = Math.min(size, (size * 456) / Math.max(1, ctx.measureText(tile.name).width))
      ctx.font = `600 ${size}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#2c5045'
      const price = tile.price
        ? `¥${tile.price.toLocaleString('zh-CN')}`
        : tile.taxAmount
          ? `缴税 ¥${tile.taxAmount.toLocaleString('zh-CN')}`
          : ''
      ctx.fillText(tile.name, 256, price ? 56 : 96)
      if (price) {
        ctx.font = '500 48px sans-serif'
        ctx.fillStyle = '#597261'
        ctx.fillText(price, 256, 145)
      }
      ctx.restore()
    })
  })
  const labelParts: THREE.BufferGeometry[] = []
  const transform = new THREE.Object3D(),
    color = new THREE.Color()
  const instances = new Map<number, number>()
  BOARD.forEach((tile, index) => {
    instances.set(tile.index, index)
    transform.position.copy(worldPosition(tile.index))
    transform.position.y = TILE_TOP - 0.1
    transform.rotation.set(0, 0, 0)
    transform.scale.setScalar(1)
    transform.updateMatrix()
    tiles.setMatrixAt(index, transform.matrix)
    tiles.setColorAt(index, color.set('#e5e8db'))
    transform.position.y = TILE_TOP + 0.006
    transform.rotation.x = -Math.PI / 2
    transform.updateMatrix()
    rings.setMatrixAt(index, transform.matrix)
    rings.setColorAt(index, color.set('#c6d1b8'))

    const inward = inwardAt(tile.index),
      corner = tile.index % BOARD_SIDE_STEPS === 0
    transform.position
      .copy(worldPosition(tile.index))
      .addScaledVector(inward, corner ? 0.8 : TILE_SIZE * (tile.price ? 0.24 : 0.3))
    transform.position.y = TILE_TOP + 0.012
    transform.rotation.set(-Math.PI / 2, 0, Math.atan2(inward.x, inward.z))
    transform.scale.setScalar(corner ? 0.78 : 1)
    transform.updateMatrix()
    const geometry = new THREE.PlaneGeometry(TILE_SIZE * 0.8, TILE_SIZE * 0.3)
    const uv = geometry.getAttribute('uv')
    const left = (index % columns) * cellWidth + padding,
      top = Math.floor(index / columns) * cellHeight + padding
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (left + uv.getX(i) * 512) / width, 1 - (top + (1 - uv.getY(i)) * 192) / height)
    }
    geometry.applyMatrix4(transform.matrix)
    labelParts.push(geometry)
  })
  const labels = mergeGeometries(labelParts, false)!
  labelParts.forEach((part) => part.dispose())
  const labelMesh = new THREE.Mesh(
    labels,
    new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false, toneMapped: false }),
  )
  // Merged labels sort as one object at the board centre; pin them between contact
  // shadows (-1) and everything transparent above the tiles, such as owner badges.
  labelMesh.renderOrder = -0.5
  group.add(labelMesh)
  tiles.computeBoundingSphere()
  rings.computeBoundingSphere()
  tiles.instanceColor!.setUsage(THREE.DynamicDrawUsage)
  rings.instanceColor!.setUsage(THREE.DynamicDrawUsage)
  return {
    group,
    tiles,
    setColors(tileIndex: number, base: THREE.ColorRepresentation, ring: THREE.ColorRepresentation) {
      const index = instances.get(tileIndex)!
      tiles.setColorAt(index, color.set(base))
      rings.setColorAt(index, color.set(ring))
      tiles.instanceColor!.needsUpdate = true
      rings.instanceColor!.needsUpdate = true
    },
  }
}
