import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { solid } from './sceneUtils.js'

export const CORNER_CELL_SIZE = 3.2
type CornerKind = 'go' | 'jail' | 'hospital' | 'go_to_jail'

// The origin is the outer corner cell; the two wings extend along -X and -Z.
export function cornerFootprint(size: number, height: number, inset = 0, rampOpening = false, entryBevel = 0) {
  const min = -size * 1.5 + inset,
    max = size * 0.5 - inset,
    inner = -size * 0.5 + inset
  const shape = new THREE.Shape()
  const notch: [number, number][] =
    entryBevel > 0
      ? [
          [inner - entryBevel, inner],
          [inner, inner - entryBevel],
        ]
      : [[inner, inner]]
  const points: [number, number][] = [[min, inner], ...notch, [inner, min], [max, min], [max, max], [min, max]]
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z)
    else shape.lineTo(x, -z)
  })
  shape.closePath()
  if (rampOpening) {
    const hole = new THREE.Path()
    hole.moveTo(-4.13, -0.37)
    hole.lineTo(-1.37, -0.37)
    hole.lineTo(-1.37, -1.02)
    hole.lineTo(-4.13, -1.02)
    hole.closePath()
    shape.holes.push(hole)
  }
  return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false }).rotateX(-Math.PI / 2)
}

function foundation(color: string) {
  const group = new THREE.Group()
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 0.065, 0.13), color)
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
  solid(parent, new THREE.TorusGeometry(0.23, 0.025, 8, 28), '#ccb474', 0, y, z)
  solid(parent, new THREE.CircleGeometry(0.209, 28), '#f8f0d7', 0, y, z + 0.006)
  for (let hour = 0; hour < 12; hour++) {
    const angle = (hour / 12) * Math.PI * 2
    const tick = solid(
      parent,
      new THREE.BoxGeometry(0.013, 0.029, 0.01),
      '#52736a',
      Math.sin(angle) * 0.181,
      y + Math.cos(angle) * 0.181,
      z + 0.017,
    )
    tick.rotation.z = -angle
  }
  solid(parent, new THREE.BoxGeometry(0.017, 0.132, 0.016), '#41665f', 0, y + 0.056, z + 0.028)
  const hand = solid(parent, new THREE.BoxGeometry(0.105, 0.018, 0.016), '#41665f', 0.04, y - 0.025, z + 0.029)
  hand.rotation.z = -0.45
}

function cornerFaces(group: THREE.Group, width: number, build: (face: THREE.Group) => void) {
  for (const angle of [Math.PI, -Math.PI / 2]) {
    const face = new THREE.Group()
    face.rotation.y = angle
    const surface = new THREE.Group()
    surface.position.z = width / 2
    face.add(surface)
    build(surface)
    group.add(face)
  }
}

function planter(parent: THREE.Object3D, x: number, z: number) {
  solid(parent, new RoundedBoxGeometry(0.32, 0.09, 0.32, 2, 0.04), '#bdc7b0', x, 0.112, z)
  solid(parent, new RoundedBoxGeometry(0.25, 0.21, 0.25, 2, 0.055), '#6e9d7a', x, 0.262, z)
}

function car(parent: THREE.Object3D, x: number, y: number, z: number, color: string, police = false) {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  parent.add(group)
  solid(group, new RoundedBoxGeometry(0.7, 0.135, 0.32, 2, 0.045), color, 0, 0.113)
  solid(group, new RoundedBoxGeometry(0.35, 0.135, 0.277, 2, 0.025), '#8fb9c0', -0.025, 0.233)
  solid(group, new THREE.BoxGeometry(0.31, 0.028, 0.29), color, -0.025, 0.313)
  for (const x of [-0.228, 0.228])
    for (const z of [-0.165, 0.165]) {
      const wheel = solid(group, new THREE.CylinderGeometry(0.071, 0.071, 0.036, 12), '#53645f', x, 0.075, z)
      wheel.rotation.x = Math.PI / 2
    }
  for (const z of [-0.107, 0.107]) solid(group, new THREE.BoxGeometry(0.024, 0.039, 0.061), '#eee8c7', 0.35, 0.151, z)
  if (police) {
    solid(group, new THREE.BoxGeometry(0.18, 0.036, 0.08), '#586f7a', -0.025, 0.345)
    solid(group, new THREE.BoxGeometry(0.08, 0.045, 0.07), '#cb716d', -0.072, 0.378)
    solid(group, new THREE.BoxGeometry(0.08, 0.045, 0.07), '#5a9bc0', 0.022, 0.378)
    for (const side of [-1, 1])
      solid(group, new THREE.BoxGeometry(0.56, 0.045, 0.016), '#5b8499', 0, 0.135, side * 0.163)
  }
  return group
}

