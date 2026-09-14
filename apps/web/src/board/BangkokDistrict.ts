import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { disposeScene, solid } from './sceneUtils.js'

const stone = '#eee9d9', trim = '#c6ac6c', jade = '#397c70', roofRed = '#bd6559'

function prang(parent: THREE.Group, x: number, z: number, scale: number) {
  const tower = new THREE.Group(); tower.position.set(x, .18, z); tower.scale.setScalar(scale); parent.add(tower)
  for (let i = 0; i < 4; i++) {
    const width = 1.65 - i * .2
    solid(tower, new THREE.BoxGeometry(width, .13, width), i % 2 ? trim : stone, 0, i * .13)
  }
  solid(tower, new THREE.CylinderGeometry(.48, .69, .85, 4), stone, 0, .9).rotation.y = Math.PI / 4
  for (let i = 0; i < 7; i++) {
    const radius = .55 - i * .057, y = 1.35 + i * .22
    solid(tower, new THREE.CylinderGeometry(radius * .75, radius, .23, 8), stone, 0, y)
    solid(tower, new THREE.CylinderGeometry(radius + .035, radius + .035, .055, 8), i % 2 ? jade : trim, 0, y - .095)
  }
  solid(tower, new THREE.ConeGeometry(.18, .8, 8), trim, 0, 3.02)
  solid(tower, new THREE.SphereGeometry(.07, 8, 6), trim, 0, 3.5)
  for (let side = 0; side < 4; side++) {
    const detail = new THREE.Group(); detail.rotation.y = side * Math.PI / 2; tower.add(detail)
    solid(detail, new THREE.BoxGeometry(.22, .38, .045), jade, 0, .93, .505)
    solid(detail, new THREE.ConeGeometry(.18, .2, 3), trim, 0, 1.21, .51).rotation.y = Math.PI
    for (const dx of [-.32, .32]) solid(detail, new THREE.BoxGeometry(.075, .5, .08), trim, dx, .95, .5)
    for (let step = 0; step < 5; step++) solid(detail, new THREE.BoxGeometry(.44, .07, .14), stone, 0, step * .07 + .025, 1.1 - step * .12)
  }
}

function pavilion(parent: THREE.Group, x: number, z: number, rotation: number) {
  const group = new THREE.Group(); group.position.set(x, .23, z); group.rotation.y = rotation; parent.add(group)
  solid(group, new THREE.BoxGeometry(1.5, .16, 2.15), stone, 0, .08)
  solid(group, new THREE.BoxGeometry(1.12, .88, 1.7), '#f5ecdb', 0, .59)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      solid(group, new THREE.BoxGeometry(.07, .85, .07), trim, side * .63, .6, (i - 1) * .75)
      solid(group, new THREE.BoxGeometry(.035, .35, .23), jade, side * .57, .69, (i - 1) * .47)
    }
    solid(group, new THREE.BoxGeometry(.24, .57, .035), jade, 0, .49, side * .86)
  }
  for (let tier = 0; tier < 3; tier++) {
    const width = 1.9 - tier * .36, depth = 2.45 - tier * .36, y = 1.04 + tier * .24
    for (const side of [-1, 1]) {
      const roof = solid(group, new THREE.BoxGeometry(width / 2 + .06, .08, depth), tier === 1 ? jade : roofRed, side * width / 4, y)
      roof.rotation.z = -side * .38
      const edge = solid(group, new THREE.BoxGeometry(.055, .09, depth + .05), trim, side * width / 2, y - width * .1)
      edge.rotation.z = -side * .38
    }
    for (const end of [-1, 1]) {
      solid(group, new THREE.ConeGeometry(.055, .4, 5), trim, 0, y + width * .12 + .18, end * depth / 2).rotation.x = end * .28
    }
  }
}

