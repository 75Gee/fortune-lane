import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { solid } from './sceneUtils.js'

function beam(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, color: string, radius = .014) {
  const direction = to.clone().sub(from), center = from.clone().add(to).multiplyScalar(.5)
  const mesh = solid(parent, new THREE.CylinderGeometry(radius, radius, direction.length(), 6), color, center.x, center.y, center.z)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
}

function pyramid(parent: THREE.Object3D, x: number, z: number, width: number, height: number) {
  const group = new THREE.Group(); group.position.set(x, .16, z); parent.add(group)
  const body = solid(group, new THREE.ConeGeometry(width / Math.SQRT2, height, 4), '#d4b27a', 0, height / 2)
  body.rotation.y = Math.PI / 4
  const capHeight = height * .13
  const cap = solid(group, new THREE.ConeGeometry(width * .13 / Math.SQRT2, capHeight, 4), '#e6cc96', 0, height - capHeight / 2 + .002)
  cap.rotation.y = Math.PI / 4
  // Subtle horizontal stone courses keep the silhouette clean at board scale.
  for (let row = 1; row < 7; row++) {
    const y = height * row / 8, half = width / 2 * (1 - y / height) + .004
    for (const side of [-1, 1]) {
      beam(group, new THREE.Vector3(-half, y, side * half), new THREE.Vector3(half, y, side * half), '#c5a16e', .006)
      beam(group, new THREE.Vector3(side * half, y, -half), new THREE.Vector3(side * half, y, half), '#c5a16e', .006)
    }
  }
}

function palm(parent: THREE.Object3D, x: number, z: number) {
  const group = new THREE.Group(); group.position.set(x, .16, z); parent.add(group)
  const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.015, .4, 0), new THREE.Vector3(.07, .83, -.025)])
  solid(group, new THREE.TubeGeometry(trunk, 8, .034, 6, false), '#ad8b5e')
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2
    const leaf = solid(group, new THREE.SphereGeometry(.23, 10, 6), i % 2 ? '#7c9760' : '#92a56c', .07 + Math.sin(angle) * .12, .82, -.025 + Math.cos(angle) * .12)
    leaf.scale.set(.36, .12, 1.15); leaf.rotation.y = angle; leaf.rotation.x = .15
  }
}

export function cairoLandmark() {
  const group = new THREE.Group(); group.name = '开罗 · 金字塔庭院'
  solid(group, new RoundedBoxGeometry(3.2, .12, 3.2, 2, .06), '#cabb94', 0, .06)
  solid(group, new RoundedBoxGeometry(3.02, .04, 3.02, 2, .06), '#e5d4ab', 0, .14)
  solid(group, new THREE.BoxGeometry(2.68, .018, .34), '#f1e1bc', -.03, .17, 1.25)
  pyramid(group, -.45, -.32, 1.74, 1.52)
  pyramid(group, .95, -.51, .88, .79)
  pyramid(group, .81, .58, .53, .46)
  const sphinx = new THREE.Group(); sphinx.position.set(-.48, .16, .83); group.add(sphinx)
  solid(sphinx, new RoundedBoxGeometry(.52, .22, .67, 2, .08), '#cfad7a', 0, .12)
  for (const x of [-.16, .16]) solid(sphinx, new RoundedBoxGeometry(.15, .11, .43, 2, .035), '#ddbf8d', x, .06, .39)
  solid(sphinx, new RoundedBoxGeometry(.32, .31, .23, 2, .045), '#dabc87', 0, .31, .21)
  const headdress = solid(sphinx, new THREE.ConeGeometry(.24, .38, 4), '#c19b65', 0, .39, .14)
  headdress.rotation.y = Math.PI / 4; headdress.scale.z = .58
  solid(sphinx, new RoundedBoxGeometry(.16, .2, .065, 2, .02), '#e2c796', 0, .35, .342)
  solid(sphinx, new THREE.BoxGeometry(.032, .075, .032), '#c4a16e', 0, .34, .389)
  for (const x of [-1.36, 1.34]) palm(group, x, x < 0 ? .3 : -1.2)
  for (const x of [-1.12, 1.08]) solid(group, new THREE.CylinderGeometry(.075, .085, .07, 12), '#bba479', x, .205, 1.28)
  return group
}