function departureStation() {
  const group = foundation('#d9dfcc')
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 1.03, 0.58), '#e7dfc5', 0, 0.065)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 0.075, 0.43), '#588c7e', 0, 1.095)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 0.035, 0.49), '#93b6a0', 0, 1.17)
  for (const axis of ['x', 'z'] as const) {
    const frame = wing(group, axis)
    for (const x of [-1.1, -0.55, 0, 0.55, 1.1]) {
      solid(frame, new THREE.BoxGeometry(0.415, 0.66, 0.026), '#7caeb4', x, 0.547, 1.035)
      solid(frame, new THREE.BoxGeometry(0.027, 0.71, 0.053), '#f2e8c9', x - 0.226, 0.565, 1.052)
      solid(frame, new THREE.BoxGeometry(0.018, 0.67, 0.031), '#dfe6d0', x, 0.547, 1.059)
      solid(frame, new THREE.BoxGeometry(0.44, 0.023, 0.032), '#e3e8d2', x, 0.637, 1.059)
    }
    solid(frame, new THREE.BoxGeometry(2.95, 0.065, 0.37), '#6e9f8b', 0, 0.94, 1.13)
    for (const x of [-1.36, 1.36])
      solid(frame, new THREE.CylinderGeometry(0.024, 0.032, 0.82, 8), '#6c917a', x, 0.482, 1.258)
    const roof = solid(
      frame,
      new THREE.CylinderGeometry(0.38, 0.38, 2.76, 24, 1, false, 0, Math.PI),
      '#90b8b7',
      0,
      1.23,
    )
    roof.rotation.z = Math.PI / 2
    for (const x of [-1.2, -0.6, 0, 0.6, 1.2]) {
      const curve = new THREE.CatmullRomCurve3(
        Array.from({ length: 13 }, (_, i) => {
          const angle = (i / 12) * Math.PI
          return new THREE.Vector3(x, 1.23 + Math.sin(angle) * 0.39, Math.cos(angle) * 0.39)
        }),
      )
      solid(frame, new THREE.TubeGeometry(curve, 16, 0.016, 6, false), '#dce2c7')
    }
    for (const x of [-0.94, 0.94]) {
      solid(frame, new THREE.BoxGeometry(0.37, 0.045, 0.16), '#b0a47f', x, 0.263, 1.348)
      for (const dx of [-0.12, 0.12])
        solid(frame, new THREE.BoxGeometry(0.032, 0.15, 0.1), '#759381', x + dx, 0.167, 1.348)
    }
  }
  solid(group, new THREE.BoxGeometry(1.31, 0.77, 1.31), '#d4c8a7', 0, 1.58)
  solid(group, new THREE.BoxGeometry(1.43, 0.075, 1.43), '#ece0ba', 0, 2.003)
  cornerFaces(group, 1.31, (face) => clockFace(face, 1.61, 0.021))
  solid(group, new THREE.CylinderGeometry(0.14, 1.06, 0.49, 4, 1, false, Math.PI / 4), '#5e8a78', 0, 2.286)
  solid(group, new THREE.ConeGeometry(0.083, 0.22, 8), '#d5b977', 0, 2.641)
  for (const [x, z] of [
    [-4.36, 1.22],
    [1.22, -4.36],
    [1.22, 1.22],
  ] as const)
    planter(group, x, z)
  return group
}

