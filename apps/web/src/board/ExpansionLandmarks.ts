import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { solid } from './sceneUtils.js'

function beam(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, color: string, radius = 0.014) {
  const direction = to.clone().sub(from),
    center = from.clone().add(to).multiplyScalar(0.5)
  const mesh = solid(
    parent,
    new THREE.CylinderGeometry(radius, radius, direction.length(), 6),
    color,
    center.x,
    center.y,
    center.z,
  )
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
}

function pyramid(parent: THREE.Object3D, x: number, z: number, width: number, height: number) {
  const group = new THREE.Group()
  group.position.set(x, 0.16, z)
  parent.add(group)
  const body = solid(group, new THREE.ConeGeometry(width / Math.SQRT2, height, 4), '#d4b27a', 0, height / 2)
  body.rotation.y = Math.PI / 4
  const capHeight = height * 0.13
  const cap = solid(
    group,
    new THREE.ConeGeometry((width * 0.13) / Math.SQRT2, capHeight, 4),
    '#e6cc96',
    0,
    height - capHeight / 2 + 0.002,
  )
  cap.rotation.y = Math.PI / 4
  // Subtle horizontal stone courses keep the silhouette clean at board scale.
  for (let row = 1; row < 7; row++) {
    const y = (height * row) / 8,
      half = (width / 2) * (1 - y / height) + 0.004
    for (const side of [-1, 1]) {
      beam(group, new THREE.Vector3(-half, y, side * half), new THREE.Vector3(half, y, side * half), '#c5a16e', 0.006)
      beam(group, new THREE.Vector3(side * half, y, -half), new THREE.Vector3(side * half, y, half), '#c5a16e', 0.006)
    }
  }
}

function palm(parent: THREE.Object3D, x: number, z: number) {
  const group = new THREE.Group()
  group.position.set(x, 0.16, z)
  parent.add(group)
  const trunk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.015, 0.4, 0),
    new THREE.Vector3(0.07, 0.83, -0.025),
  ])
  solid(group, new THREE.TubeGeometry(trunk, 8, 0.034, 6, false), '#ad8b5e')
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const leaf = solid(
      group,
      new THREE.SphereGeometry(0.23, 10, 6),
      i % 2 ? '#7c9760' : '#92a56c',
      0.07 + Math.sin(angle) * 0.12,
      0.82,
      -0.025 + Math.cos(angle) * 0.12,
    )
    leaf.scale.set(0.36, 0.12, 1.15)
    leaf.rotation.y = angle
    leaf.rotation.x = 0.15
  }
}

export function cairoLandmark() {
  const group = new THREE.Group()
  group.name = '开罗 · 金字塔庭院'
  solid(group, new RoundedBoxGeometry(3.2, 0.12, 3.2, 2, 0.06), '#cabb94', 0, 0.06)
  solid(group, new RoundedBoxGeometry(3.02, 0.04, 3.02, 2, 0.06), '#e5d4ab', 0, 0.14)
  solid(group, new THREE.BoxGeometry(2.68, 0.018, 0.34), '#f1e1bc', -0.03, 0.17, 1.25)
  pyramid(group, -0.45, -0.32, 1.74, 1.52)
  pyramid(group, 0.95, -0.51, 0.88, 0.79)
  pyramid(group, 0.81, 0.58, 0.53, 0.46)
  const sphinx = new THREE.Group()
  sphinx.position.set(-0.48, 0.16, 0.83)
  group.add(sphinx)
  solid(sphinx, new RoundedBoxGeometry(0.52, 0.22, 0.67, 2, 0.08), '#cfad7a', 0, 0.12)
  for (const x of [-0.16, 0.16])
    solid(sphinx, new RoundedBoxGeometry(0.15, 0.11, 0.43, 2, 0.035), '#ddbf8d', x, 0.06, 0.39)
  solid(sphinx, new RoundedBoxGeometry(0.32, 0.31, 0.23, 2, 0.045), '#dabc87', 0, 0.31, 0.21)
  const headdress = solid(sphinx, new THREE.ConeGeometry(0.24, 0.38, 4), '#c19b65', 0, 0.39, 0.14)
  headdress.rotation.y = Math.PI / 4
  headdress.scale.z = 0.58
  solid(sphinx, new RoundedBoxGeometry(0.16, 0.2, 0.065, 2, 0.02), '#e2c796', 0, 0.35, 0.342)
  solid(sphinx, new THREE.BoxGeometry(0.032, 0.075, 0.032), '#c4a16e', 0, 0.34, 0.389)
  for (const x of [-1.36, 1.34]) palm(group, x, x < 0 ? 0.3 : -1.2)
  for (const x of [-1.12, 1.08])
    solid(group, new THREE.CylinderGeometry(0.075, 0.085, 0.07, 12), '#bba479', x, 0.205, 1.28)
  return group
}

