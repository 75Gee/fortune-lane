import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { solid } from './sceneUtils.js'

export const CORNER_CELL_SIZE = 3.2
type CornerKind = 'go' | 'jail' | 'hospital' | 'go_to_jail'

// The origin is the outer corner cell; the two wings extend along -X and -Z.
export function cornerFootprint(size: number, height: number, inset = 0, rampOpening = false, entryBevel = 0) {
  const min = -size * 1.5 + inset, max = size * .5 - inset, inner = -size * .5 + inset
  const shape = new THREE.Shape()
  const notch: [number, number][] = entryBevel > 0 ? [[inner - entryBevel, inner], [inner, inner - entryBevel]] : [[inner, inner]]
  const points: [number, number][] = [[min, inner], ...notch, [inner, min], [max, min], [max, max], [min, max]]
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z)
  })
  shape.closePath()
  if (rampOpening) {
    const hole = new THREE.Path()
    hole.moveTo(-4.13, -.37); hole.lineTo(-1.37, -.37)
    hole.lineTo(-1.37, -1.02); hole.lineTo(-4.13, -1.02); hole.closePath()
    shape.holes.push(hole)
  }
  return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false }).rotateX(-Math.PI / 2)
}

function foundation(color: string) {
  const group = new THREE.Group()
  solid(group, cornerFootprint(CORNER_CELL_SIZE, .065, .13), color)
  return group
}

function wing(group: THREE.Group, axis: 'x' | 'z') {
  const frame = new THREE.Group()
  frame.position.set(axis === 'x' ? -2.75 : 0, 0, axis === 'z' ? -2.75 : 0)
  frame.rotation.y = axis === 'x' ? Math.PI : -Math.PI / 2
  group.add(frame)
  return frame
}

function clockFace(parent: THREE.Object3D, y: number, z: number) {
  solid(parent, new THREE.TorusGeometry(.23, .025, 8, 28), '#ccb474', 0, y, z)
  solid(parent, new THREE.CircleGeometry(.209, 28), '#f8f0d7', 0, y, z + .006)
  for (let hour = 0; hour < 12; hour++) {
    const angle = hour / 12 * Math.PI * 2
    const tick = solid(parent, new THREE.BoxGeometry(.013, .029, .01), '#52736a', Math.sin(angle) * .181, y + Math.cos(angle) * .181, z + .017)
    tick.rotation.z = -angle
  }
  solid(parent, new THREE.BoxGeometry(.017, .132, .016), '#41665f', 0, y + .056, z + .028)
  const hand = solid(parent, new THREE.BoxGeometry(.105, .018, .016), '#41665f', .04, y - .025, z + .029)
  hand.rotation.z = -.45
}

function cornerFaces(group: THREE.Group, width: number, build: (face: THREE.Group) => void) {
  for (const angle of [Math.PI, -Math.PI / 2]) {
    const face = new THREE.Group(); face.rotation.y = angle
    const surface = new THREE.Group(); surface.position.z = width / 2; face.add(surface)
    build(surface); group.add(face)
  }
}

function planter(parent: THREE.Object3D, x: number, z: number) {
  solid(parent, new RoundedBoxGeometry(.32, .09, .32, 2, .04), '#bdc7b0', x, .112, z)
  solid(parent, new RoundedBoxGeometry(.25, .21, .25, 2, .055), '#6e9d7a', x, .262, z)
}

function car(parent: THREE.Object3D, x: number, y: number, z: number, color: string, police = false) {
  const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group)
  solid(group, new RoundedBoxGeometry(.7, .135, .32, 2, .045), color, 0, .113)
  solid(group, new RoundedBoxGeometry(.35, .135, .277, 2, .025), '#8fb9c0', -.025, .233)
  solid(group, new THREE.BoxGeometry(.31, .028, .29), color, -.025, .313)
  for (const x of [-.228, .228]) for (const z of [-.165, .165]) {
    const wheel = solid(group, new THREE.CylinderGeometry(.071, .071, .036, 12), '#53645f', x, .075, z)
    wheel.rotation.x = Math.PI / 2
  }
  for (const z of [-.107, .107]) solid(group, new THREE.BoxGeometry(.024, .039, .061), '#eee8c7', .35, .151, z)
  if (police) {
    solid(group, new THREE.BoxGeometry(.18, .036, .08), '#586f7a', -.025, .345)
    solid(group, new THREE.BoxGeometry(.08, .045, .07), '#cb716d', -.072, .378)
    solid(group, new THREE.BoxGeometry(.08, .045, .07), '#5a9bc0', .022, .378)
    for (const side of [-1, 1]) solid(group, new THREE.BoxGeometry(.56, .045, .016), '#5b8499', 0, .135, side * .163)
  }
  return group
}

