import * as THREE from 'three'

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
    if (object instanceof THREE.InstancedMesh) object.dispose()
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Sprite)) return
    if (object instanceof THREE.Mesh) geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  textures.forEach((texture) => texture.dispose())
}

export function solid(parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, x = 0, y = 0, z = 0, metalness = .05) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .38, metalness }))
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
