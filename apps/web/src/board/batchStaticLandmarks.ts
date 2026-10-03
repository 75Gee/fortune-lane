import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

type StaticMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>

// These roots are immutable after placement. Textured/transparent/custom meshes stay independent.
export function batchStaticLandmarks(scene: THREE.Scene, roots: THREE.Object3D[], multiDraw: boolean) {
  scene.updateMatrixWorld(true)
  const batches = new Map<string, StaticMesh[]>()
  let sourceMeshes = 0
  const visit = (object: THREE.Object3D) => {
    if (!object.visible) return
    object.children.forEach(visit)
    if (object instanceof THREE.Mesh) sourceMeshes++
    if (
      !(object instanceof THREE.Mesh) ||
      object instanceof THREE.InstancedMesh ||
      object instanceof THREE.BatchedMesh ||
      object instanceof THREE.SkinnedMesh ||
      object.children.length ||
      // Scenery without a tile may batch too; picking it selects nothing.
      (object.userData.tileIndex !== undefined && !Number.isInteger(object.userData.tileIndex)) ||
      !(object.material instanceof THREE.MeshStandardMaterial)
    )
      return
    const geometry = object.geometry as THREE.BufferGeometry
    const material = object.material
    if (
      material.transparent ||
      material.opacity !== 1 ||
      material.wireframe ||
      material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile ||
      Object.values(material).some((value) => value instanceof THREE.Texture) ||
      object.matrixWorld.determinant() <= 0 ||
      Object.keys(geometry.morphAttributes).length ||
      geometry.drawRange.start !== 0 ||
      geometry.drawRange.count !== Infinity ||
      Object.values(geometry.attributes).some(
        (attribute) => !(attribute instanceof THREE.BufferAttribute) || attribute.itemSize > 4,
      )
    )
      return
    const { uuid: _uuid, metadata: _metadata, color: _color, ...properties } = material.toJSON()
    const attributes = Object.entries(geometry.attributes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, attribute]) => [name, attribute.itemSize, attribute.normalized, attribute.array.constructor.name])
    // Without multi-draw, spatial chunks retain useful culling in the follow camera.
    const chunk = multiDraw
      ? null
      : [Math.floor(object.matrixWorld.elements[12]! / 16), Math.floor(object.matrixWorld.elements[14]! / 16)]
    const key = JSON.stringify([
      properties,
      attributes,
      Boolean(geometry.index),
      object.castShadow,
      object.receiveShadow,
      object.renderOrder,
      object.layers.mask,
      chunk,
    ])
    const batch = batches.get(key) ?? []
    batch.push(object as StaticMesh)
    batches.set(key, batch)
  }
  roots.forEach(visit)
  const objects: THREE.Mesh[] = []
  let batchedSources = 0
  const retiredGeometries = new Set<THREE.BufferGeometry>()
  const retiredMaterials = new Set<THREE.Material>()
  for (const batch of batches.values()) {
    if (batch.length < 2) continue
    const first = batch[0]!
    const material = first.material.clone()
    material.color.set('#ffffff')
    let mesh: THREE.Mesh
    if (multiDraw) {
      const geometries = [...new Set(batch.map((source) => source.geometry))]
      const vertexCount = geometries.reduce((total, geometry) => total + geometry.getAttribute('position').count, 0)
      const indexCount = geometries.reduce((total, geometry) => total + (geometry.index?.count ?? 0), 0)
      const batched = new THREE.BatchedMesh(batch.length, vertexCount, indexCount, material)
      const geometryIds = new Map(geometries.map((geometry) => [geometry, batched.addGeometry(geometry)]))
      const tileIndices: number[] = []
      for (const source of batch) {
        const id = batched.addInstance(geometryIds.get(source.geometry)!)
        batched.setMatrixAt(id, source.matrixWorld)
        batched.setColorAt(id, source.material.color)
        tileIndices[id] = source.userData.tileIndex
      }
      batched.userData.tileIndices = tileIndices
      batched.computeBoundingBox()
      batched.computeBoundingSphere()
      mesh = batched
    } else {
      material.vertexColors = true
      let end = 0
      const tileFaceRanges: { end: number; tileIndex: number }[] = []
      const parts = batch.map((source) => {
        const geometry = source.geometry.clone().applyMatrix4(source.matrixWorld)
        const count = geometry.getAttribute('position').count
        const existing = source.material.vertexColors ? source.geometry.getAttribute('color') : undefined
        const itemSize = existing?.itemSize === 4 ? 4 : 3
        const colors = new Float32Array(count * itemSize)
        for (let i = 0; i < count; i++) {
          colors[i * itemSize] = source.material.color.r * (existing?.getX(i) ?? 1)
          colors[i * itemSize + 1] = source.material.color.g * (existing?.getY(i) ?? 1)
          colors[i * itemSize + 2] = source.material.color.b * (existing?.getZ(i) ?? 1)
          if (itemSize === 4) colors[i * itemSize + 3] = existing!.getW(i)
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, itemSize))
        end += (geometry.index?.count ?? count) / 3
        tileFaceRanges.push({ end, tileIndex: source.userData.tileIndex })
        return geometry
      })
      const geometry = mergeGeometries(parts, false)
      parts.forEach((part) => part.dispose())
      if (!geometry) {
        material.dispose()
        continue
      }
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()
      mesh = new THREE.Mesh(geometry, material)
      mesh.userData.tileFaceRanges = tileFaceRanges
    }
    mesh.castShadow = first.castShadow
    mesh.receiveShadow = first.receiveShadow
    mesh.renderOrder = first.renderOrder
    mesh.layers.mask = first.layers.mask
    mesh.matrixAutoUpdate = mesh.matrixWorldAutoUpdate = false
    scene.add(mesh)
    objects.push(mesh)
    batchedSources += batch.length
    for (const source of batch) {
      retiredGeometries.add(source.geometry)
      retiredMaterials.add(source.material)
      source.removeFromParent()
    }
  }
  // Cloned landmarks may still share resources with unbatched pieces.
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    retiredGeometries.delete(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material])
      retiredMaterials.delete(material)
  })
  retiredGeometries.forEach((geometry) => geometry.dispose())
  retiredMaterials.forEach((material) => material.dispose())
  return {
    objects: [...roots.filter((root) => root.parent !== null), ...objects],
    stats: {
      mode: multiDraw ? 'multi-draw' : 'merged',
      sourceMeshes,
      batchCount: objects.length,
      remainingMeshes: sourceMeshes - batchedSources,
    },
  }
}