function departureStation() {
  const group = foundation('#d9dfcc')
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 1.03, .58), '#e7dfc5', 0, .065)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, .075, .43), '#588c7e', 0, 1.095)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, .035, .49), '#93b6a0', 0, 1.17)
  for (const axis of ['x', 'z'] as const) {
    const frame = wing(group, axis)
    for (const x of [-1.1, -.55, 0, .55, 1.1]) {
      solid(frame, new THREE.BoxGeometry(.415, .66, .026), '#7caeb4', x, .547, 1.035)
      solid(frame, new THREE.BoxGeometry(.027, .71, .053), '#f2e8c9', x - .226, .565, 1.052)
      solid(frame, new THREE.BoxGeometry(.018, .67, .031), '#dfe6d0', x, .547, 1.059)
      solid(frame, new THREE.BoxGeometry(.44, .023, .032), '#e3e8d2', x, .637, 1.059)
    }
    solid(frame, new THREE.BoxGeometry(2.95, .065, .37), '#6e9f8b', 0, .94, 1.13)
    for (const x of [-1.36, 1.36]) solid(frame, new THREE.CylinderGeometry(.024, .032, .82, 8), '#6c917a', x, .482, 1.258)
    const roof = solid(frame, new THREE.CylinderGeometry(.38, .38, 2.76, 24, 1, false, 0, Math.PI), '#90b8b7', 0, 1.23)
    roof.rotation.z = Math.PI / 2
    for (const x of [-1.2, -.6, 0, .6, 1.2]) {
      const curve = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => {
        const angle = i / 12 * Math.PI
        return new THREE.Vector3(x, 1.23 + Math.sin(angle) * .39, Math.cos(angle) * .39)
      }))
      solid(frame, new THREE.TubeGeometry(curve, 16, .016, 6, false), '#dce2c7')
    }
    for (const x of [-.94, .94]) {
      solid(frame, new THREE.BoxGeometry(.37, .045, .16), '#b0a47f', x, .263, 1.348)
      for (const dx of [-.12, .12]) solid(frame, new THREE.BoxGeometry(.032, .15, .1), '#759381', x + dx, .167, 1.348)
    }
  }
  solid(group, new THREE.BoxGeometry(1.31, .77, 1.31), '#d4c8a7', 0, 1.58)
  solid(group, new THREE.BoxGeometry(1.43, .075, 1.43), '#ece0ba', 0, 2.003)
  cornerFaces(group, 1.31, (face) => clockFace(face, 1.61, .021))
  solid(group, new THREE.CylinderGeometry(.14, 1.06, .49, 4, 1, false, Math.PI / 4), '#5e8a78', 0, 2.286)
  solid(group, new THREE.ConeGeometry(.083, .22, 8), '#d5b977', 0, 2.641)
  for (const [x, z] of [[-4.36, 1.22], [1.22, -4.36], [1.22, 1.22]] as const) planter(group, x, z)
  return group
}