function prisonBlock() {
  const group = foundation('#cbd3c5')
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 1.17, 0.58, false, 0.34), '#b0b5a7', 0, 0.065)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 0.1, 0.43, false, 0.34), '#7f9389', 0, 1.235)
  for (const axis of ['x', 'z'] as const) {
    const frame = wing(group, axis)
    for (const x of [-1.12, -0.56, 0, 0.56, 1.12]) {
      solid(frame, new THREE.BoxGeometry(0.39, 0.39, 0.027), '#627772', x, 0.745, 1.036)
      for (const dx of [-0.13, 0, 0.13])
        solid(frame, new THREE.BoxGeometry(0.022, 0.43, 0.038), '#dae0d0', x + dx, 0.745, 1.062)
      for (const y of [0.553, 0.937]) solid(frame, new THREE.BoxGeometry(0.45, 0.027, 0.058), '#cbd1bf', x, y, 1.061)
    }
    for (const y of [0.37, 1.069]) solid(frame, new THREE.BoxGeometry(3.12, 0.036, 0.034), '#929f91', 0, y, 1.043)
    for (const z of [-0.93, 0.93]) {
      solid(frame, new THREE.BoxGeometry(3.03, 0.026, 0.023), '#586e65', 0, 1.533, z)
      for (let i = 0; i < 9; i++)
        solid(frame, new THREE.BoxGeometry(0.018, 0.19, 0.018), '#697f71', -1.47 + i * 0.3675, 1.425, z)
    }
    solid(frame, new THREE.BoxGeometry(0.15, 0.27, 0.32), '#d8d8bf', -1.37, 1.465)
    solid(frame, new THREE.BoxGeometry(0.05, 0.032, 0.19), '#88978a', -1.37, 1.616)
  }
  solid(group, new THREE.BoxGeometry(1.25, 0.34, 1.25), '#c6caba', 0, 1.493)
  solid(group, new THREE.BoxGeometry(0.84, 0.46, 0.84), '#739796', 0, 1.893)
  for (const x of [-0.39, 0.39])
    for (const z of [-0.39, 0.39]) solid(group, new THREE.BoxGeometry(0.057, 0.46, 0.057), '#dce1cf', x, 1.893, z)
  solid(group, new THREE.BoxGeometry(1.03, 0.085, 1.03), '#657f72', 0, 2.166)
  solid(group, new THREE.CylinderGeometry(0.025, 0.028, 0.36, 8), '#9aab98', 0, 2.39)
  const entry = new THREE.Group()
  entry.position.set(-1.19, 0, -1.19)
  entry.rotation.y = -Math.PI * 0.75
  group.add(entry)
  solid(entry, new THREE.BoxGeometry(0.39, 0.77, 0.035), '#6b7e77', 0, 0.453, 0.023)
  for (const x of [-0.15, -0.075, 0, 0.075, 0.15])
    solid(entry, new THREE.BoxGeometry(0.022, 0.77, 0.048), '#d2d9c7', x, 0.453, 0.057)
  solid(entry, new THREE.BoxGeometry(0.46, 0.075, 0.1), '#d9d9c1', 0, 0.898, 0.037)
  solid(entry, new THREE.BoxGeometry(0.35, 0.024, 0.026), '#a6b99c', 0, 0.518, 0.081)
  for (const [x, z] of [
    [-4.36, 1.22],
    [1.22, -4.36],
  ] as const)
    planter(group, x, z)
  return group
}

function hospital() {
  const group = foundation('#d7e2d1')
  group.name = '医院 · 旅途医疗中心'
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 1.3, 0.58), '#f1efe1', 0, 0.065)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 0.1, 0.43), '#6eaaa1', 0, 1.365)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 0.035, 0.5), '#b5cec1', 0, 1.465)
  for (const axis of ['x', 'z'] as const) {
    const frame = wing(group, axis)
    for (const x of [-1.03, -0.51, 0, 0.51, 1.03])
      for (const y of [0.48, 0.98]) {
        solid(frame, new THREE.BoxGeometry(0.33, 0.32, 0.028), '#88b6bc', x, y, 1.045)
        solid(frame, new THREE.BoxGeometry(0.018, 0.33, 0.03), '#e3e9df', x, y, 1.066)
      }
  }
  const entrance = new THREE.Group()
  entrance.position.set(-1.12, 0, -1.12)
  entrance.rotation.y = -Math.PI * 0.75
  group.add(entrance)
  solid(entrance, new THREE.BoxGeometry(0.63, 0.74, 0.08), '#8ab9bb', 0, 0.435, 0.02)
  solid(entrance, new THREE.BoxGeometry(0.025, 0.75, 0.03), '#f4f0dd', 0, 0.435, 0.07)
  solid(entrance, new RoundedBoxGeometry(0.93, 0.08, 0.56, 2, 0.04), '#5f9e93', 0, 0.88, 0.2)
  const sign = new THREE.Group()
  sign.position.set(0, 1.57, 0)
  sign.rotation.y = -Math.PI * 0.75
  group.add(sign)
  solid(sign, new RoundedBoxGeometry(0.84, 0.8, 0.16, 2, 0.07), '#fbf6e8', 0, 0.24)
  solid(sign, new THREE.BoxGeometry(0.18, 0.53, 0.07), '#398f79', 0, 0.24, 0.1)
  solid(sign, new THREE.BoxGeometry(0.53, 0.18, 0.07), '#398f79', 0, 0.24, 0.1)
  const ambulance = car(group, -3.2, 0.08, -1.35, '#f4f0e2')
  solid(ambulance, new THREE.BoxGeometry(0.09, 0.07, 0.13), '#80b9c5', 0, 0.36)
  for (const side of [-1, 1]) {
    solid(ambulance, new THREE.BoxGeometry(0.15, 0.04, 0.016), '#398f79', -0.15, 0.18, side * 0.166)
    solid(ambulance, new THREE.BoxGeometry(0.04, 0.12, 0.016), '#398f79', -0.15, 0.18, side * 0.166)
  }
  for (const [x, z] of [
    [-4.32, 1.23],
    [1.23, -4.32],
    [1.23, 1.23],
  ] as const)
    planter(group, x, z)
  return group
}