export function hongKongLandmark() {
  const group = new THREE.Group()
  group.name = '香港 · 维港建筑群'
  solid(group, new RoundedBoxGeometry(3.2, 0.12, 3.2, 2, 0.06), '#bbcdbc', 0, 0.06)
  solid(group, new THREE.BoxGeometry(3.04, 0.025, 0.85), '#80b8c1', 0, 0.135, 1.085)
  solid(group, new THREE.BoxGeometry(3.04, 0.07, 0.22), '#e0dcc4', 0, 0.165, 0.58)
  solid(group, new RoundedBoxGeometry(2.93, 0.13, 1.92, 2, 0.035), '#d8ddcd', 0, 0.195, -0.48)
  const tower = new THREE.Group()
  tower.position.set(-0.48, 0.26, -0.44)
  group.add(tower)
  solid(tower, new THREE.BoxGeometry(0.62, 2.03, 0.63), '#8bafba', 0, 1.015)
  solid(tower, new THREE.BoxGeometry(0.32, 1.63, 0.57), '#6f9dac', 0.45, 0.815, 0.03)
  for (const side of [-1, 1]) {
    const z = side * 0.326
    for (const x of [-0.31, 0.31])
      beam(tower, new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 2.04, z), '#e0e6dc', 0.018)
    for (let floor = 1; floor < 12; floor++)
      solid(tower, new THREE.BoxGeometry(0.61, 0.012, 0.014), '#bbced0', 0, floor * 0.167, z)
    for (let section = 0; section < 3; section++) {
      const lower = section * 0.67,
        upper = lower + 0.67
      beam(tower, new THREE.Vector3(-0.3, lower, z), new THREE.Vector3(0.3, upper, z), '#e8e8d9', 0.018)
      beam(tower, new THREE.Vector3(0.3, lower, z), new THREE.Vector3(-0.3, upper, z), '#e8e8d9', 0.018)
    }
  }
  const crown = solid(tower, new THREE.ConeGeometry(0.435, 0.42, 4), '#b7cacf', 0, 2.24)
  crown.rotation.y = Math.PI / 4
  crown.scale.z = 0.96
  for (const x of [-0.2, 0.2])
    solid(tower, new THREE.CylinderGeometry(0.014, 0.019, 0.44, 6), '#d4dfd6', x, 2.53, -0.04)
  const ifc = new THREE.Group()
  ifc.position.set(0.65, 0.26, -0.64)
  group.add(ifc)
  solid(ifc, new RoundedBoxGeometry(0.57, 1.97, 0.65, 2, 0.05), '#91afb3', 0, 0.985)
  for (const x of [-0.24, -0.12, 0, 0.12, 0.24])
    for (const z of [-0.326, 0.326]) solid(ifc, new THREE.BoxGeometry(0.022, 1.93, 0.015), '#d8dfd5', x, 0.985, z)
  for (let floor = 1; floor < 13; floor++)
    for (const z of [-0.327, 0.327])
      solid(ifc, new THREE.BoxGeometry(0.51, 0.012, 0.014), '#c0d0cc', 0, floor * 0.15, z)
  solid(ifc, new RoundedBoxGeometry(0.47, 0.18, 0.55, 2, 0.035), '#c8d6cc', 0, 2.055)
  solid(ifc, new THREE.BoxGeometry(0.36, 0.12, 0.44), '#acc4bf', 0, 2.205)
  for (const [x, height, z] of [
    [-1.19, 0.7, -0.6],
    [1.22, 0.85, -0.6],
    [0.82, 0.47, 0.17],
  ] as const) {
    solid(group, new RoundedBoxGeometry(0.36, height, 0.46, 2, 0.025), '#b9c7b6', x, 0.26 + height / 2, z)
    for (let floor = 1; floor <= 3; floor++)
      solid(group, new THREE.BoxGeometry(0.26, 0.075, 0.018), '#739b9c', x, 0.29 + (floor * height) / 4, z + 0.236)
  }
  for (let post = 0; post < 10; post++)
    solid(group, new THREE.CylinderGeometry(0.012, 0.016, 0.13, 6), '#789686', -1.38 + post * 0.306, 0.265, 0.68)
  solid(group, new THREE.BoxGeometry(2.83, 0.018, 0.018), '#92a890', 0, 0.328, 0.68)
  const ferry = new THREE.Group()
  ferry.position.set(0.05, 0.16, 1.12)
  ferry.rotation.y = -0.15
  group.add(ferry)
  solid(ferry, new RoundedBoxGeometry(0.78, 0.14, 0.3, 2, 0.07), '#518675', 0, 0.07)
  solid(ferry, new RoundedBoxGeometry(0.54, 0.13, 0.25, 2, 0.025), '#efe8d2', 0, 0.19)
  solid(ferry, new THREE.BoxGeometry(0.65, 0.03, 0.29), '#6d9480', 0, 0.272)
  for (const x of [-0.18, -0.06, 0.06, 0.18])
    for (const z of [-0.128, 0.128]) solid(ferry, new THREE.BoxGeometry(0.073, 0.07, 0.012), '#8baeb2', x, 0.194, z)
  solid(ferry, new THREE.CylinderGeometry(0.014, 0.018, 0.14, 6), '#b0ae85', 0.14, 0.352)
  for (const x of [-1.32, 1.32]) {
    solid(group, new RoundedBoxGeometry(0.26, 0.09, 0.29, 2, 0.025), '#d1cba9', x, 0.235, 0.37)
    solid(group, new THREE.IcosahedronGeometry(0.15, 1), '#749774', x, 0.41, 0.37)
  }
  return group
}
