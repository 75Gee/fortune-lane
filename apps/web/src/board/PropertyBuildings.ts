import * as THREE from 'three'
import { MAX_PROPERTY_LEVEL } from '@fortune/game'

// One pool for the whole board; only occupied buildings are submitted.
export function propertyBuildings(propertyCount: number) {
  const group = new THREE.Group()
  const capacity = propertyCount * MAX_PROPERTY_LEVEL
  const make = (geometry: THREE.BufferGeometry, color: string, roughness: number, dynamic = false) => {
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color, roughness }), capacity)
    mesh.count = 0
    mesh.castShadow = dynamic
    mesh.receiveShadow = true
    if (dynamic) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    group.add(mesh)
    return mesh
  }
  const slots = make(new THREE.BoxGeometry(0.72, 0.025, 0.72), '#a9b9a5', 1)
  const insets = make(new THREE.BoxGeometry(0.62, 0.012, 0.62), '#d4ddcb', 1)
  insets.receiveShadow = false
  const wallGeometry = new THREE.BoxGeometry(0.46, 0.26, 0.4)
  const roofShape = new THREE.Shape()
  roofShape.moveTo(-0.29, 0)
  roofShape.lineTo(0.29, 0)
  roofShape.lineTo(0, 0.18)
  roofShape.closePath()
  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: 0.48, bevelEnabled: false }).translate(
    0,
    0.27,
    -0.24,
  )
  const walls = [make(wallGeometry, '#42a477', 0.8, true), make(wallGeometry, '#db6862', 0.8, true)]
  const roofs = [make(roofGeometry, '#267c59', 0.8, true), make(roofGeometry, '#b84746', 0.8, true)]
  const doors = make(new THREE.BoxGeometry(0.09, 0.16, 0.012), '#e3ead8', 0.9, true)
  const windows = make(new THREE.BoxGeometry(0.085, 0.075, 0.012), '#d1e9e7', 0.6, true)
  const dynamicMeshes = [...walls, ...roofs, doors, windows]
  const rows: { matrix: THREE.Matrix4; level: number; mortgaged: boolean }[] = []
  const local = new THREE.Matrix4(),
    matrix = new THREE.Matrix4()
  const place = (mesh: THREE.InstancedMesh, transform: THREE.Matrix4, x: number, y: number, z = 0) => {
    matrix.multiplyMatrices(transform, local.makeTranslation(x, y, z))
    mesh.setMatrixAt(mesh.count++, matrix)
  }
  const refresh = (meshes: THREE.InstancedMesh[]) => {
    for (const mesh of meshes) {
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }
  const rebuild = () => {
    for (const mesh of dynamicMeshes) mesh.count = 0
    for (const row of rows) {
      if (row.mortgaged) continue
      for (let i = 0; i < Math.min(row.level, MAX_PROPERTY_LEVEL); i++) {
        const x = (i - (MAX_PROPERTY_LEVEL - 1) / 2) * 0.82
        const hotel = i === MAX_PROPERTY_LEVEL - 1 ? 1 : 0
        place(walls[hotel]!, row.matrix, x, 0.185)
        place(roofs[hotel]!, row.matrix, x, 0.045)
        place(doors, row.matrix, x - 0.085, 0.135, 0.206)
        place(windows, row.matrix, x + 0.09, 0.225, 0.206)
      }
    }
    refresh(dynamicMeshes)
  }
  return {
    group,
    addRow(position: THREE.Vector3, rotation: number) {
      const anchor = new THREE.Group()
      anchor.position.copy(position)
      anchor.rotation.y = rotation
      anchor.updateMatrix()
      const row = { matrix: anchor.matrix.clone(), level: 0, mortgaged: false }
      rows.push(row)
      const footprints: THREE.Vector3[] = []
      for (let i = 0; i < MAX_PROPERTY_LEVEL; i++) {
        const x = (i - (MAX_PROPERTY_LEVEL - 1) / 2) * 0.82
        place(slots, row.matrix, x, 0.014)
        place(insets, row.matrix, x, 0.033)
        footprints.push(new THREE.Vector3(x, 0.045, 0).applyMatrix4(row.matrix))
      }
      refresh([slots, insets])
      return {
        footprints,
        setLevel(level: number, mortgaged: boolean) {
          if (row.level === level && row.mortgaged === mortgaged) return
          row.level = level
          row.mortgaged = mortgaged
          rebuild()
        },
      }
    },
  }
}
