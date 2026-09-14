import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Run before the first render: replaced geometry has no GPU allocation and can be collected.
// Batch only opaque leaves, within one landmark, so picking and moving parts remain independent.
export function optimizeStaticModel(root: THREE.Group, moving: Set<THREE.Object3D>, movableRoot = false) {
  root.updateWorldMatrix(true, true)
  const inverse = root.matrixWorld.clone().invert()
  const batches = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]>()
  const visit = (object: THREE.Object3D) => {
    if (moving.has(object) || !object.visible) return
    object.updateMatrix(); object.matrixAutoUpdate = false
    for (const child of object.children) visit(child)
    if (!(object instanceof THREE.Mesh) || object.children.length || !object.visible || Array.isArray(object.material)) return
    const material = object.material as THREE.Material
    if (material.transparent || Object.values(material).some(value => value instanceof THREE.Texture) || object.matrixWorld.determinant() <= 0) return
    const geometry = object.geometry as THREE.BufferGeometry
    if (Object.keys(geometry.morphAttributes).length || geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity) return
    const { uuid: _uuid, metadata: _metadata, ...properties } = material.toJSON()
    const attributes = Object.entries(geometry.attributes).sort(([a], [b]) => a.localeCompare(b)).map(([name, attribute]) => [name, attribute.itemSize, attribute.normalized, attribute.array.constructor.name])
    const key = JSON.stringify([properties, attributes, object.castShadow, object.receiveShadow, object.renderOrder])
    const batch = batches.get(key) ?? []
    batch.push(object); batches.set(key, batch)
  }
  visit(root)
  for (const batch of batches.values()) {
    if (batch.length < 2) continue
    const parts = batch.map(mesh => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
      return geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld))
    })
    const geometry = mergeGeometries(parts, false)
    parts.forEach(part => part.dispose())
    if (!geometry) continue
    const first = batch[0]!
    const mesh = new THREE.Mesh(geometry, first.material)
    mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow
    mesh.renderOrder = first.renderOrder; mesh.userData = { ...first.userData }
    mesh.matrixAutoUpdate = false
    root.add(mesh)
    for (const original of batch) {
      original.removeFromParent()
    }
  }
  root.updateWorldMatrix(true, true)
  const freezeWorld = (object: THREE.Object3D) => {
    if (moving.has(object) || !object.visible) return
    object.matrixWorldAutoUpdate = false
    object.children.forEach(freezeWorld)
  }
  if (movableRoot) root.matrixAutoUpdate = true
  else freezeWorld(root)
}
