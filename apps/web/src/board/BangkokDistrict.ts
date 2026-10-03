import * as THREE from 'three'
import { solid } from './sceneUtils.js'
import { optimizeStaticModel } from './optimizeStaticModel.js'

const stone = '#eee9d9',
  trim = '#c6ac6c',
  jade = '#397c70',
  roofRed = '#bd6559'

function prang(parent: THREE.Group, x: number, z: number, scale: number) {
  const tower = new THREE.Group()
  tower.position.set(x, 0.18, z)
  tower.scale.setScalar(scale)
  parent.add(tower)
  for (let i = 0; i < 4; i++) {
    const width = 1.65 - i * 0.2
    solid(tower, new THREE.BoxGeometry(width, 0.13, width), i % 2 ? trim : stone, 0, i * 0.13)
  }
  solid(tower, new THREE.CylinderGeometry(0.48, 0.69, 0.85, 4), stone, 0, 0.9).rotation.y = Math.PI / 4
  for (let i = 0; i < 7; i++) {
    const radius = 0.55 - i * 0.057,
      y = 1.35 + i * 0.22
    solid(tower, new THREE.CylinderGeometry(radius * 0.75, radius, 0.23, 8), stone, 0, y)
    solid(
      tower,
      new THREE.CylinderGeometry(radius + 0.035, radius + 0.035, 0.055, 8),
      i % 2 ? jade : trim,
      0,
      y - 0.095,
    )
  }
  solid(tower, new THREE.ConeGeometry(0.18, 0.8, 8), trim, 0, 3.02)
  solid(tower, new THREE.SphereGeometry(0.07, 8, 6), trim, 0, 3.5)
  for (let side = 0; side < 4; side++) {
    const detail = new THREE.Group()
    detail.rotation.y = (side * Math.PI) / 2
    tower.add(detail)
    solid(detail, new THREE.BoxGeometry(0.22, 0.38, 0.045), jade, 0, 0.93, 0.505)
    solid(detail, new THREE.ConeGeometry(0.18, 0.2, 3), trim, 0, 1.21, 0.51).rotation.y = Math.PI
    for (const dx of [-0.32, 0.32]) solid(detail, new THREE.BoxGeometry(0.075, 0.5, 0.08), trim, dx, 0.95, 0.5)
    for (let step = 0; step < 5; step++)
      solid(detail, new THREE.BoxGeometry(0.44, 0.07, 0.14), stone, 0, step * 0.07 + 0.025, 1.1 - step * 0.12)
  }
}

function pavilion(parent: THREE.Group, x: number, z: number, rotation: number) {
  const group = new THREE.Group()
  group.position.set(x, 0.23, z)
  group.rotation.y = rotation
  parent.add(group)
  solid(group, new THREE.BoxGeometry(1.5, 0.16, 2.15), stone, 0, 0.08)
  solid(group, new THREE.BoxGeometry(1.12, 0.88, 1.7), '#f5ecdb', 0, 0.59)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      solid(group, new THREE.BoxGeometry(0.07, 0.85, 0.07), trim, side * 0.63, 0.6, (i - 1) * 0.75)
      solid(group, new THREE.BoxGeometry(0.035, 0.35, 0.23), jade, side * 0.57, 0.69, (i - 1) * 0.47)
    }
    solid(group, new THREE.BoxGeometry(0.24, 0.57, 0.035), jade, 0, 0.49, side * 0.86)
  }
  for (let tier = 0; tier < 3; tier++) {
    const width = 1.9 - tier * 0.36,
      depth = 2.45 - tier * 0.36,
      y = 1.04 + tier * 0.24
    for (const side of [-1, 1]) {
      const roof = solid(
        group,
        new THREE.BoxGeometry(width / 2 + 0.06, 0.08, depth),
        tier === 1 ? jade : roofRed,
        (side * width) / 4,
        y,
      )
      roof.rotation.z = -side * 0.38
      const edge = solid(
        group,
        new THREE.BoxGeometry(0.055, 0.09, depth + 0.05),
        trim,
        (side * width) / 2,
        y - width * 0.1,
      )
      edge.rotation.z = -side * 0.38
    }
    for (const end of [-1, 1]) {
      solid(
        group,
        new THREE.ConeGeometry(0.055, 0.4, 5),
        trim,
        0,
        y + width * 0.12 + 0.18,
        (end * depth) / 2,
      ).rotation.x = end * 0.28
    }
  }
}