function prisonBlock() {
  const group = foundation('#cbd3c5')
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 1.17, .58, false, .34), '#b0b5a7', 0, .065)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, .1, .43, false, .34), '#7f9389', 0, 1.235)
  for (const axis of ['x', 'z'] as const) {
    const frame = wing(group, axis)
    for (const x of [-1.12, -.56, 0, .56, 1.12]) {
      solid(frame, new THREE.BoxGeometry(.39, .39, .027), '#627772', x, .745, 1.036)
      for (const dx of [-.13, 0, .13]) solid(frame, new THREE.BoxGeometry(.022, .43, .038), '#dae0d0', x + dx, .745, 1.062)
      for (const y of [.553, .937]) solid(frame, new THREE.BoxGeometry(.45, .027, .058), '#cbd1bf', x, y, 1.061)
    }
    for (const y of [.37, 1.069]) solid(frame, new THREE.BoxGeometry(3.12, .036, .034), '#929f91', 0, y, 1.043)
    for (const z of [-.93, .93]) {
      solid(frame, new THREE.BoxGeometry(3.03, .026, .023), '#586e65', 0, 1.533, z)
      for (let i = 0; i < 9; i++) solid(frame, new THREE.BoxGeometry(.018, .19, .018), '#697f71', -1.47 + i * .3675, 1.425, z)
    }
    solid(frame, new THREE.BoxGeometry(.15, .27, .32), '#d8d8bf', -1.37, 1.465)
    solid(frame, new THREE.BoxGeometry(.05, .032, .19), '#88978a', -1.37, 1.616)
  }
  solid(group, new THREE.BoxGeometry(1.25, .34, 1.25), '#c6caba', 0, 1.493)
  solid(group, new THREE.BoxGeometry(.84, .46, .84), '#739796', 0, 1.893)
  for (const x of [-.39, .39]) for (const z of [-.39, .39]) solid(group, new THREE.BoxGeometry(.057, .46, .057), '#dce1cf', x, 1.893, z)
  solid(group, new THREE.BoxGeometry(1.03, .085, 1.03), '#657f72', 0, 2.166)
  solid(group, new THREE.CylinderGeometry(.025, .028, .36, 8), '#9aab98', 0, 2.39)
  const entry = new THREE.Group(); entry.position.set(-1.19, 0, -1.19); entry.rotation.y = -Math.PI * .75; group.add(entry)
  solid(entry, new THREE.BoxGeometry(.39, .77, .035), '#6b7e77', 0, .453, .023)
  for (const x of [-.15, -.075, 0, .075, .15]) solid(entry, new THREE.BoxGeometry(.022, .77, .048), '#d2d9c7', x, .453, .057)
  solid(entry, new THREE.BoxGeometry(.46, .075, .1), '#d9d9c1', 0, .898, .037)
  solid(entry, new THREE.BoxGeometry(.35, .024, .026), '#a6b99c', 0, .518, .081)
  for (const [x, z] of [[-4.36, 1.22], [1.22, -4.36]] as const) planter(group, x, z)
  return group
}

function hospital() {
  const group = foundation('#d7e2d1')
  group.name = '医院 · 旅途医疗中心'
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 1.3, .58), '#f1efe1', 0, .065)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, .1, .43), '#6eaaa1', 0, 1.365)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, .035, .5), '#b5cec1', 0, 1.465)
  for (const axis of ['x', 'z'] as const) {
    const frame = wing(group, axis)
    for (const x of [-1.03, -.51, 0, .51, 1.03]) for (const y of [.48, .98]) {
      solid(frame, new THREE.BoxGeometry(.33, .32, .028), '#88b6bc', x, y, 1.045)
      solid(frame, new THREE.BoxGeometry(.018, .33, .03), '#e3e9df', x, y, 1.066)
    }
  }
  const entrance = new THREE.Group(); entrance.position.set(-1.12, 0, -1.12); entrance.rotation.y = -Math.PI * .75; group.add(entrance)
  solid(entrance, new THREE.BoxGeometry(.63, .74, .08), '#8ab9bb', 0, .435, .02)
  solid(entrance, new THREE.BoxGeometry(.025, .75, .03), '#f4f0dd', 0, .435, .07)
  solid(entrance, new RoundedBoxGeometry(.93, .08, .56, 2, .04), '#5f9e93', 0, .88, .2)
  const sign = new THREE.Group(); sign.position.set(0, 1.57, 0); sign.rotation.y = -Math.PI * .75; group.add(sign)
  solid(sign, new RoundedBoxGeometry(.84, .8, .16, 2, .07), '#fbf6e8', 0, .24)
  solid(sign, new THREE.BoxGeometry(.18, .53, .07), '#398f79', 0, .24, .1)
  solid(sign, new THREE.BoxGeometry(.53, .18, .07), '#398f79', 0, .24, .1)
  const ambulance = car(group, -3.2, .08, -1.35, '#f4f0e2')
  solid(ambulance, new THREE.BoxGeometry(.09, .07, .13), '#80b9c5', 0, .36)
  for (const side of [-1, 1]) {
    solid(ambulance, new THREE.BoxGeometry(.15, .04, .016), '#398f79', -.15, .18, side * .166)
    solid(ambulance, new THREE.BoxGeometry(.04, .12, .016), '#398f79', -.15, .18, side * .166)
  }
  for (const [x, z] of [[-4.32, 1.23], [1.23, -4.32], [1.23, 1.23]] as const) planter(group, x, z)
  return group
}

