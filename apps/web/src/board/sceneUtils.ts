import * as THREE from 'three'

let solidMaterialCache: Map<string, THREE.MeshStandardMaterial> | undefined

// Construction-scoped sharing: dynamic meshes outside this scope keep private materials.
// Pass the same cache to later slices of one build so they keep sharing.
export function withSolidMaterialCache<T>(
  build: () => T,
  cache: Map<string, THREE.MeshStandardMaterial> = new Map(),
): T {
  const previous = solidMaterialCache
  solidMaterialCache = cache
  try {
    return build()
  } finally {
    solidMaterialCache = previous
  }
}

export function canvasTexture(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  paint(canvas.getContext('2d')!)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function disposeScene(scene: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  scene.traverse((object) => {
    if (object instanceof THREE.DirectionalLight) object.shadow.dispose()
    if (object instanceof THREE.InstancedMesh || object instanceof THREE.BatchedMesh) object.dispose()
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Sprite)) return
    // BatchedMesh.dispose owns its geometry and internal matrix/color textures.
    if (object instanceof THREE.Mesh && !(object instanceof THREE.BatchedMesh)) geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  textures.forEach((texture) => texture.dispose())
}

export function solid(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: THREE.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
  metalness = 0.05,
) {
  const tint = new THREE.Color(color)
  const roughness = 0.38
  const key = `${tint.r}:${tint.g}:${tint.b}:${roughness}:${metalness}`
  let material = solidMaterialCache?.get(key)
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color: tint, roughness, metalness })
    solidMaterialCache?.set(key, material)
  }
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