function policeStation() {
  const group = foundation('#d3ddd2')
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 0.9, 0.63, false, 0.34), '#e3e7de', 0, 0.065)
  solid(group, cornerFootprint(CORNER_CELL_SIZE, 0.09, 0.47, false, 0.34), '#5c8eaa', 0, 0.965)
  for (const axis of ['x', 'z'] as const) {
    const frame = wing(group, axis)
    for (const x of [-1.05, -0.52, 0, 0.52, 1.05]) {
      solid(frame, new THREE.BoxGeometry(0.37, 0.32, 0.025), '#7fabb7', x, 0.637, 0.988)
      solid(frame, new THREE.BoxGeometry(0.019, 0.34, 0.024), '#eceddf', x, 0.637, 1.009)
    }
    solid(frame, new THREE.BoxGeometry(3.01, 0.08, 0.03), '#7ca4b9', 0, 0.365, 0.99)
    car(frame, -0.72, 0.07, 1.22, '#e9ece2', true)
    solid(frame, new THREE.BoxGeometry(0.065, 0.41, 0.075), '#789993', 0.82, 0.27, 1.345)
    solid(frame, new THREE.BoxGeometry(0.65, 0.04, 0.041), '#ece8d2', 0.585, 0.475, 1.345)
    for (const x of [0.37, 0.59, 0.81])
      solid(frame, new THREE.BoxGeometry(0.085, 0.043, 0.045), '#c77667', x, 0.475, 1.345)
    solid(frame, new THREE.BoxGeometry(0.31, 0.29, 0.42), '#b5c9c6', 1.14, 1.204)
    solid(frame, new THREE.BoxGeometry(0.38, 0.045, 0.48), '#7ba0ac', 1.14, 1.372)
  }
  solid(group, new THREE.BoxGeometry(1.24, 0.51, 1.24), '#bfced0', 0, 1.3)
  solid(group, new THREE.BoxGeometry(1.38, 0.075, 1.38), '#6293ab', 0, 1.593)
  cornerFaces(group, 1.24, (face) => {
    const shield = new THREE.Shape()
    shield.moveTo(-0.18, 0.19)
    shield.lineTo(0.18, 0.19)
    shield.lineTo(0.16, -0.025)
    shield.quadraticCurveTo(0.13, -0.15, 0, -0.22)
    shield.quadraticCurveTo(-0.13, -0.15, -0.16, -0.025)
    shield.closePath()
    solid(face, new THREE.ExtrudeGeometry(shield, { depth: 0.024, bevelEnabled: false }), '#527e9b', 0, 1.304, 0.014)
    const star = new THREE.Shape()
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2,
        r = i % 2 ? 0.045 : 0.097
      if (i === 0) star.moveTo(Math.sin(angle) * r, Math.cos(angle) * r)
      else star.lineTo(Math.sin(angle) * r, Math.cos(angle) * r)
    }
    star.closePath()
    solid(face, new THREE.ExtrudeGeometry(star, { depth: 0.012, bevelEnabled: false }), '#e8d49a', 0, 1.314, 0.043)
  })
  solid(group, new THREE.BoxGeometry(0.79, 0.055, 0.21), '#657f8a', 0, 1.662)
  solid(group, new RoundedBoxGeometry(0.32, 0.14, 0.18, 2, 0.04), '#c57577', -0.19, 1.76)
  solid(group, new RoundedBoxGeometry(0.32, 0.14, 0.18, 2, 0.04), '#6daac2', 0.19, 1.76)
  solid(group, new THREE.CylinderGeometry(0.018, 0.025, 0.57, 8), '#9bafaa', 0.42, 1.916, 0.39)
  for (const y of [1.84, 2.04]) solid(group, new THREE.BoxGeometry(0.26, 0.018, 0.019), '#9bafaa', 0.42, y, 0.39)
  const entry = new THREE.Group()
  entry.position.set(-1.14, 0, -1.14)
  entry.rotation.y = -Math.PI * 0.75
  group.add(entry)
  solid(entry, new THREE.BoxGeometry(0.4, 0.65, 0.027), '#72a0ae', 0, 0.39, 0.018)
  solid(entry, new THREE.BoxGeometry(0.021, 0.66, 0.036), '#dce5dc', 0, 0.39, 0.039)
  solid(entry, new THREE.BoxGeometry(0.49, 0.052, 0.18), '#79a3b3', 0, 0.769, 0.082)
  for (const [x, z] of [
    [-4.32, 1.23],
    [1.23, -4.32],
    [1.23, 1.23],
  ] as const)
    planter(group, x, z)
  return group
}

export function cornerLandmark(kind: CornerKind) {
  switch (kind) {
    case 'go':
      return departureStation()
    case 'jail':
      return prisonBlock()
    case 'hospital':
      return hospital()
    case 'go_to_jail':
      return policeStation()
  }
}