function policeStation() {
  const group = foundation('#d3ddd2')
  solid(group, cornerFootprint(CORNER_CELL_SIZE, .9, .63, false, .34), '#e3e7de', 0, .065)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, .09, .47, false, .34), '#5c8eaa', 0, .965)
  for (const axis of ['x', 'z'] as const) {
    const frame = wing(group, axis)
    for (const x of [-1.05, -.52, 0, .52, 1.05]) {
      solid(frame, new THREE.BoxGeometry(.37, .32, .025), '#7fabb7', x, .637, .988)
      solid(frame, new THREE.BoxGeometry(.019, .34, .024), '#eceddf', x, .637, 1.009)
    }
    solid(frame, new THREE.BoxGeometry(3.01, .08, .03), '#7ca4b9', 0, .365, .99)
    car(frame, -.72, .07, 1.22, '#e9ece2', true)
    solid(frame, new THREE.BoxGeometry(.065, .41, .075), '#789993', .82, .27, 1.345)
    solid(frame, new THREE.BoxGeometry(.65, .04, .041), '#ece8d2', .585, .475, 1.345)
    for (const x of [.37, .59, .81]) solid(frame, new THREE.BoxGeometry(.085, .043, .045), '#c77667', x, .475, 1.345)
    solid(frame, new THREE.BoxGeometry(.31, .29, .42), '#b5c9c6', 1.14, 1.204)
    solid(frame, new THREE.BoxGeometry(.38, .045, .48), '#7ba0ac', 1.14, 1.372)
  }
  solid(group, new THREE.BoxGeometry(1.24, .51, 1.24), '#bfced0', 0, 1.3)
  solid(group, new THREE.BoxGeometry(1.38, .075, 1.38), '#6293ab', 0, 1.593)
  cornerFaces(group, 1.24, (face) => {
    const shield = new THREE.Shape()
    shield.moveTo(-.18, .19); shield.lineTo(.18, .19); shield.lineTo(.16, -.025)
    shield.quadraticCurveTo(.13, -.15, 0, -.22); shield.quadraticCurveTo(-.13, -.15, -.16, -.025); shield.closePath()
    solid(face, new THREE.ExtrudeGeometry(shield, { depth: .024, bevelEnabled: false }), '#527e9b', 0, 1.304, .014)
    const star = new THREE.Shape()
    for (let i = 0; i < 10; i++) {
      const angle = i / 10 * Math.PI * 2, r = i % 2 ? .045 : .097
      if (i === 0) star.moveTo(Math.sin(angle) * r, Math.cos(angle) * r)
      else star.lineTo(Math.sin(angle) * r, Math.cos(angle) * r)
    }
    star.closePath()
    solid(face, new THREE.ExtrudeGeometry(star, { depth: .012, bevelEnabled: false }), '#e8d49a', 0, 1.314, .043)
  })
  solid(group, new THREE.BoxGeometry(.79, .055, .21), '#657f8a', 0, 1.662)
  solid(group, new RoundedBoxGeometry(.32, .14, .18, 2, .04), '#c57577', -.19, 1.76)
  solid(group, new RoundedBoxGeometry(.32, .14, .18, 2, .04), '#6daac2', .19, 1.76)
  solid(group, new THREE.CylinderGeometry(.018, .025, .57, 8), '#9bafaa', .42, 1.916, .39)
  for (const y of [1.84, 2.04]) solid(group, new THREE.BoxGeometry(.26, .018, .019), '#9bafaa', .42, y, .39)
  const entry = new THREE.Group(); entry.position.set(-1.14, 0, -1.14); entry.rotation.y = -Math.PI * .75; group.add(entry)
  solid(entry, new THREE.BoxGeometry(.4, .65, .027), '#72a0ae', 0, .39, .018)
  solid(entry, new THREE.BoxGeometry(.021, .66, .036), '#dce5dc', 0, .39, .039)
  solid(entry, new THREE.BoxGeometry(.49, .052, .18), '#79a3b3', 0, .769, .082)
  for (const [x, z] of [[-4.32, 1.23], [1.23, -4.32], [1.23, 1.23]] as const) planter(group, x, z)
  return group
}

export function cornerLandmark(kind: CornerKind) {
  switch (kind) {
    case 'go': return departureStation()
    case 'jail': return prisonBlock()
    case 'hospital': return hospital()
    case 'go_to_jail': return policeStation()
  }
}