function palm(parent: THREE.Group, x: number, z: number, scale = 1) {
  const tree = new THREE.Group()
  tree.position.set(x, 0.12, z)
  tree.scale.setScalar(scale)
  parent.add(tree)
  solid(tree, new THREE.CylinderGeometry(0.055, 0.095, 1.35, 6), '#a58c69', 0, 0.67).rotation.z = -0.08
  for (let i = 0; i < 6; i++) {
    const leaf = solid(
      tree,
      new THREE.SphereGeometry(0.5, 5, 3),
      i % 2 ? '#4d946d' : '#78a766',
      Math.cos((i * Math.PI) / 3) * 0.3,
      1.4,
      Math.sin((i * Math.PI) / 3) * 0.3,
    )
    leaf.scale.set(1, 0.15, 0.28)
    leaf.rotation.y = (-i * Math.PI) / 3
    leaf.rotation.z = 0.15
  }
}

export function bangkokDistrict() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(6.4, 0.16, 6.4), '#b7c99b', 0, 0.04)
  solid(group, new THREE.BoxGeometry(5.2, 0.15, 4.5), '#d7d6bd', 0, 0.13, -0.2)
  solid(group, new THREE.BoxGeometry(1.15, 0.025, 4.1), '#eee7d4', 0, 0.22, -0.2)
  prang(group, 0, 0, 1.12)
  for (const x of [-1.23, 1.23]) for (const z of [-1.15, 1.15]) prang(group, x, z, 0.34)
  pavilion(group, -2.13, 0, 0)
  pavilion(group, 2.13, 0, 0)
  for (const x of [-2.7, 2.7]) for (const z of [-2.6, 2.6]) palm(group, x, z, 0.8)
  for (const x of [-1, 1]) {
    solid(group, new THREE.BoxGeometry(1.9, 0.32, 0.11), stone, x * 1.77, 0.34, 1.76)
    solid(group, new THREE.BoxGeometry(1.95, 0.055, 0.17), trim, x * 1.77, 0.52, 1.76)
    solid(group, new THREE.BoxGeometry(0.17, 0.67, 0.17), stone, x * 0.78, 0.49, 1.76)
    solid(group, new THREE.SphereGeometry(0.13, 8, 6), trim, x * 0.78, 0.88, 1.76)
  }
  // The waterfront remains part of the location, separate from purchasable houses.
  solid(group, new THREE.BoxGeometry(6.2, 0.08, 0.3), '#8ea6a0', 0, 0.04, 2.18)
  solid(group, new THREE.BoxGeometry(6.2, 0.035, 0.7), '#61abb3', 0, 0.1, 2.7)
  for (let i = 0; i < 5; i++)
    solid(group, new THREE.BoxGeometry(0.32, 0.055, 1), '#cbb590', -0.64 + i * 0.32, 0.15, 2.7)
  for (const x of [-0.85, 0.85])
    for (const z of [2.2, 3.15]) solid(group, new THREE.CylinderGeometry(0.045, 0.045, 0.4, 6), '#8c8269', x, 0.19, z)
  const boat = new THREE.Group()
  boat.position.set(2.1, 0.18, 2.7)
  group.add(boat)
  const hull = solid(boat, new THREE.SphereGeometry(0.55, 8, 4), '#b76651')
  hull.scale.set(1.3, 0.23, 0.35)
  solid(boat, new THREE.BoxGeometry(0.64, 0.025, 0.25), '#efd3a5', 0, 0.06)
  for (const x of [-0.22, 0.22]) solid(boat, new THREE.BoxGeometry(0.025, 0.25, 0.025), trim, x, 0.2)
  solid(boat, new THREE.BoxGeometry(0.6, 0.04, 0.36), jade, 0, 0.34)
  // Keep shared materials alive and indices intact; the boat retains its own transform.
  optimizeStaticModel(group, new Set([boat]), true)
  return { group, boat }
}