export function hongKongLandmark() {
  const group = new THREE.Group(); group.name = '香港 · 维港建筑群'
  solid(group, new RoundedBoxGeometry(3.2, .12, 3.2, 2, .06), '#bbcdbc', 0, .06)
  solid(group, new THREE.BoxGeometry(3.04, .025, .85), '#80b8c1', 0, .135, 1.085)
  solid(group, new THREE.BoxGeometry(3.04, .07, .22), '#e0dcc4', 0, .165, .58)
  solid(group, new RoundedBoxGeometry(2.93, .13, 1.92, 2, .035), '#d8ddcd', 0, .195, -.48)
  const tower = new THREE.Group(); tower.position.set(-.48, .26, -.44); group.add(tower)
  solid(tower, new THREE.BoxGeometry(.62, 2.03, .63), '#8bafba', 0, 1.015)
  solid(tower, new THREE.BoxGeometry(.32, 1.63, .57), '#6f9dac', .45, .815, .03)
  for (const side of [-1, 1]) {
    const z = side * .326
    for (const x of [-.31, .31]) beam(tower, new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 2.04, z), '#e0e6dc', .018)
    for (let floor = 1; floor < 12; floor++) solid(tower, new THREE.BoxGeometry(.61, .012, .014), '#bbced0', 0, floor * .167, z)
    for (let section = 0; section < 3; section++) {
      const lower = section * .67, upper = lower + .67
      beam(tower, new THREE.Vector3(-.3, lower, z), new THREE.Vector3(.3, upper, z), '#e8e8d9', .018)
      beam(tower, new THREE.Vector3(.3, lower, z), new THREE.Vector3(-.3, upper, z), '#e8e8d9', .018)
    }
  }
  const crown = solid(tower, new THREE.ConeGeometry(.435, .42, 4), '#b7cacf', 0, 2.24)
  crown.rotation.y = Math.PI / 4; crown.scale.z = .96
  for (const x of [-.2, .2]) solid(tower, new THREE.CylinderGeometry(.014, .019, .44, 6), '#d4dfd6', x, 2.53, -.04)
  const ifc = new THREE.Group(); ifc.position.set(.65, .26, -.64); group.add(ifc)
  solid(ifc, new RoundedBoxGeometry(.57, 1.97, .65, 2, .05), '#91afb3', 0, .985)
  for (const x of [-.24, -.12, 0, .12, .24]) for (const z of [-.326, .326]) solid(ifc, new THREE.BoxGeometry(.022, 1.93, .015), '#d8dfd5', x, .985, z)
  for (let floor = 1; floor < 13; floor++) for (const z of [-.327, .327]) solid(ifc, new THREE.BoxGeometry(.51, .012, .014), '#c0d0cc', 0, floor * .15, z)
  solid(ifc, new RoundedBoxGeometry(.47, .18, .55, 2, .035), '#c8d6cc', 0, 2.055)
  solid(ifc, new THREE.BoxGeometry(.36, .12, .44), '#acc4bf', 0, 2.205)
  for (const [x, height, z] of [[-1.19, .7, -.6], [1.22, .85, -.6], [.82, .47, .17]] as const) {
    solid(group, new RoundedBoxGeometry(.36, height, .46, 2, .025), '#b9c7b6', x, .26 + height / 2, z)
    for (let floor = 1; floor <= 3; floor++) solid(group, new THREE.BoxGeometry(.26, .075, .018), '#739b9c', x, .29 + floor * height / 4, z + .236)
  }
  for (let post = 0; post < 10; post++) solid(group, new THREE.CylinderGeometry(.012, .016, .13, 6), '#789686', -1.38 + post * .306, .265, .68)
  solid(group, new THREE.BoxGeometry(2.83, .018, .018), '#92a890', 0, .328, .68)
  const ferry = new THREE.Group(); ferry.position.set(.05, .16, 1.12); ferry.rotation.y = -.15; group.add(ferry)
  solid(ferry, new RoundedBoxGeometry(.78, .14, .3, 2, .07), '#518675', 0, .07)
  solid(ferry, new RoundedBoxGeometry(.54, .13, .25, 2, .025), '#efe8d2', 0, .19)
  solid(ferry, new THREE.BoxGeometry(.65, .03, .29), '#6d9480', 0, .272)
  for (const x of [-.18, -.06, .06, .18]) for (const z of [-.128, .128]) solid(ferry, new THREE.BoxGeometry(.073, .07, .012), '#8baeb2', x, .194, z)
  solid(ferry, new THREE.CylinderGeometry(.014, .018, .14, 6), '#b0ae85', .14, .352)
  for (const x of [-1.32, 1.32]) {
    solid(group, new RoundedBoxGeometry(.26, .09, .29, 2, .025), '#d1cba9', x, .235, .37)
    solid(group, new THREE.IcosahedronGeometry(.15, 1), '#749774', x, .41, .37)
  }
  return group
}