function palm(parent: THREE.Group, x: number, z: number, scale = 1) {
  const tree = new THREE.Group(); tree.position.set(x, .12, z); tree.scale.setScalar(scale); parent.add(tree)
  solid(tree, new THREE.CylinderGeometry(.055, .095, 1.35, 6), '#a58c69', 0, .67).rotation.z = -.08
  for (let i = 0; i < 6; i++) {
    const leaf = solid(tree, new THREE.SphereGeometry(.5, 5, 3), i % 2 ? '#4d946d' : '#78a766', Math.cos(i * Math.PI / 3) * .3, 1.4, Math.sin(i * Math.PI / 3) * .3)
    leaf.scale.set(1, .15, .28); leaf.rotation.y = -i * Math.PI / 3; leaf.rotation.z = .15
  }
}

export function bangkokDistrict() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(6.4, .16, 6.4), '#b7c99b', 0, .04)
  solid(group, new THREE.BoxGeometry(5.2, .15, 4.5), '#d7d6bd', 0, .13, -.2)
  solid(group, new THREE.BoxGeometry(1.15, .025, 4.1), '#eee7d4', 0, .22, -.2)
  prang(group, 0, 0, 1.12)
  for (const x of [-1.23, 1.23]) for (const z of [-1.15, 1.15]) prang(group, x, z, .34)
  pavilion(group, -2.13, 0, 0); pavilion(group, 2.13, 0, 0)
  for (const x of [-2.7, 2.7]) for (const z of [-2.6, 2.6]) palm(group, x, z, .8)
  for (const x of [-1, 1]) {
    solid(group, new THREE.BoxGeometry(1.9, .32, .11), stone, x * 1.77, .34, 1.76)
    solid(group, new THREE.BoxGeometry(1.95, .055, .17), trim, x * 1.77, .52, 1.76)
    solid(group, new THREE.BoxGeometry(.17, .67, .17), stone, x * .78, .49, 1.76)
    solid(group, new THREE.SphereGeometry(.13, 8, 6), trim, x * .78, .88, 1.76)
  }
  // The waterfront remains part of the location, separate from purchasable houses.
  solid(group, new THREE.BoxGeometry(6.2, .08, .3), '#8ea6a0', 0, .04, 2.18)
  solid(group, new THREE.BoxGeometry(6.2, .035, .7), '#61abb3', 0, .1, 2.7)
  for (let i = 0; i < 5; i++) solid(group, new THREE.BoxGeometry(.32, .055, 1), '#cbb590', -.64 + i * .32, .15, 2.7)
  for (const x of [-.85, .85]) for (const z of [2.2, 3.15]) solid(group, new THREE.CylinderGeometry(.045, .045, .4, 6), '#8c8269', x, .19, z)
  const boat = new THREE.Group(); boat.position.set(2.1, .18, 2.7); group.add(boat)
  const hull = solid(boat, new THREE.SphereGeometry(.55, 8, 4), '#b76651'); hull.scale.set(1.3, .23, .35)
  solid(boat, new THREE.BoxGeometry(.64, .025, .25), '#efd3a5', 0, .06)
  for (const x of [-.22, .22]) solid(boat, new THREE.BoxGeometry(.025, .25, .025), trim, x, .2)
  solid(boat, new THREE.BoxGeometry(.6, .04, .36), jade, 0, .34)
  // Bake static architecture by material; the animated boat retains its own transform.
  group.remove(boat); group.updateMatrixWorld(true)
  const batches = new Map<string, { material: THREE.MeshStandardMaterial; geometries: THREE.BufferGeometry[] }>()
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) return
    const key = `${object.material.color.getHex()}:${object.material.roughness}:${object.material.metalness}`
    if (!batches.has(key)) batches.set(key, { material: object.material.clone(), geometries: [] })
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
    batches.get(key)!.geometries.push(geometry.applyMatrix4(object.matrixWorld))
  })
  disposeScene(group); group.clear()
  for (const { material, geometries } of batches.values()) {
    const geometry = mergeGeometries(geometries)
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh)
    } else material.dispose()
    geometries.forEach((piece) => piece.dispose())
  }
  group.add(boat)
  return { group, boat }
}
