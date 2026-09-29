import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { solid } from './sceneUtils.js'

export function singaporeLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#c6d2bc', 0, 0.04)
  solid(group, new THREE.BoxGeometry(2.94, 0.025, 0.77), '#66b6c5', 0, 0.095, 1.04)
  solid(group, new THREE.BoxGeometry(2.94, 0.055, 0.19), '#e4e4d4', 0, 0.11, 0.59)
  solid(group, new RoundedBoxGeometry(2.66, 0.18, 1.18, 2, 0.045), '#e4e8dc', 0, 0.19)
  for (const x of [-0.88, 0, 0.88]) {
    solid(group, new RoundedBoxGeometry(0.55, 1.68, 0.55, 2, 0.045), '#7dabb6', x, 1.12)
    for (const side of [-1, 1]) {
      for (const dx of [-0.24, -0.12, 0, 0.12, 0.24]) {
        solid(group, new THREE.BoxGeometry(0.025, 1.63, 0.02), '#dfe8df', x + dx, 1.12, side * 0.28)
      }
      for (let floor = 0; floor < 9; floor++) {
        solid(group, new THREE.BoxGeometry(0.52, 0.017, 0.022), '#bfd5d4', x, 0.4 + floor * 0.18, side * 0.28)
      }
    }
    solid(group, new THREE.BoxGeometry(0.09, 1.68, 0.58), '#e6e8d9', x - 0.25, 1.12)
    solid(group, new THREE.BoxGeometry(0.09, 1.68, 0.58), '#e6e8d9', x + 0.25, 1.12)
    solid(group, new THREE.BoxGeometry(0.22, 0.24, 0.04), '#558e9d', x, 0.3, 0.6)
  }
  const deckShape = new THREE.Shape()
  deckShape.moveTo(-1.48, -0.15)
  deckShape.quadraticCurveTo(-1.57, 0.04, -1.43, 0.26)
  deckShape.quadraticCurveTo(-0.4, 0.43, 1.2, 0.31)
  deckShape.quadraticCurveTo(1.43, 0.24, 1.53, -0.06)
  deckShape.quadraticCurveTo(0.3, -0.4, -1.28, -0.31)
  deckShape.quadraticCurveTo(-1.44, -0.28, -1.48, -0.15)
  const deck = solid(
    group,
    new THREE.ExtrudeGeometry(deckShape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 2,
    }),
    '#e8e3d0',
    0,
    1.98,
  )
  deck.rotation.x = -Math.PI / 2
  solid(group, new RoundedBoxGeometry(2.45, 0.035, 0.46, 2, 0.03), '#6fa57c', 0, 2.165)
  solid(group, new RoundedBoxGeometry(1.82, 0.025, 0.16, 2, 0.03), '#58bdce', -0.12, 2.19, 0.11)
  for (const x of [-1.12, 1.05]) {
    solid(group, new THREE.CylinderGeometry(0.022, 0.027, 0.17, 6), '#9b9d7a', x, 2.25, -0.04)
    const crown = solid(group, new THREE.IcosahedronGeometry(0.105, 0), '#4f946b', x, 2.36, -0.04)
    crown.scale.y = 0.8
  }
  for (const x of [-1.34, 1.34]) {
    solid(group, new THREE.BoxGeometry(0.24, 0.06, 0.44), '#83ac81', x, 0.12, -0.9)
    solid(group, new THREE.IcosahedronGeometry(0.16, 0), '#619873', x, 0.31, -0.9)
  }
  return group
}

export function tokyoLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#bdcdb0', 0, 0.04)
  solid(group, new THREE.BoxGeometry(2.22, 0.04, 2.22), '#d9ddcb', 0, 0.1)
  solid(group, new THREE.BoxGeometry(0.48, 0.025, 3), '#e8e5d6', 0, 0.13)
  solid(group, new THREE.BoxGeometry(1.16, 0.2, 0.9), '#e7e7db', 0, 0.25)
  for (const x of [-0.4, 0, 0.4]) solid(group, new THREE.BoxGeometry(0.23, 0.12, 0.025), '#8babad', x, 0.25, 0.46)

  // Repeated lattice members share one instanced mesh per color.
  const beams: { start: THREE.Vector3; end: THREE.Vector3; radius: number; white: boolean }[] = []
  const stages = [
    { y: 0.16, radius: 0.78 },
    { y: 0.81, radius: 0.49 },
    { y: 1.38, radius: 0.29 },
    { y: 1.7, radius: 0.22 },
    { y: 2.12, radius: 0.13 },
    { y: 2.39, radius: 0.07 },
  ]
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const
  for (let stage = 0; stage < stages.length - 1; stage++) {
    const lower = stages[stage]!,
      upper = stages[stage + 1]!,
      white = stage === 2 || stage === 4
    for (let side = 0; side < 4; side++) {
      const [x, z] = corners[side]!,
        [nextX, nextZ] = corners[(side + 1) % 4]!
      const a = new THREE.Vector3(x * lower.radius, lower.y, z * lower.radius)
      const b = new THREE.Vector3(x * upper.radius, upper.y, z * upper.radius)
      const c = new THREE.Vector3(nextX * lower.radius, lower.y, nextZ * lower.radius)
      const d = new THREE.Vector3(nextX * upper.radius, upper.y, nextZ * upper.radius)
      beams.push({ start: a, end: b, radius: stage < 2 ? 0.044 : 0.027, white })
      beams.push({ start: a, end: d, radius: 0.021, white }, { start: c, end: b, radius: 0.021, white })
      beams.push({ start: b, end: d, radius: 0.026, white })
    }
  }
  const unitBeam = new THREE.CylinderGeometry(1, 1, 1, 6),
    dummy = new THREE.Object3D(),
    up = new THREE.Vector3(0, 1, 0)
  for (const white of [false, true]) {
    const members = beams.filter((beam) => beam.white === white)
    const mesh = new THREE.InstancedMesh(
      unitBeam,
      new THREE.MeshStandardMaterial({ color: white ? '#f0eddf' : '#d55b4e', roughness: 0.75 }),
      members.length,
    )
    members.forEach((beam, index) => {
      const direction = beam.end.clone().sub(beam.start),
        length = direction.length()
      dummy.position.copy(beam.start).add(beam.end).multiplyScalar(0.5)
      dummy.quaternion.setFromUnitVectors(up, direction.normalize())
      dummy.scale.set(beam.radius, length, beam.radius)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
  }
  for (const [y, width] of [
    [1.44, 0.79],
    [2.13, 0.42],
  ] as const) {
    solid(group, new THREE.BoxGeometry(width, 0.19, width), '#e7e4d9', 0, y)
    solid(group, new THREE.BoxGeometry(width + 0.06, 0.045, width + 0.06), '#d45b4d', 0, y + 0.12)
    for (const side of [-1, 1]) {
      solid(group, new THREE.BoxGeometry(width * 0.8, 0.075, 0.013), '#7a9b9f', 0, y, side * (width / 2 + 0.009))
      solid(group, new THREE.BoxGeometry(0.013, 0.075, width * 0.8), '#7a9b9f', side * (width / 2 + 0.009), y)
    }
  }
  for (let i = 0; i < 4; i++)
    solid(group, new THREE.CylinderGeometry(0.024, 0.04, 0.18, 8), i % 2 ? '#eeeadd' : '#d55b4e', 0, 2.49 + i * 0.18)
  for (const x of [-1.23, 1.23]) {
    solid(group, new THREE.CylinderGeometry(0.04, 0.055, 0.42, 6), '#a3947a', x, 0.3, 0.95)
    for (const offset of [-0.1, 0.1]) {
      const crown = solid(
        group,
        new THREE.IcosahedronGeometry(0.23, 1),
        offset < 0 ? '#dda3b0' : '#efc5cd',
        x + offset,
        0.56,
        0.95,
      )
      crown.scale.y = 0.85
    }
  }
  return group
}

export function seoulLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#bdd0b2', 0, 0.04)
  solid(group, new THREE.CylinderGeometry(0.78, 1.36, 0.36, 12), '#91b285', 0, 0.26)
  solid(group, new THREE.CylinderGeometry(0.73, 0.78, 0.065, 24), '#dde0cc', 0, 0.47)
  solid(group, new THREE.CylinderGeometry(0.3, 0.4, 0.19, 16), '#dfdfd2', 0, 0.59)
  solid(group, new THREE.CylinderGeometry(0.095, 0.16, 1.23, 20), '#e8e9e0', 0, 1.27)
  solid(group, new THREE.CylinderGeometry(0.25, 0.11, 0.17, 20), '#d8ddd6', 0, 1.82)
  solid(group, new THREE.CylinderGeometry(0.37, 0.37, 0.07, 24), '#eeeadc', 0, 1.9)
  solid(group, new THREE.CylinderGeometry(0.33, 0.33, 0.23, 24), '#689baa', 0, 2.05)
  solid(group, new THREE.CylinderGeometry(0.37, 0.37, 0.065, 24), '#eeeadc', 0, 2.2)
  solid(group, new THREE.CylinderGeometry(0.2, 0.35, 0.13, 24), '#d9ded4', 0, 2.3)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2
    solid(
      group,
      new THREE.CylinderGeometry(0.012, 0.012, 0.23, 5),
      '#dbe5dc',
      Math.cos(angle) * 0.335,
      2.05,
      Math.sin(angle) * 0.335,
    )
  }
  solid(group, new THREE.CylinderGeometry(0.025, 0.055, 0.79, 12), '#e5e7df', 0, 2.74)
  for (const y of [2.49, 2.77, 3.02]) solid(group, new THREE.CylinderGeometry(0.062, 0.062, 0.045, 10), '#a86259', 0, y)
  for (let step = 0; step < 6; step++)
    solid(group, new THREE.BoxGeometry(0.64, 0.055, 0.18), '#d7dbcc', 0, 0.12 + step * 0.058, 1.3 - step * 0.145)
  for (const x of [-1.03, 1.03])
    for (const z of [-0.79, 0.79]) {
      solid(group, new THREE.CylinderGeometry(0.028, 0.044, 0.27, 5), '#9b947a', x, 0.24, z)
      solid(group, new THREE.ConeGeometry(0.21, 0.47, 6), z > 0 ? '#61956f' : '#477f68', x, 0.53, z)
    }
  for (const x of [-0.48, 0.48]) {
    solid(group, new THREE.BoxGeometry(0.25, 0.035, 0.08), '#a5a98c', x, 0.56, 0.35)
    for (const dx of [-0.085, 0.085])
      solid(group, new THREE.BoxGeometry(0.025, 0.07, 0.04), '#7d9582', x + dx, 0.51, 0.35)
  }
  return group
}

function operaShell(width: number, depth: number, height: number) {
  const group = new THREE.Group()
  const point = (t: number, u: number) =>
    new THREE.Vector3(
      ((u * width) / 2) * (1 - t) ** 0.65,
      height * t ** 0.8 * (1 - 0.58 * u * u * (1 - t)),
      (0.5 - t) * depth,
    )
  // A tapered curved surface forms a sail, with its tip shared by the final row.
  const positions: number[] = [],
    indices: number[] = [],
    rows = 14,
    columns = 12
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const at = point(row / rows, (column / columns) * 2 - 1)
      positions.push(at.x, at.y, at.z)
      if (row < rows - 1 && column < columns) {
        const index = row * (columns + 1) + column
        indices.push(index, index + 1, index + columns + 1, index + 1, index + columns + 2, index + columns + 1)
      }
    }
  }
  const tip = positions.length / 3
  positions.push(0, height, -depth / 2)
  for (let column = 0; column < columns; column++) {
    const index = (rows - 1) * (columns + 1) + column
    indices.push(index, index + 1, tip)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const roof = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: '#f1efe4', side: THREE.DoubleSide, roughness: 0.78 }),
  )
  roof.castShadow = roof.receiveShadow = true
  group.add(roof)
  for (const u of [-1, 0, 1]) {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 15 }, (_, i) => point(i / 14, u)))
    solid(group, new THREE.TubeGeometry(curve, 20, 0.012, 5, false), '#dad8c9')
  }
  return group
}

export function sydneyLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#70b5c3', 0, 0.04)
  solid(group, new RoundedBoxGeometry(2.78, 0.14, 2.8, 2, 0.08), '#cbbba0', 0, 0.15)
  solid(group, new THREE.BoxGeometry(2.55, 0.055, 2.45), '#e0d6bd', 0, 0.25, -0.08)
  for (const x of [-0.65, 0.65]) {
    solid(group, new THREE.BoxGeometry(1.02, 0.18, 1.85), '#c7c9bd', x, 0.35, -0.16)
    for (let layer = 0; layer < 3; layer++) {
      const height = (x < 0 ? 1.5 : 1.3) - layer * 0.33
      const shell = operaShell(1.08 - layer * 0.07, 1.03 - layer * 0.08, height)
      shell.position.set(x, 0.44, -0.64 + layer * 0.49)
      group.add(shell)
    }
    solid(group, new THREE.BoxGeometry(0.69, 0.19, 0.025), '#63959c', x, 0.43, 0.78)
    for (const dx of [-0.23, 0, 0.23])
      solid(group, new THREE.BoxGeometry(0.018, 0.2, 0.027), '#e3decc', x + dx, 0.43, 0.8)
  }
  const entry = operaShell(0.67, 0.57, 0.49)
  entry.position.set(0, 0.31, 0.88)
  group.add(entry)
  for (let step = 0; step < 4; step++)
    solid(group, new THREE.BoxGeometry(1.7, 0.04, 0.115), '#d9c9ac', 0, 0.12 + step * 0.04, 1.36 - step * 0.09)
  for (const side of [-1, 1]) {
    solid(group, new THREE.BoxGeometry(0.06, 0.035, 2.52), '#eee6cf', side * 1.32, 0.24, -0.08)
    solid(group, new THREE.BoxGeometry(0.42, 0.012, 0.025), '#b0d9dc', side * 1.04, 0.092, 1.5)
  }
  return group
}

export function melbourneLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#cbd2be', 0, 0.04)
  solid(group, new THREE.BoxGeometry(2.98, 0.035, 2.94), '#e0dacb', 0, 0.095)
  solid(group, new THREE.BoxGeometry(2.76, 0.09, 1.27), '#b49772', 0, 0.16)
  solid(group, new THREE.BoxGeometry(2.66, 0.78, 1.08), '#dfb65d', 0, 0.59)
  solid(group, new THREE.BoxGeometry(2.8, 0.075, 1.2), '#f0d699', 0, 0.99)
  solid(group, new RoundedBoxGeometry(2.68, 0.23, 1.06, 3, 0.1), '#558d7e', 0, 1.13)
  for (const x of [-1.22, -0.82, -0.42, 0.42, 0.82, 1.22]) {
    solid(group, new THREE.BoxGeometry(0.055, 0.73, 0.055), '#f3d598', x, 0.61, 0.56)
    solid(group, new THREE.BoxGeometry(0.085, 0.055, 0.08), '#f2dfb3', x, 0.91, 0.575)
  }

  const arch = (width: number, height: number) => {
    const shape = new THREE.Shape(),
      radius = width / 2
    shape.moveTo(-radius, 0)
    shape.lineTo(radius, 0)
    shape.lineTo(radius, height - radius)
    shape.absarc(0, height - radius, radius, 0, Math.PI, false)
    shape.lineTo(-radius, 0)
    return new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false })
  }
  for (const x of [-1.02, -0.62, 0.62, 1.02]) {
    solid(group, arch(0.29, 0.48), '#f5deb0', x, 0.32, 0.551)
    solid(group, arch(0.205, 0.395), '#476c69', x, 0.345, 0.578)
    solid(group, new THREE.BoxGeometry(0.018, 0.3, 0.014), '#d8c999', x, 0.515, 0.61)
    solid(group, new THREE.BoxGeometry(0.21, 0.018, 0.014), '#d8c999', x, 0.6, 0.61)
  }
  solid(group, new THREE.BoxGeometry(0.73, 1.06, 1.12), '#e5bd69', 0, 0.74)
  solid(group, arch(0.52, 0.65), '#f6dfaa', 0, 0.2, 0.57)
  solid(group, arch(0.39, 0.55), '#385d59', 0, 0.21, 0.6)
  solid(group, new THREE.BoxGeometry(0.035, 0.44, 0.02), '#cda65c', 0, 0.43, 0.634)
  for (const x of [-0.29, 0.29]) {
    solid(group, new THREE.BoxGeometry(0.085, 0.77, 0.1), '#efd49a', x, 0.62, 0.615)
    solid(group, new THREE.BoxGeometry(0.12, 0.07, 0.13), '#f2dfb3', x, 1.01, 0.63)
  }
  solid(group, new THREE.BoxGeometry(0.84, 0.09, 1.23), '#eed49d', 0, 1.31)
  solid(group, new THREE.CylinderGeometry(0.36, 0.39, 0.2, 24), '#d9b463', 0, 1.43)
  const profile = [
    [0.38, 0],
    [0.4, 0.055],
    [0.35, 0.14],
    [0.31, 0.26],
    [0.2, 0.38],
    [0.075, 0.44],
    [0.04, 0.47],
  ].map(([radius, height]) => new THREE.Vector2(radius!, height!))
  solid(group, new THREE.LatheGeometry(profile, 24), '#4d8878', 0, 1.53)
  solid(group, new THREE.CylinderGeometry(0.047, 0.065, 0.15, 10), '#e2c47f', 0, 2.06)
  solid(group, new THREE.ConeGeometry(0.085, 0.13, 10), '#447b70', 0, 2.2)
  solid(group, new THREE.ConeGeometry(0.018, 0.14, 6), '#d7b870', 0, 2.33)
  const clockRim = solid(group, new THREE.CylinderGeometry(0.155, 0.155, 0.04, 24), '#b98c42', 0, 1.105, 0.589)
  clockRim.rotation.x = Math.PI / 2
  const clockFace = solid(group, new THREE.CircleGeometry(0.128, 24), '#fff2cf', 0, 1.105, 0.613)
  for (let hour = 0; hour < 12; hour++) {
    const angle = (hour / 12) * Math.PI * 2
    const tick = solid(
      clockFace,
      new THREE.BoxGeometry(0.012, 0.024, 0.007),
      '#675b45',
      Math.sin(angle) * 0.101,
      Math.cos(angle) * 0.101,
      0.005,
    )
    tick.rotation.z = -angle
  }
  solid(clockFace, new THREE.BoxGeometry(0.014, 0.08, 0.012), '#425956', 0, 0.03, 0.013)
  const hand = solid(clockFace, new THREE.BoxGeometry(0.064, 0.014, 0.012), '#425956', 0.024, -0.015, 0.014)
  hand.rotation.z = -0.45

  // Rear platforms stay inside the same square as the station frontage.
  solid(group, new THREE.BoxGeometry(2.7, 0.035, 0.43), '#939e94', 0, 0.135, -0.97)
  for (const z of [-1.06, -0.86]) solid(group, new THREE.BoxGeometry(2.7, 0.014, 0.025), '#657775', 0, 0.16, z)
  for (const x of [-1.08, 0, 1.08]) solid(group, new THREE.BoxGeometry(0.035, 0.52, 0.035), '#638c7a', x, 0.4, -0.96)
  solid(group, new RoundedBoxGeometry(2.78, 0.075, 0.55, 2, 0.025), '#80a69a', 0, 0.68, -0.96)
  for (let step = 0; step < 3; step++)
    solid(group, new THREE.BoxGeometry(0.89, 0.04, 0.16), '#d7c6a8', 0, 0.13 + step * 0.04, 0.98 - step * 0.12)
  for (const x of [-1.13, 1.13]) {
    solid(group, new THREE.BoxGeometry(0.38, 0.07, 0.32), '#a9b795', x, 0.14, 1.14)
    solid(group, new RoundedBoxGeometry(0.33, 0.17, 0.27, 2, 0.04), '#66946e', x, 0.25, 1.14)
  }
  return group
}

export function dubaiLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#d5d8cc', 0, 0.04)
  solid(group, new RoundedBoxGeometry(2.97, 0.035, 2.97, 3, 0.15), '#e6e4d7', 0, 0.097)
  solid(group, new RoundedBoxGeometry(2.67, 0.025, 1.01, 3, 0.16), '#62b9c9', 0, 0.128, 0.89)
  solid(group, new THREE.CylinderGeometry(0.89, 0.97, 0.11, 24), '#c9d4d2', 0, 0.185)
  solid(group, new THREE.CylinderGeometry(0.14, 0.25, 2.55, 12), '#8bb7c9', 0, 1.515, 0, 0.48)

  const bands: { radius: number; x: number; y: number; z: number }[] = []
  // Three radial wings step back at different heights around the central shaft.
  for (let level = 0; level < 9; level++) {
    const bottom = 0.24 + level * 0.285,
      radius = 0.2 - level * 0.014
    const activeWings = level < 6 ? 3 : level < 8 ? 2 : 1
    for (let wing = 0; wing < activeWings; wing++) {
      const angle = (wing * Math.PI * 2) / 3 + Math.PI
      const reach = 0.51 - level * 0.045 - wing * 0.027
      const x = Math.sin(angle) * reach,
        z = Math.cos(angle) * reach
      const body = new THREE.Group()
      body.rotation.y = angle
      group.add(body)
      solid(body, new THREE.BoxGeometry(radius * 1.8, 0.285, reach), '#8db8c8', 0, bottom + 0.1425, reach / 2, 0.42)
      solid(
        body,
        new THREE.CylinderGeometry(radius * 0.94, radius, 0.285, 12),
        wing === 1 ? '#72a5bc' : '#95bdca',
        0,
        bottom + 0.1425,
        reach,
        0.5,
      )
      solid(body, new THREE.BoxGeometry(0.017, 0.28, reach), '#e0e9e7', radius * 0.9, bottom + 0.14, reach / 2, 0.45)
      solid(body, new THREE.BoxGeometry(0.017, 0.28, reach), '#e0e9e7', -radius * 0.9, bottom + 0.14, reach / 2, 0.45)
      for (const dy of [0.075, 0.16, 0.26])
        bands.push({ radius: radius * (1 - (dy / 0.285) * 0.06) + 0.007, x, y: bottom + dy, z })
    }
    bands.push({ radius: 0.25 - ((bottom + 0.25 - 0.24) / 2.55) * 0.11 + 0.008, x: 0, y: bottom + 0.25, z: 0 })
  }
  const trim = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 12),
    new THREE.MeshStandardMaterial({ color: '#dbe8e9', metalness: 0.55, roughness: 0.35 }),
    bands.length,
  )
  const dummy = new THREE.Object3D()
  bands.forEach((band, index) => {
    dummy.position.set(band.x, band.y, band.z)
    dummy.scale.set(band.radius, 0.012, band.radius)
    dummy.updateMatrix()
    trim.setMatrixAt(index, dummy.matrix)
  })
  trim.castShadow = trim.receiveShadow = true
  group.add(trim)
  solid(group, new THREE.CylinderGeometry(0.076, 0.14, 0.29, 12), '#afcbd4', 0, 2.935, 0, 0.55)
  solid(group, new THREE.CylinderGeometry(0.033, 0.075, 0.25, 10), '#d0dfe0', 0, 3.205, 0, 0.6)
  solid(group, new THREE.ConeGeometry(0.032, 0.44, 8), '#e6ece8', 0, 3.55, 0, 0.55)
  solid(group, new THREE.BoxGeometry(0.34, 0.035, 0.56), '#edece0', 0, 0.16, 1.24)
  for (const x of [-0.92, -0.58, 0.58, 0.92]) {
    const ripple = solid(group, new THREE.TorusGeometry(0.105, 0.009, 5, 20), '#b3e2e6', x, 0.148, 0.94)
    ripple.rotation.x = -Math.PI / 2
    solid(group, new THREE.ConeGeometry(0.015, 0.15, 6), '#d4eff0', x, 0.21, 0.94)
  }
  for (const x of [-1.13, 1.13]) {
    solid(group, new RoundedBoxGeometry(0.32, 0.055, 1.14, 2, 0.06), '#87ac91', x, 0.14, -0.39)
    for (const z of [-0.77, -0.06]) {
      solid(group, new THREE.CylinderGeometry(0.025, 0.045, 0.27, 6), '#aa9d7b', x, 0.29, z)
      for (let leaf = 0; leaf < 5; leaf++) {
        const angle = (leaf * Math.PI * 2) / 5
        const frond = solid(
          group,
          new THREE.ConeGeometry(0.065, 0.25, 4),
          '#58977b',
          x + Math.sin(angle) * 0.075,
          0.445,
          z + Math.cos(angle) * 0.075,
        )
        frond.rotation.set(Math.cos(angle) * 0.95, 0, -Math.sin(angle) * 0.95)
      }
    }
  }
  return group
}

export function istanbulLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#bdcdb8', 0, 0.04)
  solid(group, new THREE.BoxGeometry(2.92, 0.04, 2.92), '#deded1', 0, 0.1)
  solid(group, new THREE.BoxGeometry(1.94, 0.1, 1.92), '#c3c7b7', 0, 0.17)
  solid(group, new THREE.BoxGeometry(1.65, 0.74, 1.65), '#e7dfc7', 0, 0.59)
  solid(group, new THREE.BoxGeometry(1.76, 0.075, 1.76), '#f2ead5', 0, 0.98)

  const dome = (radius: number, x: number, y: number, z: number) => {
    solid(group, new THREE.CylinderGeometry(radius, radius, 0.075, 24), '#e1d7bd', x, y, z)
    const roof = solid(
      group,
      new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      '#7fabb5',
      x,
      y + 0.036,
      z,
      0.2,
    )
    roof.scale.y = 0.82
    solid(group, new THREE.CylinderGeometry(0.013, 0.019, 0.09, 6), '#c5ab62', x, y + 0.082 + radius * 0.82, z, 0.3)
    solid(group, new THREE.ConeGeometry(0.026, 0.065, 8), '#d6bd73', x, y + 0.16 + radius * 0.82, z, 0.3)
  }
  for (const x of [-0.57, 0.57]) for (const z of [-0.57, 0.57]) dome(0.235, x, 1.025, z)
  for (const [x, z] of [
    [-0.51, 0],
    [0.51, 0],
    [0, -0.51],
    [0, 0.51],
  ])
    dome(0.37, x!, 1.08, z!)
  solid(group, new THREE.CylinderGeometry(0.52, 0.59, 0.3, 24), '#e8dfc6', 0, 1.205)
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2
    const window = solid(
      group,
      new THREE.BoxGeometry(0.045, 0.12, 0.022),
      '#567e88',
      Math.sin(angle) * 0.549,
      1.27,
      Math.cos(angle) * 0.549,
    )
    window.rotation.y = angle
  }
  dome(0.565, 0, 1.375, 0)

  const windowShape = new THREE.Shape()
  windowShape.moveTo(-0.06, 0)
  windowShape.lineTo(0.06, 0)
  windowShape.lineTo(0.06, 0.14)
  windowShape.quadraticCurveTo(0.05, 0.2, 0, 0.23)
  windowShape.quadraticCurveTo(-0.05, 0.2, -0.06, 0.14)
  windowShape.closePath()
  const windowGeometry = new THREE.ExtrudeGeometry(windowShape, { depth: 0.012, bevelEnabled: false })
  for (let side = 0; side < 4; side++) {
    const facade = new THREE.Group()
    facade.rotation.y = (side * Math.PI) / 2
    group.add(facade)
    for (const x of [-0.59, -0.31, 0.31, 0.59]) {
      solid(facade, windowGeometry, '#557a83', x, 0.49, 0.831)
      solid(facade, new THREE.BoxGeometry(0.17, 0.025, 0.025), '#f6ecd5', x, 0.475, 0.84)
    }
    solid(facade, new THREE.BoxGeometry(1.66, 0.035, 0.035), '#c6bea8', 0, 0.8, 0.84)
  }
  solid(group, new THREE.BoxGeometry(0.37, 0.5, 0.065), '#f4e7cd', 0, 0.49, 0.86)
  const entry = solid(group, windowGeometry, '#3e686f', 0, 0.24, 0.905)
  entry.scale.set(2.05, 1.8, 1)
  solid(group, new THREE.BoxGeometry(0.48, 0.06, 0.3), '#b2c8c9', 0, 0.76, 0.94)
  for (let step = 0; step < 3; step++)
    solid(group, new THREE.BoxGeometry(0.63, 0.035, 0.16), '#e1d9c2', 0, 0.135 + step * 0.035, 1.23 - step * 0.12)

  for (const [x, z] of [
    [-1.17, -0.73],
    [1.17, -0.73],
    [-1.17, 0.73],
    [1.17, 0.73],
    [-0.62, -1.21],
    [0.62, -1.21],
  ]) {
    const tower = new THREE.Group()
    tower.position.set(x!, 0, z!)
    group.add(tower)
    solid(tower, new THREE.BoxGeometry(0.23, 0.24, 0.23), '#d8cfb7', 0, 0.24)
    solid(tower, new THREE.CylinderGeometry(0.056, 0.086, 1.46, 12), '#eee4ce', 0, 1.06)
    for (const y of [0.86, 1.24, 1.64]) {
      solid(tower, new THREE.CylinderGeometry(0.11, 0.07, 0.07, 12), '#c9c6b3', 0, y)
      solid(tower, new THREE.CylinderGeometry(0.112, 0.112, 0.035, 12), '#f2e7cf', 0, y + 0.046)
    }
    solid(tower, new THREE.ConeGeometry(0.088, 0.34, 12), '#648f9c', 0, 1.96, 0, 0.2)
    solid(tower, new THREE.ConeGeometry(0.018, 0.12, 6), '#d6b864', 0, 2.17, 0, 0.3)
  }
  for (const x of [-1.17, 1.17]) {
    solid(group, new THREE.BoxGeometry(0.34, 0.055, 0.31), '#98b396', x, 0.145, 1.24)
    solid(group, new THREE.ConeGeometry(0.105, 0.36, 8), '#5c8e77', x, 0.35, 1.24)
  }
  return group
}

export function athensLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#c7ccb7', 0, 0.04)
  solid(group, new RoundedBoxGeometry(2.97, 0.12, 2.97, 2, 0.14), '#b9b49b', 0, 0.14)
  for (let step = 0; step < 3; step++) {
    solid(
      group,
      new THREE.BoxGeometry(2.55 - step * 0.17, 0.065, 2.8 - step * 0.14),
      step === 2 ? '#eee6d1' : '#d8cfb6',
      0,
      0.23 + step * 0.065,
    )
  }
  solid(group, new THREE.BoxGeometry(0.96, 0.84, 1.52), '#c9c3ac', 0, 0.8)
  solid(group, new THREE.BoxGeometry(0.37, 0.61, 0.025), '#59665d', 0, 0.69, 0.773)
  for (const x of [-0.23, 0.23]) solid(group, new THREE.BoxGeometry(0.08, 0.69, 0.07), '#e8dfc6', x, 0.73, 0.79)
  solid(group, new THREE.BoxGeometry(0.53, 0.08, 0.07), '#e8dfc6', 0, 1.105, 0.79)

  // The colonnade shares its shaft, base and capital geometry across all columns.
  const columns: [number, number][] = []
  for (let i = 0; i < 8; i++) for (const z of [-1.04, 1.04]) columns.push([-0.875 + i * 0.25, z])
  for (let i = 1; i < 10; i++) for (const x of [-0.875, 0.875]) columns.push([x, -1.04 + i * 0.208])
  const dummy = new THREE.Object3D()
  for (const part of [
    { geometry: new THREE.CylinderGeometry(0.064, 0.078, 0.87, 12), y: 0.86, color: '#f1e8d2' },
    { geometry: new THREE.CylinderGeometry(0.088, 0.09, 0.055, 12), y: 0.405, color: '#e3d8bd' },
    { geometry: new THREE.CylinderGeometry(0.097, 0.065, 0.055, 12), y: 1.313, color: '#e1d5b9' },
    { geometry: new THREE.BoxGeometry(0.197, 0.052, 0.197), y: 1.365, color: '#f0e5cb' },
  ]) {
    const mesh = new THREE.InstancedMesh(
      part.geometry,
      new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.85 }),
      columns.length,
    )
    columns.forEach(([x, z], index) => {
      dummy.position.set(x, part.y, z)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
  }
  solid(group, new THREE.BoxGeometry(2.08, 0.14, 2.42), '#d5c9ae', 0, 1.456)
  solid(group, new THREE.BoxGeometry(2.19, 0.06, 2.53), '#eee3cb', 0, 1.556)
  for (const z of [-1.219, 1.219])
    for (let i = 0; i < 15; i++) {
      solid(group, new THREE.BoxGeometry(0.043, 0.085, 0.02), '#a9a58f', -0.91 + i * 0.13, 1.462, z)
    }
  for (const x of [-1.049, 1.049])
    for (let i = 0; i < 17; i++) {
      solid(group, new THREE.BoxGeometry(0.02, 0.085, 0.043), '#a9a58f', x, 1.462, -1.1 + i * 0.1375)
    }

  const pediment = new THREE.Shape()
  pediment.moveTo(-1.065, 0)
  pediment.lineTo(1.065, 0)
  pediment.lineTo(0, 0.41)
  pediment.closePath()
  solid(group, new THREE.ExtrudeGeometry(pediment, { depth: 2.46, bevelEnabled: false }), '#ddd2b8', 0, 1.586, -1.23)
  const inset = new THREE.Shape()
  inset.moveTo(-0.8, 0)
  inset.lineTo(0.8, 0)
  inset.lineTo(0, 0.27)
  inset.closePath()
  const insetGeometry = new THREE.ShapeGeometry(inset)
  for (const side of [-1, 1]) {
    const relief = solid(group, insetGeometry, '#b9ae93', 0, 1.635, side * 1.233)
    if (side < 0) relief.rotation.y = Math.PI
    for (const x of [-0.36, 0, 0.36]) {
      solid(group, new THREE.CylinderGeometry(0.029, 0.047, x === 0 ? 0.15 : 0.08, 6), '#e9dec4', x, 1.69, side * 1.244)
    }
  }
  const slope = Math.atan2(0.41, 1.065),
    slopeWidth = Math.hypot(1.065, 0.41)
  for (const side of [-1, 1]) {
    const roof = solid(group, new THREE.BoxGeometry(slopeWidth + 0.07, 0.04, 2.55), '#c8b899', side * 0.5325, 1.808)
    roof.rotation.z = -side * slope
    for (let row = 0; row < 11; row++) {
      const rib = solid(
        group,
        new THREE.BoxGeometry(slopeWidth + 0.07, 0.018, 0.022),
        '#ddd0b4',
        side * 0.5325,
        1.835,
        -1.16 + row * 0.232,
      )
      rib.rotation.z = -side * slope
    }
  }
  solid(group, new THREE.BoxGeometry(0.07, 0.06, 2.6), '#eee1c5', 0, 2.019)
  for (const x of [-1.34, 1.34]) {
    solid(group, new THREE.CylinderGeometry(0.026, 0.04, 0.21, 6), '#8f9276', x, 0.31, -0.98)
    const leaves = solid(group, new THREE.IcosahedronGeometry(0.17, 1), '#79947a', x, 0.48, -0.98)
    leaves.scale.y = 0.8
  }
  return group
}

export function romeLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#c5cbb6', 0, 0.04)
  solid(group, new RoundedBoxGeometry(3.02, 0.055, 2.78, 2, 0.16), '#dcd5c1', 0, 0.108)
  const amphitheatre = new THREE.Group()
  amphitheatre.scale.z = 0.79
  group.add(amphitheatre)
  solid(amphitheatre, new THREE.CylinderGeometry(1.45, 1.49, 0.09, 56), '#c4b69a', 0, 0.18)
  solid(amphitheatre, new THREE.CylinderGeometry(0.76, 0.76, 0.025, 48), '#cbb892', 0, 0.238)

  for (let step = 0; step < 4; step++) {
    const inside = 0.77 + step * 0.09,
      outside = inside + 0.095
    const shape = new THREE.Shape()
    shape.absarc(0, 0, outside, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, inside, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const seat = solid(
      amphitheatre,
      new THREE.ExtrudeGeometry(shape, { depth: 0.05 + step * 0.055, bevelEnabled: false, curveSegments: 28 }),
      step % 2 ? '#d2c5aa' : '#e0d3b9',
      0,
      0.225,
    )
    seat.rotation.x = -Math.PI / 2
  }
  const radius = 1.29,
    segments = 28,
    angleStep = (Math.PI * 2) / segments,
    width = radius * angleStep
  const openingRadius = width * 0.31,
    leg = 0.155,
    height = 0.355
  const arch = new THREE.Shape()
  arch.moveTo(-width / 2, 0)
  arch.lineTo(-openingRadius, 0)
  arch.lineTo(-openingRadius, leg)
  arch.absarc(0, leg, openingRadius, Math.PI, 0, true)
  arch.lineTo(openingRadius, 0)
  arch.lineTo(width / 2, 0)
  arch.lineTo(width / 2, height)
  arch.lineTo(-width / 2, height)
  arch.closePath()

  // Bend each open arch around the ring so adjacent panels meet without seams.
  const bend = (geometry: THREE.BufferGeometry) => {
    const positions = geometry.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const angle = positions.getX(i) / radius,
        distance = radius + positions.getZ(i)
      positions.setXYZ(i, Math.sin(angle) * distance, positions.getY(i), Math.cos(angle) * distance)
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }
  const archGeometry = bend(
    new THREE.ExtrudeGeometry(arch, { depth: 0.13, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -0.065),
  )
  const ledgeGeometry = bend(new THREE.BoxGeometry(width, 0.04, 0.18, 4).translate(0, height, 0))
  const pilasterGeometry = bend(new THREE.BoxGeometry(0.032, 0.265, 0.035).translate(-width / 2 + 0.016, 0.155, 0.08))
  const bays: { angle: number; y: number }[] = [],
    attic: { angle: number; y: number }[] = []
  for (let i = 0; i < segments; i++) {
    const angle = i * angleStep,
      front = Math.cos(angle)
    const levels = front > 0.55 ? 1 : front > -0.15 ? 2 : 3
    for (let level = 0; level < levels; level++) bays.push({ angle, y: 0.235 + level * height })
    if (levels === 3) attic.push({ angle, y: 0.235 + 3 * height })
  }
  const dummy = new THREE.Object3D()
  for (const part of [
    { geometry: archGeometry, color: '#dac6a4', placements: bays },
    { geometry: ledgeGeometry, color: '#ede0c5', placements: bays },
    { geometry: pilasterGeometry, color: '#efdfc0', placements: bays },
    {
      geometry: bend(new THREE.BoxGeometry(width, 0.21, 0.13, 4).translate(0, 0.105, 0)),
      color: '#cfbd9e',
      placements: attic,
    },
    {
      geometry: bend(new THREE.BoxGeometry(width, 0.035, 0.17, 4).translate(0, 0.224, 0)),
      color: '#e7d7b9',
      placements: attic,
    },
    {
      geometry: bend(new THREE.BoxGeometry(0.045, 0.065, 0.015).translate(0, 0.11, 0.073)),
      color: '#8e8976',
      placements: attic,
    },
  ]) {
    const mesh = new THREE.InstancedMesh(
      part.geometry,
      new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.88 }),
      part.placements.length,
    )
    part.placements.forEach((bay, index) => {
      dummy.position.set(0, bay.y, 0)
      dummy.rotation.y = bay.angle
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true
    amphitheatre.add(mesh)
  }
  for (const x of [-0.34, 0, 0.34]) solid(amphitheatre, new THREE.BoxGeometry(0.045, 0.065, 0.95), '#ab9d7f', x, 0.27)
  for (const z of [-0.3, 0.08, 0.38])
    solid(amphitheatre, new THREE.BoxGeometry(1.03, 0.06, 0.04), '#b9a887', 0, 0.265, z)
  solid(group, new THREE.BoxGeometry(0.58, 0.035, 0.27), '#ebe0c8', 0, 0.15, 1.31)
  for (const x of [-1.26, 1.26])
    for (const z of [-1.16, 1.16]) {
      solid(group, new THREE.CylinderGeometry(0.025, 0.035, 0.21, 6), '#989078', x, 0.245, z)
      solid(group, new THREE.ConeGeometry(0.1, 0.34, 8), '#648975', x, 0.48, z)
    }
  return group
}

export function viennaLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#bfcfb9', 0, 0.04)
  solid(group, new THREE.BoxGeometry(2.98, 0.035, 2.94), '#e4dfcd', 0, 0.098)
  solid(group, new THREE.BoxGeometry(2.84, 0.065, 1.07), '#c6c6b1', 0, 0.15)
  solid(group, new THREE.BoxGeometry(2.68, 0.78, 0.64), '#e4c46d', 0, 0.565)
  solid(group, new THREE.BoxGeometry(2.75, 0.06, 0.71), '#f2e2b6', 0, 0.975)
  const roof = (width: number, depth: number, height: number, x: number, y: number) => {
    const geometry = new THREE.CylinderGeometry(1, 1, height, 4, 1, false, Math.PI / 4)
    const positions = geometry.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const taper = positions.getY(i) > 0 ? 0.66 : 1
      positions.setX(i, ((positions.getX(i) * width) / Math.SQRT2) * taper)
      positions.setZ(i, ((positions.getZ(i) * depth) / Math.SQRT2) * taper)
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    solid(group, geometry, '#617c7b', x, y, 0, 0.16)
  }
  roof(2.78, 0.78, 0.25, 0, 1.125)
  for (const x of [-1.1, 0, 1.1]) {
    const width = x === 0 ? 0.7 : 0.51,
      top = x === 0 ? 1.12 : 1.015
    solid(group, new THREE.BoxGeometry(width, top - 0.19, 0.91), '#ebcd7d', x, (top + 0.19) / 2)
    solid(group, new THREE.BoxGeometry(width + 0.09, 0.065, 0.99), '#f2e4bb', x, top + 0.033)
    roof(width + 0.1, 1, 0.28, x, top + 0.205)
    for (const dx of [-width / 2 + 0.045, width / 2 - 0.045]) {
      solid(group, new THREE.BoxGeometry(0.046, top - 0.25, 0.04), '#faecc7', x + dx, (top + 0.25) / 2, 0.472)
    }
  }
  const windowPositions: THREE.Vector3[] = []
  for (const side of [-1, 1]) {
    for (const x of [-1.2, -1, -0.78, -0.56, -0.16, 0, 0.16, 0.56, 0.78, 1, 1.2]) {
      const pavilion = Math.abs(x) < 0.35 || Math.abs(x) > 0.85
      for (const y of [0.43, 0.77]) {
        if (y === 0.43 && Math.abs(x) < 0.25) continue
        windowPositions.push(new THREE.Vector3(x, y, side * (pavilion ? 0.464 : 0.329)))
      }
    }
    solid(group, new THREE.BoxGeometry(2.67, 0.033, 0.033), '#f0dfaf', 0, 0.61, side * 0.344)
  }
  const dummy = new THREE.Object3D()
  for (const part of [
    { geometry: new THREE.BoxGeometry(0.128, 0.22, 0.018), color: '#f7e9c1', offset: 0 },
    { geometry: new THREE.BoxGeometry(0.083, 0.167, 0.02), color: '#577879', offset: 0.012 },
    { geometry: new THREE.BoxGeometry(0.014, 0.168, 0.024), color: '#d5d9c3', offset: 0.023 },
    { geometry: new THREE.BoxGeometry(0.084, 0.013, 0.024), color: '#d5d9c3', offset: 0.023 },
  ]) {
    const mesh = new THREE.InstancedMesh(
      part.geometry,
      new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.72 }),
      windowPositions.length,
    )
    windowPositions.forEach((position, index) => {
      dummy.position.copy(position)
      dummy.position.z += Math.sign(position.z) * part.offset
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
  }
  for (const x of [-0.18, 0, 0.18]) {
    solid(group, new THREE.BoxGeometry(0.12, 0.26, 0.035), '#486c69', x, 0.335, 0.475)
    solid(group, new THREE.BoxGeometry(0.024, 0.3, 0.06), '#f6e4b3', x - 0.075, 0.35, 0.5)
  }
  solid(group, new THREE.BoxGeometry(0.59, 0.075, 0.2), '#f4e6bf', 0, 0.55, 0.52)
  solid(group, new THREE.BoxGeometry(0.55, 0.06, 0.035), '#e6d9b6', 0, 0.637, 0.606)
  for (const x of [-0.25, -0.15, -0.05, 0.05, 0.15, 0.25])
    solid(group, new THREE.BoxGeometry(0.019, 0.065, 0.025), '#b0aa8c', x, 0.589, 0.606)
  const pediment = new THREE.Shape()
  pediment.moveTo(-0.38, 0)
  pediment.lineTo(0.38, 0)
  pediment.lineTo(0, 0.22)
  pediment.closePath()
  solid(group, new THREE.ExtrudeGeometry(pediment, { depth: 0.075, bevelEnabled: false }), '#f5e6bc', 0, 1.11, 0.48)
  const clock = solid(group, new THREE.CircleGeometry(0.058, 20), '#fff4d3', 0, 1.19, 0.558)
  solid(clock, new THREE.BoxGeometry(0.008, 0.038, 0.007), '#657468', 0, 0.014, 0.006)
  solid(clock, new THREE.BoxGeometry(0.026, 0.008, 0.007), '#657468', 0.01, 0, 0.007)
  for (const x of [-0.72, 0.72]) solid(group, new THREE.BoxGeometry(0.075, 0.19, 0.095), '#c9c5b1', x, 1.27, -0.12)

  for (const side of [-1, 1]) {
    solid(group, new THREE.BoxGeometry(0.38, 0.018, 0.75), '#f4ebd8', 0, 0.129, side * 1.01)
    for (const x of [-0.7, 0.7]) {
      solid(group, new RoundedBoxGeometry(0.79, 0.065, 0.62, 2, 0.06), '#568b6c', x, 0.152, side * 1.03)
      solid(group, new RoundedBoxGeometry(0.63, 0.02, 0.46, 2, 0.055), '#a6c394', x, 0.195, side * 1.03)
      for (const dx of [-0.2, 0, 0.2]) {
        solid(
          group,
          new THREE.BoxGeometry(0.075, 0.035, 0.24),
          side > 0 ? '#d58f9a' : '#c5d0a4',
          x + dx,
          0.218,
          side * 1.03,
        )
      }
    }
  }
  solid(group, new THREE.CylinderGeometry(0.185, 0.2, 0.06, 24), '#c6d6cd', 0, 0.165, 1.15)
  solid(group, new THREE.CylinderGeometry(0.156, 0.156, 0.015, 24), '#79bdca', 0, 0.202, 1.15)
  solid(group, new THREE.CylinderGeometry(0.035, 0.056, 0.12, 10), '#e8e3ce', 0, 0.262, 1.15)
  solid(group, new THREE.CylinderGeometry(0.09, 0.06, 0.035, 16), '#d8dfd0', 0, 0.333, 1.15)
  for (let step = 0; step < 3; step++)
    solid(group, new THREE.BoxGeometry(0.66, 0.027, 0.105), '#e0d7be', 0, 0.13 + step * 0.027, 0.77 - step * 0.079)
  return group
}

export function berlinLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#bdcbb8', 0, 0.04)
  solid(group, new THREE.BoxGeometry(3.02, 0.045, 2.9), '#d9ddcf', 0, 0.105)
  solid(group, new THREE.BoxGeometry(2.94, 0.07, 1.09), '#bbbfae', 0, 0.16)
  for (const x of [-0.55, 0, 0.55]) solid(group, new THREE.BoxGeometry(0.025, 0.008, 2.73), '#bec8ba', x, 0.132)
  const columns: [number, number][] = []
  for (const x of [-0.85, -0.53, -0.21, 0.21, 0.53, 0.85]) for (const z of [-0.29, 0.29]) columns.push([x, z])
  const dummy = new THREE.Object3D()
  for (const part of [
    { geometry: new THREE.CylinderGeometry(0.076, 0.096, 1.04, 12), y: 0.775, color: '#e9e1c9' },
    { geometry: new THREE.CylinderGeometry(0.112, 0.115, 0.055, 12), y: 0.228, color: '#d0c7ad' },
    { geometry: new THREE.CylinderGeometry(0.112, 0.077, 0.055, 12), y: 1.32, color: '#d9ceb3' },
    { geometry: new THREE.BoxGeometry(0.24, 0.055, 0.24), y: 1.375, color: '#eee5ce' },
  ]) {
    const mesh = new THREE.InstancedMesh(
      part.geometry,
      new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.8 }),
      columns.length,
    )
    columns.forEach(([x, z], index) => {
      dummy.position.set(x, part.y, z)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
  }
  solid(group, new THREE.BoxGeometry(2.02, 0.2, 0.95), '#d8cdb2', 0, 1.497)
  solid(group, new THREE.BoxGeometry(2.16, 0.065, 1.05), '#f0e7d0', 0, 1.63)
  solid(group, new THREE.BoxGeometry(1.89, 0.12, 0.84), '#c8c4ad', 0, 1.722)
  solid(group, new THREE.BoxGeometry(1.99, 0.04, 0.94), '#e7dfc8', 0, 1.802)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 15; i++)
      solid(group, new THREE.BoxGeometry(0.042, 0.09, 0.024), '#aaa990', -0.91 + i * 0.13, 1.5, side * 0.487)
    const x = side * 1.245
    solid(group, new THREE.BoxGeometry(0.44, 0.74, 0.81), '#dfd6bd', x, 0.565)
    solid(group, new THREE.BoxGeometry(0.51, 0.055, 0.9), '#f0e6cc', x, 0.963)
    solid(group, new THREE.BoxGeometry(0.47, 0.08, 0.84), '#81928b', x, 1.03)
    solid(group, new THREE.BoxGeometry(0.2, 0.45, 0.028), '#71847c', x, 0.46, 0.418)
    for (const dx of [-0.163, 0.163])
      solid(group, new THREE.BoxGeometry(0.04, 0.59, 0.04), '#f0e4c9', x + dx, 0.61, 0.427)
    solid(group, new THREE.BoxGeometry(0.32, 0.04, 0.07), '#c3baa1', x, 0.744, 0.43)
  }
  solid(group, new THREE.BoxGeometry(0.65, 0.13, 0.57), '#c7c5ae', 0, 1.883)
  solid(group, new THREE.BoxGeometry(0.71, 0.045, 0.62), '#e2dfc8', 0, 1.97)

  // The four horses and chariot remain a compact bronze silhouette above the gate.
  const bronze = '#507e70',
    bronzeLight = '#779d87'
  solid(group, new THREE.BoxGeometry(0.34, 0.11, 0.23), bronze, 0, 2.093, -0.16, 0.35)
  for (const x of [-0.2, 0.2]) {
    const wheel = solid(group, new THREE.TorusGeometry(0.071, 0.014, 6, 16), bronze, x, 2.065, -0.17, 0.35)
    wheel.rotation.y = Math.PI / 2
    solid(group, new THREE.BoxGeometry(0.017, 0.13, 0.015), bronzeLight, x, 2.065, -0.17, 0.3)
    solid(group, new THREE.BoxGeometry(0.017, 0.015, 0.13), bronzeLight, x, 2.065, -0.17, 0.3)
  }
  for (const x of [-0.225, -0.075, 0.075, 0.225]) {
    const body = solid(group, new THREE.IcosahedronGeometry(1, 1), bronze, x, 2.16, 0.115, 0.3)
    body.scale.set(0.056, 0.067, 0.115)
    for (const dx of [-0.032, 0.032])
      for (const z of [0.045, 0.185]) {
        const leg = solid(group, new THREE.CylinderGeometry(0.011, 0.014, 0.13, 5), bronze, x + dx, 2.065, z, 0.3)
        leg.rotation.x = z > 0.1 ? -0.17 : 0.15
      }
    const neck = solid(group, new THREE.CylinderGeometry(0.027, 0.041, 0.15, 7), bronzeLight, x, 2.242, 0.192, 0.3)
    neck.rotation.x = 0.34
    const head = solid(group, new THREE.BoxGeometry(0.049, 0.054, 0.094), bronze, x, 2.322, 0.225, 0.3)
    head.rotation.x = -0.18
    for (const dx of [-0.017, 0.017])
      solid(group, new THREE.ConeGeometry(0.01, 0.035, 4), bronzeLight, x + dx, 2.369, 0.2, 0.3)
    solid(group, new THREE.BoxGeometry(0.013, 0.014, 0.3), bronze, x, 2.12, -0.07, 0.3)
  }
  solid(group, new THREE.ConeGeometry(0.058, 0.21, 8), bronze, 0, 2.244, -0.16, 0.3)
  solid(group, new THREE.SphereGeometry(0.037, 10, 8), bronzeLight, 0, 2.38, -0.16, 0.3)
  const arm = solid(group, new THREE.BoxGeometry(0.15, 0.027, 0.03), bronze, 0.055, 2.325, -0.15, 0.3)
  arm.rotation.z = 0.3
  solid(group, new THREE.CylinderGeometry(0.009, 0.012, 0.41, 6), bronze, 0.13, 2.427, -0.15, 0.3)
  solid(group, new THREE.TorusGeometry(0.049, 0.012, 6, 16), bronzeLight, 0.13, 2.647, -0.15, 0.3)
  solid(group, new THREE.BoxGeometry(0.08, 0.015, 0.02), bronzeLight, 0.13, 2.649, -0.15, 0.3)
  solid(group, new THREE.BoxGeometry(0.015, 0.08, 0.02), bronzeLight, 0.13, 2.649, -0.15, 0.3)
  for (const x of [-1.19, 1.19])
    for (const z of [-1.07, 1.07]) {
      solid(group, new RoundedBoxGeometry(0.35, 0.06, 0.38, 2, 0.04), '#9eb294', x, 0.163, z)
      solid(group, new RoundedBoxGeometry(0.26, 0.18, 0.29, 2, 0.055), '#648f74', x, 0.279, z)
    }
  return group
}

export function amsterdamLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#bdcbb7', 0, 0.04)
  solid(group, new THREE.BoxGeometry(3.02, 0.1, 1.94), '#cecaba', 0, 0.13, -0.51)
  solid(group, new THREE.BoxGeometry(3.02, 0.025, 0.8), '#67afbc', 0, 0.103, 0.93)
  for (const z of [0.493, 1.387]) {
    solid(group, new THREE.BoxGeometry(3.02, 0.095, 0.12), '#b29d86', 0, 0.156, z)
    solid(group, new THREE.BoxGeometry(3.06, 0.027, 0.14), '#e0dac6', 0, 0.217, z)
  }

  const windows: THREE.Vector3[] = []
  const houses = [
    { x: -1.12, height: 1.21, color: '#b76f61', gable: 'step' },
    { x: -0.56, height: 1.43, color: '#657e87', gable: 'bell' },
    { x: 0, height: 1.28, color: '#e1d7bf', gable: 'triangle' },
    { x: 0.56, height: 1.54, color: '#8f5957', gable: 'step' },
    { x: 1.12, height: 1.22, color: '#618a79', gable: 'bell' },
  ]
  for (const house of houses) {
    const top = 0.18 + house.height
    solid(group, new THREE.BoxGeometry(0.49, house.height, 0.79), house.color, house.x, 0.18 + house.height / 2)
    solid(group, new THREE.BoxGeometry(0.505, 0.05, 0.83), '#e9e0c9', house.x, top + 0.015)
    const roofProfile = new THREE.Shape()
    roofProfile.moveTo(-0.252, 0)
    roofProfile.lineTo(0.252, 0)
    roofProfile.lineTo(0, 0.29)
    roofProfile.closePath()
    solid(
      group,
      new THREE.ExtrudeGeometry(roofProfile, { depth: 0.84, bevelEnabled: false }),
      '#526a6d',
      house.x,
      top + 0.04,
      -0.435,
    )
    const gable = new THREE.Shape()
    gable.moveTo(-0.26, 0)
    gable.lineTo(0.26, 0)
    if (house.gable === 'step') {
      gable.lineTo(0.26, 0.075)
      gable.lineTo(0.185, 0.075)
      gable.lineTo(0.185, 0.17)
      gable.lineTo(0.11, 0.17)
      gable.lineTo(0.11, 0.27)
      gable.lineTo(0.047, 0.27)
      gable.lineTo(0.047, 0.36)
      gable.lineTo(-0.047, 0.36)
      gable.lineTo(-0.047, 0.27)
      gable.lineTo(-0.11, 0.27)
      gable.lineTo(-0.11, 0.17)
      gable.lineTo(-0.185, 0.17)
      gable.lineTo(-0.185, 0.075)
      gable.lineTo(-0.26, 0.075)
    } else if (house.gable === 'bell') {
      gable.lineTo(0.26, 0.055)
      gable.bezierCurveTo(0.1, 0.055, 0.16, 0.26, 0.07, 0.3)
      gable.lineTo(0.07, 0.345)
      gable.lineTo(-0.07, 0.345)
      gable.lineTo(-0.07, 0.3)
      gable.bezierCurveTo(-0.16, 0.26, -0.1, 0.055, -0.26, 0.055)
    } else {
      gable.lineTo(0, 0.35)
    }
    gable.closePath()
    const gableGeometry = new THREE.ExtrudeGeometry(gable, { depth: 0.055, bevelEnabled: false, curveSegments: 10 })
    solid(group, gableGeometry, '#efe4cc', house.x, top + 0.015, 0.408)
    const face = solid(group, gableGeometry, house.color, house.x, top + 0.025, 0.424)
    face.scale.set(0.85, 0.85, 0.85)
    solid(group, new THREE.BoxGeometry(0.068, 0.103, 0.019), '#375d67', house.x, top + 0.13, 0.484)
    solid(group, new THREE.BoxGeometry(0.025, 0.035, 0.17), '#566960', house.x, top + 0.3, 0.5)
    solid(group, new THREE.BoxGeometry(0.018, 0.057, 0.022), '#566960', house.x, top + 0.278, 0.579)
    const floors = house.height > 1.35 ? 3 : 2
    for (let floor = 0; floor < floors; floor++)
      for (const dx of [-0.115, 0.115]) {
        windows.push(new THREE.Vector3(house.x + dx, top - 0.22 - floor * 0.31, 0.407))
      }
    solid(group, new THREE.BoxGeometry(0.134, 0.28, 0.033), '#eee1c2', house.x, 0.34, 0.405)
    solid(group, new THREE.BoxGeometry(0.09, 0.233, 0.027), '#385e5c', house.x, 0.327, 0.436)
    solid(group, new THREE.BoxGeometry(0.165, 0.028, 0.1), '#b5b8a4', house.x, 0.207, 0.429)
    for (const dx of [-0.224, 0.224])
      solid(
        group,
        new THREE.BoxGeometry(0.023, house.height, 0.025),
        '#dfd2b7',
        house.x + dx,
        0.18 + house.height / 2,
        0.407,
      )
    solid(group, new THREE.BoxGeometry(0.065, 0.2, 0.08), house.color, house.x + 0.14, top + 0.23, -0.26)
  }
  const dummy = new THREE.Object3D()
  for (const part of [
    { geometry: new THREE.BoxGeometry(0.136, 0.221, 0.02), color: '#f1e8d1', offset: 0 },
    { geometry: new THREE.BoxGeometry(0.098, 0.18, 0.022), color: '#406d7a', offset: 0.013 },
    { geometry: new THREE.BoxGeometry(0.011, 0.18, 0.019), color: '#e5e4ce', offset: 0.029 },
    { geometry: new THREE.BoxGeometry(0.098, 0.012, 0.019), color: '#e5e4ce', offset: 0.029 },
  ]) {
    const mesh = new THREE.InstancedMesh(
      part.geometry,
      new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.65 }),
      windows.length,
    )
    windows.forEach((position, index) => {
      dummy.position.copy(position)
      dummy.position.z += part.offset
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
  }

  const bridgeShape = new THREE.Shape()
  bridgeShape.moveTo(-0.55, 0.22)
  bridgeShape.quadraticCurveTo(0, 0.54, 0.55, 0.22)
  bridgeShape.lineTo(0.55, 0.16)
  bridgeShape.quadraticCurveTo(0, 0.48, -0.55, 0.16)
  bridgeShape.closePath()
  const bridge = solid(
    group,
    new THREE.ExtrudeGeometry(bridgeShape, { depth: 0.48, bevelEnabled: false, curveSegments: 16 }),
    '#d7c8b0',
    -0.24,
    0,
    0.95,
  )
  bridge.rotation.y = Math.PI / 2
  for (const x of [-0.235, 0.235]) {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 12; i++) {
      const t = (i / 12) * 2 - 1,
        y = 0.22 + 0.16 * (1 - t * t)
      points.push(new THREE.Vector3(x, y + 0.145, 0.95 + t * 0.55))
      if (i % 2 === 0)
        solid(group, new THREE.BoxGeometry(0.019, 0.145, 0.019), '#506f68', x, y + 0.0725, 0.95 + t * 0.55)
    }
    solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, 0.015, 6, false), '#506f68')
  }
  const hullShape = new THREE.Shape()
  hullShape.moveTo(-0.32, 0)
  hullShape.quadraticCurveTo(-0.2, -0.12, 0.22, -0.1)
  hullShape.lineTo(0.33, 0)
  hullShape.quadraticCurveTo(0.16, 0.12, -0.22, 0.1)
  hullShape.closePath()
  const boat = new THREE.Group()
  boat.position.set(-0.92, 0.128, 0.93)
  group.add(boat)
  const hull = solid(boat, new THREE.ExtrudeGeometry(hullShape, { depth: 0.07, bevelEnabled: false }), '#9b584d')
  hull.rotation.x = -Math.PI / 2
  solid(boat, new RoundedBoxGeometry(0.35, 0.115, 0.143, 2, 0.025), '#e9e4ce', 0.02, 0.117)
  solid(boat, new THREE.BoxGeometry(0.27, 0.067, 0.15), '#6296a1', 0.02, 0.127)
  solid(boat, new THREE.BoxGeometry(0.36, 0.022, 0.16), '#eae6d5', 0.02, 0.178)
  for (const x of [-0.055, 0.055]) solid(boat, new THREE.BoxGeometry(0.015, 0.08, 0.156), '#f0e9d5', x, 0.13)
  for (const x of [-1.25, 1.25]) {
    solid(group, new THREE.BoxGeometry(0.27, 0.055, 0.29), '#9db397', x, 0.2, -0.98)
    solid(group, new THREE.CylinderGeometry(0.026, 0.035, 0.24, 6), '#9e9679', x, 0.34, -0.98)
    const crown = solid(group, new THREE.IcosahedronGeometry(0.16, 1), '#6c9778', x, 0.55, -0.98)
    crown.scale.y = 1.2
  }
  return group
}

export function barcelonaLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#c0cdb5', 0, 0.04)
  solid(group, new RoundedBoxGeometry(2.91, 0.05, 2.94, 2, 0.08), '#ded9c6', 0, 0.105)
  solid(group, new THREE.BoxGeometry(2.08, 0.095, 2.13), '#c3bba2', 0, 0.178)
  solid(group, new THREE.BoxGeometry(1.23, 0.69, 1.7), '#d9c8a5', 0, 0.57)
  solid(group, new THREE.BoxGeometry(1.87, 0.65, 0.6), '#e5d3af', 0, 0.55)
  const roofProfile = new THREE.Shape()
  roofProfile.moveTo(-0.67, 0)
  roofProfile.lineTo(0.67, 0)
  roofProfile.lineTo(0, 0.36)
  roofProfile.closePath()
  solid(
    group,
    new THREE.ExtrudeGeometry(roofProfile, { depth: 1.77, bevelEnabled: false }),
    '#a9a893',
    0,
    0.914,
    -0.885,
  )

  const portal = new THREE.Shape()
  portal.moveTo(-0.135, 0)
  portal.lineTo(0.135, 0)
  portal.lineTo(0.135, 0.26)
  portal.quadraticCurveTo(0.1, 0.39, 0, 0.48)
  portal.quadraticCurveTo(-0.1, 0.39, -0.135, 0.26)
  portal.closePath()
  const portalGeometry = new THREE.ExtrudeGeometry(portal, { depth: 0.028, bevelEnabled: false, curveSegments: 10 })
  const frontProfile = new THREE.Shape()
  frontProfile.moveTo(-0.64, 0)
  frontProfile.lineTo(0.64, 0)
  frontProfile.lineTo(0.64, 0.49)
  frontProfile.lineTo(0, 1.06)
  frontProfile.lineTo(-0.64, 0.49)
  frontProfile.closePath()
  solid(group, new THREE.ExtrudeGeometry(frontProfile, { depth: 0.09, bevelEnabled: false }), '#e7d7b5', 0, 0.23, 0.849)
  for (const x of [-0.36, 0, 0.36]) {
    const surround = solid(group, portalGeometry, '#c2ae8b', x, 0.235, 0.94)
    surround.scale.set(1.13, x === 0 ? 1.16 : 0.98, 1)
    const door = solid(group, portalGeometry, '#597469', x, 0.247, 0.972)
    door.scale.set(0.77, x === 0 ? 0.98 : 0.8, 1)
  }
  solid(group, new THREE.TorusGeometry(0.15, 0.026, 8, 24), '#c6b48e', 0, 0.936, 0.968)
  solid(group, new THREE.CircleGeometry(0.13, 24), '#699ca6', 0, 0.936, 0.974)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const petal = solid(
      group,
      new THREE.CircleGeometry(0.033, 8),
      i % 2 ? '#d39b72' : '#b3cfb4',
      Math.sin(angle) * 0.081,
      0.936 + Math.cos(angle) * 0.081,
      0.98,
    )
    petal.scale.y = 1.4
    petal.rotation.z = -angle
  }
  solid(group, new THREE.CircleGeometry(0.029, 12), '#e9dcb2', 0, 0.936, 0.987)
  for (const x of [-0.59, -0.2, 0.2, 0.59]) {
    solid(group, new THREE.BoxGeometry(0.04, 0.57, 0.085), '#eadcbd', x, 0.545, 0.962)
    solid(group, new THREE.ConeGeometry(0.051, 0.2, 6), '#d7c29a', x, 0.929, 0.963)
  }

  const slits: { x: number; y: number; z: number; angle: number; height: number }[] = []
  const tower = (x: number, z: number, base: number, height: number, radius: number, crown: string) => {
    const profile = [
      [1.12, 0],
      [1.05, 0.12],
      [0.68, 0.65],
      [0.42, 0.86],
      [0.28, 0.94],
      [0.06, 1],
    ] as const
    const points = profile.map(([r, y]) => new THREE.Vector2(radius * r, height * y))
    solid(group, new THREE.LatheGeometry(points, 16), '#decca7', x, base, z)
    solid(group, new THREE.CylinderGeometry(radius * 1.13, radius * 1.17, 0.055, 16), '#ece0be', x, base + 0.04, z)
    for (const fraction of [0.24, 0.37, 0.5, 0.63, 0.75]) {
      const section = fraction <= 0.65 ? 1 : 2
      const [r0, y0] = profile[section]!,
        [r1, y1] = profile[section + 1]!
      const r = radius * (r0 + ((r1 - r0) * (fraction - y0)) / (y1 - y0))
      for (let slit = 0; slit < 8; slit++) {
        const angle = (slit / 8) * Math.PI * 2
        slits.push({
          x: x + Math.sin(angle) * (r + 0.002),
          y: base + height * fraction,
          z: z + Math.cos(angle) * (r + 0.002),
          angle,
          height: height * 0.072,
        })
      }
    }
    if (crown === 'cross') {
      solid(group, new THREE.CylinderGeometry(0.026, 0.036, 0.24, 8), '#efe6cf', x, base + height + 0.095, z)
      solid(group, new THREE.BoxGeometry(0.19, 0.035, 0.04), '#efe6cf', x, base + height + 0.145, z)
      solid(group, new THREE.BoxGeometry(0.04, 0.035, 0.19), '#efe6cf', x, base + height + 0.145, z)
    } else if (crown === 'star') {
      const star = new THREE.Shape()
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2,
          r = i % 2 ? 0.044 : 0.11
        if (i === 0) star.moveTo(Math.sin(angle) * r, Math.cos(angle) * r)
        else star.lineTo(Math.sin(angle) * r, Math.cos(angle) * r)
      }
      star.closePath()
      solid(
        group,
        new THREE.ExtrudeGeometry(star, { depth: 0.035, bevelEnabled: false }),
        '#d4e8dc',
        x,
        base + height + 0.055,
        z - 0.0175,
      )
    } else {
      solid(group, new THREE.CylinderGeometry(0.023, 0.04, 0.1, 8), '#e8dfbf', x, base + height + 0.035, z)
      solid(group, new THREE.OctahedronGeometry(0.075), crown, x, base + height + 0.13, z)
      solid(group, new THREE.ConeGeometry(0.021, 0.06, 6), '#e8d195', x, base + height + 0.225, z)
    }
  }
  for (const x of [-0.74, -0.25, 0.25, 0.74])
    tower(x, 0.62, 0.51, Math.abs(x) < 0.5 ? 1.82 : 1.54, 0.155, x < 0 ? '#83a895' : '#c59c68')
  for (const x of [-0.72, 0.72]) {
    tower(x, -0.67, 0.51, 1.52, 0.15, '#b28185')
    tower(x, -0.09, 0.75, 1.69, 0.145, '#84a69a')
  }
  tower(0, -0.67, 0.89, 1.7, 0.18, 'star')
  tower(0, 0, 1.035, 2.12, 0.245, 'cross')
  const slitMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.026, 1, 0.018),
    new THREE.MeshStandardMaterial({ color: '#7e8272', roughness: 0.85 }),
    slits.length,
  )
  const dummy = new THREE.Object3D()
  slits.forEach((slit, index) => {
    dummy.position.set(slit.x, slit.y, slit.z)
    dummy.rotation.y = slit.angle
    dummy.scale.set(1, slit.height, 1)
    dummy.updateMatrix()
    slitMesh.setMatrixAt(index, dummy.matrix)
  })
  slitMesh.castShadow = slitMesh.receiveShadow = true
  group.add(slitMesh)
  for (const side of [-1, 1])
    for (const z of [-0.65, -0.3, 0.1]) {
      const glass = solid(group, portalGeometry, z < 0 ? '#749c9b' : '#b88e78', side * 0.624, 0.31, z)
      glass.rotation.y = (side * Math.PI) / 2
      glass.scale.set(0.6, 0.85, 1)
      solid(group, new THREE.BoxGeometry(0.065, 0.58, 0.065), '#eadbb8', side * 0.672, 0.515, z - 0.125)
    }
  for (let step = 0; step < 3; step++)
    solid(group, new THREE.BoxGeometry(1.37, 0.035, 0.15), '#e7dcc1', 0, 0.145 + step * 0.035, 1.29 - step * 0.12)
  for (const x of [-1.24, 1.24])
    for (const z of [-1.15, 0.98]) {
      solid(group, new THREE.CylinderGeometry(0.027, 0.035, 0.22, 6), '#a39c7f', x, 0.25, z)
      const crown = solid(group, new THREE.IcosahedronGeometry(0.17, 1), '#719779', x, 0.45, z)
      crown.scale.y = 1.1
    }
  return group
}

export function parisLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#b5c8ac', 0, 0.04)
  solid(group, new THREE.BoxGeometry(2.98, 0.035, 2.98), '#dfe0ce', 0, 0.098)
  solid(group, new THREE.BoxGeometry(0.55, 0.016, 2.96), '#efe9d6', 0, 0.125)
  solid(group, new THREE.BoxGeometry(2.96, 0.016, 0.55), '#efe9d6', 0, 0.126)
  for (const x of [-0.96, 0.96])
    for (const z of [-0.96, 0.96]) solid(group, new THREE.BoxGeometry(0.37, 0.12, 0.37), '#b6b8a2', x, 0.185, z)

  const beams: { start: THREE.Vector3; end: THREE.Vector3; radius: number; trim: boolean }[] = []
  const member = (start: THREE.Vector3, end: THREE.Vector3, radius: number, trim = false) =>
    beams.push({ start, end, radius, trim })
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const
  const lower = [
    { y: 0.245, radius: 0.96, half: 0.1 },
    { y: 0.52, radius: 0.79, half: 0.085 },
    { y: 0.83, radius: 0.61, half: 0.07 },
    { y: 1.13, radius: 0.49, half: 0.06 },
  ]
  // Each curved foot is an individual truss, leaving the four entrance arches open.
  for (const [cx, cz] of corners)
    for (let stage = 0; stage < lower.length - 1; stage++) {
      const bottom = lower[stage]!,
        top = lower[stage + 1]!
      const point = (level: typeof bottom, corner: readonly [number, number]) =>
        new THREE.Vector3(
          cx * level.radius + corner[0] * level.half,
          level.y,
          cz * level.radius + corner[1] * level.half,
        )
      for (let side = 0; side < 4; side++) {
        const a = point(bottom, corners[side]!),
          b = point(top, corners[side]!)
        const c = point(bottom, corners[(side + 1) % 4]!),
          d = point(top, corners[(side + 1) % 4]!)
        member(a, b, 0.031)
        member(a, d, 0.012, true)
        member(c, b, 0.012, true)
        member(b, d, 0.016)
      }
    }
  const upper = [
    { y: 1.13, radius: 0.49 },
    { y: 1.41, radius: 0.37 },
    { y: 1.69, radius: 0.28 },
    { y: 2.02, radius: 0.21 },
    { y: 2.35, radius: 0.157 },
    { y: 2.66, radius: 0.116 },
    { y: 2.96, radius: 0.083 },
  ]
  for (let stage = 0; stage < upper.length - 1; stage++) {
    const bottom = upper[stage]!,
      top = upper[stage + 1]!
    for (let side = 0; side < 4; side++) {
      const [x, z] = corners[side]!,
        [nx, nz] = corners[(side + 1) % 4]!
      const a = new THREE.Vector3(x * bottom.radius, bottom.y, z * bottom.radius)
      const b = new THREE.Vector3(x * top.radius, top.y, z * top.radius)
      const c = new THREE.Vector3(nx * bottom.radius, bottom.y, nz * bottom.radius)
      const d = new THREE.Vector3(nx * top.radius, top.y, nz * top.radius)
      member(a, b, stage < 2 ? 0.029 : 0.022)
      member(a, d, 0.014, true)
      member(c, b, 0.014, true)
      member(b, d, 0.019)
    }
  }
  const dummy = new THREE.Object3D(),
    up = new THREE.Vector3(0, 1, 0),
    beamGeometry = new THREE.CylinderGeometry(1, 1, 1, 6)
  for (const trim of [false, true]) {
    const members = beams.filter((beam) => beam.trim === trim)
    const mesh = new THREE.InstancedMesh(
      beamGeometry,
      new THREE.MeshStandardMaterial({ color: trim ? '#b6a385' : '#8b806b', roughness: 0.6, metalness: 0.25 }),
      members.length,
    )
    members.forEach((beam, index) => {
      const direction = beam.end.clone().sub(beam.start),
        length = direction.length()
      dummy.position.copy(beam.start).add(beam.end).multiplyScalar(0.5)
      dummy.quaternion.setFromUnitVectors(up, direction.normalize())
      dummy.scale.set(beam.radius, length, beam.radius)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
  }
  for (let side = 0; side < 4; side++) {
    const arch = new THREE.Group()
    arch.rotation.y = (side * Math.PI) / 2
    group.add(arch)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.88, 0.31, 0.92),
      new THREE.Vector3(-0.66, 0.67, 0.74),
      new THREE.Vector3(-0.34, 0.94, 0.56),
      new THREE.Vector3(0, 1.015, 0.53),
      new THREE.Vector3(0.34, 0.94, 0.56),
      new THREE.Vector3(0.66, 0.67, 0.74),
      new THREE.Vector3(0.88, 0.31, 0.92),
    ])
    solid(arch, new THREE.TubeGeometry(curve, 28, 0.035, 7, false), '#9d8d72', 0, 0, 0, 0.25)
  }
  for (const [y, width] of [
    [1.15, 1.29],
    [1.71, 0.84],
  ] as const) {
    solid(group, new THREE.BoxGeometry(width, 0.075, width), '#968a72', 0, y, 0, 0.25)
    solid(group, new THREE.BoxGeometry(width + 0.045, 0.025, width + 0.045), '#c1b093', 0, y + 0.05, 0, 0.2)
    for (const side of [-1, 1]) {
      solid(group, new THREE.BoxGeometry(width, 0.016, 0.018), '#8d8875', 0, y + 0.137, (side * width) / 2)
      solid(group, new THREE.BoxGeometry(0.018, 0.016, width), '#8d8875', (side * width) / 2, y + 0.137)
      for (let i = 0; i <= 6; i++) {
        const offset = -width / 2 + (i * width) / 6
        solid(group, new THREE.BoxGeometry(0.012, 0.08, 0.012), '#a89b7e', offset, y + 0.092, (side * width) / 2)
        solid(group, new THREE.BoxGeometry(0.012, 0.08, 0.012), '#a89b7e', (side * width) / 2, y + 0.092, offset)
      }
    }
  }
  solid(group, new THREE.BoxGeometry(0.285, 0.12, 0.285), '#a69b80', 0, 2.98)
  for (const side of [-1, 1]) {
    solid(group, new THREE.BoxGeometry(0.21, 0.055, 0.012), '#65858a', 0, 2.995, side * 0.15)
    solid(group, new THREE.BoxGeometry(0.012, 0.055, 0.21), '#65858a', side * 0.15, 2.995)
  }
  solid(group, new THREE.CylinderGeometry(0.053, 0.15, 0.14, 4, 1, false, Math.PI / 4), '#9b8d74', 0, 3.115)
  solid(group, new THREE.CylinderGeometry(0.017, 0.034, 0.3, 8), '#b3a183', 0, 3.31)
  solid(group, new THREE.ConeGeometry(0.017, 0.13, 6), '#d0bea0', 0, 3.525)
  for (const x of [-1.23, 1.23])
    for (const z of [-1.18, 1.18]) {
      solid(group, new RoundedBoxGeometry(0.38, 0.05, 0.43, 2, 0.055), '#81a47c', x, 0.145, z)
      solid(group, new THREE.CylinderGeometry(0.027, 0.035, 0.22, 6), '#a59879', x, 0.28, z)
      const tree = solid(group, new THREE.IcosahedronGeometry(0.145, 1), '#639171', x, 0.47, z)
      tree.scale.y = 1.3
    }
  return group
}

export function londonLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#c0cbb7', 0, 0.04)
  solid(group, new THREE.BoxGeometry(2.99, 0.045, 2.93), '#d9d8c6', 0, 0.105)
  solid(group, new THREE.BoxGeometry(2.84, 0.1, 1.2), '#c4bfa6', 0, 0.178)
  solid(group, new THREE.BoxGeometry(0.67, 1.68, 0.67), '#d8c19a', 0, 1.065)
  const archShape = new THREE.Shape()
  archShape.moveTo(-0.065, 0)
  archShape.lineTo(0.065, 0)
  archShape.lineTo(0.065, 0.21)
  archShape.quadraticCurveTo(0.05, 0.285, 0, 0.325)
  archShape.quadraticCurveTo(-0.05, 0.285, -0.065, 0.21)
  archShape.closePath()
  const archGeometry = new THREE.ExtrudeGeometry(archShape, { depth: 0.016, bevelEnabled: false, curveSegments: 8 })
  for (let side = 0; side < 4; side++) {
    const facade = new THREE.Group()
    facade.rotation.y = (side * Math.PI) / 2
    group.add(facade)
    for (const y of [0.51, 0.96, 1.41]) {
      for (const x of [-0.14, 0.14]) {
        solid(facade, archGeometry, '#637a75', x, y, 0.342)
        solid(facade, new THREE.BoxGeometry(0.014, 0.28, 0.023), '#ead9b4', x, y + 0.12, 0.364)
        solid(facade, new THREE.BoxGeometry(0.17, 0.028, 0.038), '#efe0bf', x, y - 0.016, 0.354)
      }
    }
    for (const x of [-0.291, 0, 0.291])
      solid(facade, new THREE.BoxGeometry(0.033, 1.61, 0.038), '#ecdbb7', x, 1.075, 0.351)
  }
  for (const y of [0.43, 0.91, 1.365, 1.83]) solid(group, new THREE.BoxGeometry(0.73, 0.045, 0.73), '#ead9b6', 0, y)
  solid(group, new THREE.BoxGeometry(0.77, 0.55, 0.77), '#d0b58b', 0, 2.125)
  solid(group, new THREE.BoxGeometry(0.83, 0.055, 0.83), '#f0e1c1', 0, 1.88)
  solid(group, new THREE.BoxGeometry(0.84, 0.07, 0.84), '#eee0bf', 0, 2.43)
  for (let side = 0; side < 4; side++) {
    const clock = new THREE.Group()
    clock.rotation.y = (side * Math.PI) / 2
    group.add(clock)
    solid(clock, new THREE.TorusGeometry(0.244, 0.025, 8, 32), '#b1996d', 0, 2.135, 0.402)
    solid(clock, new THREE.CircleGeometry(0.219, 32), '#fbf5dd', 0, 2.135, 0.407)
    solid(clock, new THREE.TorusGeometry(0.169, 0.006, 5, 32), '#c8c7ae', 0, 2.135, 0.419)
    for (let hour = 0; hour < 12; hour++) {
      const angle = (hour / 12) * Math.PI * 2
      const tick = solid(
        clock,
        new THREE.BoxGeometry(0.015, hour % 3 === 0 ? 0.044 : 0.028, 0.009),
        '#536761',
        Math.sin(angle) * 0.194,
        2.135 + Math.cos(angle) * 0.194,
        0.42,
      )
      tick.rotation.z = -angle
    }
    for (const [angle, length, width] of [
      [Math.PI / 3, 0.153, 0.012],
      [-Math.PI / 3, 0.115, 0.018],
    ] as const) {
      const hand = solid(
        clock,
        new THREE.BoxGeometry(width, length, 0.013),
        '#42645f',
        (Math.sin(angle) * length) / 2,
        2.135 + (Math.cos(angle) * length) / 2,
        0.436,
      )
      hand.rotation.z = -angle
    }
    solid(clock, new THREE.CircleGeometry(0.02, 12), '#b49b69', 0, 2.135, 0.447)
  }
  for (const x of [-0.36, 0.36])
    for (const z of [-0.36, 0.36]) {
      solid(group, new THREE.BoxGeometry(0.058, 0.49, 0.058), '#ecdbb7', x, 2.15, z)
      solid(group, new THREE.CylinderGeometry(0.035, 0.049, 0.24, 8), '#dcc49a', x, 2.571, z)
      solid(group, new THREE.ConeGeometry(0.055, 0.19, 8), '#70847b', x, 2.781, z)
    }
  solid(group, new THREE.BoxGeometry(0.53, 0.32, 0.53), '#65766f', 0, 2.625)
  for (let side = 0; side < 4; side++) {
    const belfry = new THREE.Group()
    belfry.rotation.y = (side * Math.PI) / 2
    group.add(belfry)
    for (const x of [-0.18, -0.06, 0.06, 0.18])
      solid(belfry, new THREE.BoxGeometry(0.028, 0.3, 0.025), '#d6c29c', x, 2.63, 0.278)
    for (const y of [2.54, 2.61, 2.68]) solid(belfry, new THREE.BoxGeometry(0.46, 0.018, 0.025), '#9ca68f', 0, y, 0.277)
  }
  solid(group, new THREE.BoxGeometry(0.6, 0.045, 0.6), '#ddcda9', 0, 2.805)
  solid(group, new THREE.CylinderGeometry(0.083, 0.435, 0.43, 4, 1, false, Math.PI / 4), '#60766f', 0, 3.043)
  solid(group, new THREE.BoxGeometry(0.15, 0.055, 0.15), '#d9c394', 0, 3.285)
  solid(group, new THREE.ConeGeometry(0.078, 0.22, 4, 1, false, Math.PI / 4), '#71877a', 0, 3.422)
  solid(group, new THREE.ConeGeometry(0.012, 0.12, 6), '#d1b87e', 0, 3.59)

  const wingRoof = new THREE.Shape()
  wingRoof.moveTo(-0.35, 0)
  wingRoof.lineTo(0.35, 0)
  wingRoof.lineTo(0, 0.23)
  wingRoof.closePath()
  for (const x of [-0.89, 0.89]) {
    solid(group, new THREE.BoxGeometry(0.99, 0.63, 0.65), '#d9c49d', x, 0.544)
    solid(group, new THREE.BoxGeometry(1.03, 0.045, 0.73), '#eedfbc', x, 0.88)
    const roof = solid(
      group,
      new THREE.ExtrudeGeometry(wingRoof, { depth: 1.025, bevelEnabled: false }),
      '#6e8075',
      x - 0.5125,
      0.906,
    )
    roof.rotation.y = Math.PI / 2
    for (const dx of [-0.35, -0.115, 0.115, 0.35]) {
      solid(group, archGeometry, '#62817d', x + dx, 0.367, 0.336)
      solid(group, new THREE.BoxGeometry(0.021, 0.28, 0.018), '#ecdcb7', x + dx, 0.495, 0.362)
    }
    for (const dx of [-0.468, -0.235, 0, 0.235, 0.468]) {
      solid(group, new THREE.BoxGeometry(0.036, 0.6, 0.045), '#eee0bd', x + dx, 0.572, 0.35)
      solid(group, new THREE.ConeGeometry(0.047, 0.18, 5), '#d1bd94', x + dx, 0.989, 0.35)
    }
  }
  solid(group, new THREE.BoxGeometry(2.89, 0.022, 0.39), '#7bb7c0', 0, 0.129, 1.19)
  for (const z of [0.952, 1.431]) solid(group, new THREE.BoxGeometry(2.93, 0.045, 0.075), '#d0ceb8', 0, 0.154, z)
  for (const x of [-1.09, 1.09]) {
    solid(group, new RoundedBoxGeometry(0.53, 0.055, 0.51, 2, 0.055), '#89a68a', x, 0.156, -0.99)
    solid(group, new RoundedBoxGeometry(0.42, 0.13, 0.4, 2, 0.06), '#659273', x, 0.249, -0.99)
  }
  for (let step = 0; step < 3; step++)
    solid(group, new THREE.BoxGeometry(0.7, 0.027, 0.11), '#e7dbbb', 0, 0.145 + step * 0.027, 0.765 - step * 0.085)
  return group
}

export function torontoLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#bccdb7', 0, 0.04)
  solid(group, new RoundedBoxGeometry(2.99, 0.04, 2.99, 2, 0.09), '#dce0d4', 0, 0.1)
  solid(group, new THREE.CylinderGeometry(0.51, 0.59, 0.12, 24), '#b6c6c0', 0, 0.186)
  solid(group, new THREE.CylinderGeometry(0.105, 0.18, 1.83, 16), '#e4e6dd', 0, 1.16)
  const finProfile = new THREE.Shape()
  finProfile.moveTo(0.095, 0)
  finProfile.lineTo(0.39, 0)
  finProfile.lineTo(0.13, 1.83)
  finProfile.lineTo(0.065, 1.83)
  finProfile.closePath()
  const finGeometry = new THREE.ExtrudeGeometry(finProfile, { depth: 0.115, bevelEnabled: false }).translate(
    0,
    0,
    -0.0575,
  )
  for (let fin = 0; fin < 3; fin++) {
    const rib = solid(group, finGeometry, fin === 0 ? '#d1d9d2' : '#e9e9de', 0, 0.246)
    rib.rotation.y = (fin * Math.PI * 2) / 3 - Math.PI / 6
  }
  const elevator = solid(group, new THREE.BoxGeometry(0.034, 1.76, 0.014), '#7babb5', 0, 1.177, 0.146)
  elevator.rotation.x = -0.041
  solid(group, new THREE.CylinderGeometry(0.365, 0.13, 0.21, 24), '#b9c9c8', 0, 2.071)
  solid(group, new THREE.CylinderGeometry(0.43, 0.385, 0.085, 32), '#e3e8df', 0, 2.217)
  solid(group, new THREE.CylinderGeometry(0.42, 0.42, 0.17, 32), '#6899ab', 0, 2.344, 0, 0.22)
  solid(group, new THREE.CylinderGeometry(0.446, 0.446, 0.045, 32), '#e7e8dc', 0, 2.451)
  solid(group, new THREE.CylinderGeometry(0.25, 0.425, 0.11, 32), '#bdcecd', 0, 2.528)
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2
    solid(
      group,
      new THREE.CylinderGeometry(0.009, 0.009, 0.17, 5),
      '#e1e7dc',
      Math.sin(angle) * 0.423,
      2.344,
      Math.cos(angle) * 0.423,
    )
  }
  solid(group, new THREE.CylinderGeometry(0.058, 0.115, 0.4, 16), '#e0e6df', 0, 2.747)
  solid(group, new THREE.CylinderGeometry(0.123, 0.095, 0.065, 20), '#e5e8dd', 0, 2.965)
  solid(group, new THREE.CylinderGeometry(0.117, 0.117, 0.065, 20), '#7696a0', 0, 3.03)
  solid(group, new THREE.CylinderGeometry(0.059, 0.128, 0.07, 20), '#e6e8dd', 0, 3.098)
  for (let band = 0; band < 5; band++) {
    solid(
      group,
      new THREE.CylinderGeometry(0.034 - band * 0.0045, 0.038 - band * 0.0045, 0.087, 10),
      band % 2 === 0 ? '#c87470' : '#eeeadd',
      0,
      3.176 + band * 0.087,
    )
  }
  solid(group, new THREE.ConeGeometry(0.015, 0.13, 8), '#e3e4d7', 0, 3.633)

  const stadium = new THREE.Group()
  stadium.position.set(0.83, 0, -0.83)
  group.add(stadium)
  const stand = solid(stadium, new THREE.CylinderGeometry(0.62, 0.65, 0.2, 32), '#a3b8b8', 0, 0.221)
  stand.scale.z = 0.69
  const rim = solid(stadium, new THREE.CylinderGeometry(0.64, 0.64, 0.035, 32), '#e8eae1', 0, 0.338)
  rim.scale.z = 0.69
  const roof = solid(
    stadium,
    new THREE.SphereGeometry(0.62, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    '#e6e9df',
    0,
    0.355,
  )
  roof.scale.set(1, 0.45, 0.69)
  for (const u of [-0.46, 0, 0.46]) {
    const span = Math.sqrt(1 - u * u),
      points: THREE.Vector3[] = []
    for (let i = 0; i <= 16; i++) {
      const angle = (i / 16) * Math.PI
      points.push(new THREE.Vector3(u * 0.62, 0.36 + Math.sin(angle) * span * 0.279, Math.cos(angle) * span * 0.428))
    }
    solid(stadium, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, 0.009, 5, false), '#becdca')
  }
  for (let i = 0; i < 7; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 6
    const window = solid(
      stadium,
      new THREE.BoxGeometry(0.1, 0.067, 0.024),
      '#527e89',
      Math.sin(angle) * 0.627,
      0.227,
      Math.cos(angle) * 0.434,
    )
    window.rotation.y = Math.atan2(Math.sin(angle) * 0.69, Math.cos(angle))
  }
  solid(group, new THREE.BoxGeometry(0.39, 0.023, 0.83), '#eef0e3', 0, 0.139, 0.989)
  for (const x of [-0.84, 0.84]) {
    solid(group, new RoundedBoxGeometry(0.69, 0.055, 0.42, 2, 0.055), '#89ab8d', x, 0.158, 1.02)
    for (const dx of [-0.22, 0.22]) {
      solid(group, new THREE.CylinderGeometry(0.022, 0.031, 0.19, 6), '#9d987d', x + dx, 0.28, 1.02)
      solid(group, new THREE.IcosahedronGeometry(0.13, 1), '#709679', x + dx, 0.446, 1.02)
    }
  }
  solid(group, new THREE.BoxGeometry(0.27, 0.035, 0.09), '#9dafa5', -1.13, 0.194, -0.32)
  solid(group, new THREE.CylinderGeometry(0.012, 0.017, 0.68, 6), '#acbcb4', -1.13, 0.515, -0.32)
  solid(group, new THREE.BoxGeometry(0.21, 0.135, 0.014), '#f1eee2', -1.025, 0.775, -0.32)
  for (const x of [-1.11, -0.94]) solid(group, new THREE.BoxGeometry(0.038, 0.135, 0.017), '#c26d68', x, 0.775, -0.32)
  const maple = new THREE.Shape()
  maple.moveTo(0, 0.045)
  maple.lineTo(0.012, 0.017)
  maple.lineTo(0.028, 0.027)
  maple.lineTo(0.022, 0.004)
  maple.lineTo(0.041, 0.007)
  maple.lineTo(0.024, -0.018)
  maple.lineTo(0.007, -0.023)
  maple.lineTo(0.004, -0.038)
  maple.lineTo(-0.004, -0.038)
  maple.lineTo(-0.007, -0.023)
  maple.lineTo(-0.024, -0.018)
  maple.lineTo(-0.041, 0.007)
  maple.lineTo(-0.022, 0.004)
  maple.lineTo(-0.028, 0.027)
  maple.lineTo(-0.012, 0.017)
  maple.closePath()
  solid(
    group,
    new THREE.ExtrudeGeometry(maple, { depth: 0.018, bevelEnabled: false }),
    '#c26d68',
    -1.025,
    0.775,
    -0.329,
  )
  return group
}

export function newYorkLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#76b5bf', 0, 0.04)
  const island = new THREE.Shape()
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2,
      radius = i % 2 ? 1.04 : 1.43
    const x = Math.sin(angle) * radius,
      z = Math.cos(angle) * radius
    if (i === 0) island.moveTo(x, z)
    else island.lineTo(x, z)
  }
  island.closePath()
  const fort = solid(group, new THREE.ExtrudeGeometry(island, { depth: 0.11, bevelEnabled: false }), '#c4c9b0', 0, 0.09)
  fort.rotation.x = -Math.PI / 2
  solid(group, new THREE.CylinderGeometry(0.87, 0.99, 0.045, 10), '#91ad8b', 0, 0.223)
  solid(group, new THREE.BoxGeometry(1.13, 0.13, 1.13), '#d4c8ad', 0, 0.308)
  solid(group, new THREE.BoxGeometry(0.93, 0.08, 0.93), '#e7dbc0', 0, 0.413)
  solid(group, new THREE.BoxGeometry(0.71, 0.43, 0.71), '#c5b89b', 0, 0.668)
  solid(group, new THREE.BoxGeometry(0.83, 0.075, 0.83), '#ecdfc0', 0, 0.92)
  solid(group, new THREE.BoxGeometry(0.71, 0.04, 0.71), '#a6ad91', 0, 0.978)
  for (let side = 0; side < 4; side++) {
    const wall = new THREE.Group()
    wall.rotation.y = (side * Math.PI) / 2
    group.add(wall)
    for (const x of [-0.23, 0, 0.23]) {
      solid(wall, new THREE.BoxGeometry(0.102, 0.19, 0.018), '#a1947b', x, 0.699, 0.363)
      solid(wall, new THREE.BoxGeometry(0.14, 0.026, 0.028), '#e1d2b3', x, 0.816, 0.367)
    }
  }
  const bronze = '#6caa94',
    shade = '#518c7d',
    highlight = '#94bca0'
  const robe = [
    [0.315, 0],
    [0.32, 0.055],
    [0.26, 0.31],
    [0.18, 0.55],
    [0.215, 0.7],
    [0.17, 0.84],
  ] as const
  solid(
    group,
    new THREE.LatheGeometry(
      robe.map(([r, y]) => new THREE.Vector2(r, y)),
      16,
    ),
    bronze,
    0,
    1,
  )
  solid(group, new RoundedBoxGeometry(0.4, 0.19, 0.27, 2, 0.055), bronze, 0, 1.792)
  for (let fold = 0; fold < 9; fold++) {
    const angle = (fold / 9) * Math.PI * 2
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.sin(angle) * 0.311, 1.04, Math.cos(angle) * 0.311),
      new THREE.Vector3(Math.sin(angle + 0.12) * 0.245, 1.33, Math.cos(angle + 0.12) * 0.245),
      new THREE.Vector3(Math.sin(angle + 0.22) * 0.181, 1.61, Math.cos(angle + 0.22) * 0.181),
      new THREE.Vector3(Math.sin(angle + 0.25) * 0.174, 1.81, Math.cos(angle + 0.25) * 0.174),
    ])
    solid(group, new THREE.TubeGeometry(curve, 15, 0.012, 5, false), fold % 2 ? highlight : shade)
  }
  solid(group, new THREE.CylinderGeometry(0.052, 0.065, 0.11, 10), bronze, 0, 1.933)
  const head = solid(group, new THREE.IcosahedronGeometry(0.113, 1), bronze, 0, 2.069, 0.017)
  head.scale.set(0.87, 1.17, 0.88)
  solid(group, new THREE.BoxGeometry(0.028, 0.044, 0.035), highlight, 0, 2.057, 0.122)
  const crown = solid(group, new THREE.TorusGeometry(0.101, 0.023, 6, 16), shade, 0, 2.138, 0.012)
  crown.rotation.x = Math.PI / 2
  const up = new THREE.Vector3(0, 1, 0)
  for (let ray = 0; ray < 7; ray++) {
    const angle = ((ray - 3) * Math.PI) / 8,
      direction = new THREE.Vector3(Math.sin(angle), Math.cos(angle), 0)
    const spike = solid(
      group,
      new THREE.ConeGeometry(0.018, 0.15, 5),
      highlight,
      direction.x * 0.155,
      2.125 + direction.y * 0.155,
      0.014,
    )
    spike.quaternion.setFromUnitVectors(up, direction)
  }
  const limb = (start: THREE.Vector3, end: THREE.Vector3, radius: number) => {
    const direction = end.clone().sub(start),
      center = start.clone().add(end).multiplyScalar(0.5)
    const arm = solid(
      group,
      new THREE.CylinderGeometry(radius * 0.78, radius, direction.length(), 9),
      bronze,
      center.x,
      center.y,
      center.z,
    )
    arm.quaternion.setFromUnitVectors(up, direction.normalize())
  }
  limb(new THREE.Vector3(-0.16, 1.8, 0), new THREE.Vector3(-0.36, 2.055, 0.015), 0.072)
  limb(new THREE.Vector3(-0.36, 2.055, 0.015), new THREE.Vector3(-0.475, 2.403, 0.025), 0.048)
  solid(group, new THREE.SphereGeometry(0.053, 10, 8), highlight, -0.475, 2.405, 0.025)
  solid(group, new THREE.CylinderGeometry(0.024, 0.035, 0.16, 10), '#78a68c', -0.475, 2.504, 0.025)
  solid(group, new THREE.CylinderGeometry(0.093, 0.042, 0.077, 12), '#c9aa69', -0.475, 2.618, 0.025, 0.3)
  const flame = solid(group, new THREE.IcosahedronGeometry(0.095, 1), '#e0b35e', -0.475, 2.75, 0.025, 0.25)
  flame.scale.set(0.65, 1.35, 0.65)
  solid(group, new THREE.ConeGeometry(0.035, 0.11, 6), '#f0cf7e', -0.487, 2.884, 0.025)
  limb(new THREE.Vector3(0.18, 1.8, 0), new THREE.Vector3(0.32, 1.612, 0.14), 0.065)
  limb(new THREE.Vector3(0.32, 1.612, 0.14), new THREE.Vector3(0.225, 1.718, 0.255), 0.05)
  const tablet = solid(group, new THREE.BoxGeometry(0.19, 0.285, 0.053), shade, 0.26, 1.655, 0.258)
  tablet.rotation.z = -0.21
  for (const y of [-0.04, 0.015, 0.07]) solid(tablet, new THREE.BoxGeometry(0.115, 0.012, 0.008), '#97b8a0', 0, y, 0.03)
  for (let step = 0; step < 4; step++)
    solid(group, new THREE.BoxGeometry(0.54, 0.037, 0.12), '#dcd1b4', 0, 0.15 + step * 0.037, 1.13 - step * 0.11)
  for (const x of [-1.21, 1.21]) solid(group, new THREE.BoxGeometry(0.24, 0.012, 0.02), '#b5dde0', x, 0.091, 0.91)
  return group
}

export function losAngelesLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#b9cbb0', 0, 0.04)
  solid(group, new RoundedBoxGeometry(2.98, 0.16, 2.9, 2, 0.15), '#a5b894', 0, 0.16)
  solid(group, new THREE.BoxGeometry(2.81, 0.045, 1.69), '#e2dcc6', 0, 0.263)
  solid(group, new THREE.BoxGeometry(2.57, 0.5, 0.86), '#eee2c3', 0, 0.535)
  solid(group, new THREE.BoxGeometry(2.66, 0.055, 0.95), '#d5c9ad', 0, 0.813)
  solid(group, new THREE.BoxGeometry(0.96, 0.74, 1.12), '#f0e5c7', 0, 0.656)
  solid(group, new THREE.BoxGeometry(1.06, 0.075, 1.22), '#ddd1b3', 0, 1.063)
  const dome = (x: number, y: number, radius: number) => {
    solid(group, new THREE.CylinderGeometry(radius, radius, 0.13, 24), '#bbc5b3', x, y)
    solid(group, new THREE.CylinderGeometry(radius * 1.07, radius * 1.07, 0.037, 24), '#e6ddc3', x, y - 0.072)
    const roof = solid(
      group,
      new THREE.SphereGeometry(radius, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      '#769d91',
      x,
      y + 0.065,
      0,
      0.25,
    )
    roof.scale.y = 0.84
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 20; i++) {
      const angle = (i / 20) * Math.PI
      points.push(new THREE.Vector3(x, y + 0.07 + Math.sin(angle) * radius * 0.84, Math.cos(angle) * radius))
    }
    solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.016, 6, false), '#4f786f')
  }
  dome(0, 1.17, 0.455)
  for (const x of [-1.035, 1.035]) dome(x, 0.948, 0.29)
  for (const x of [-0.24, 0, 0.24]) {
    solid(group, new THREE.BoxGeometry(0.143, 0.41, 0.026), '#627f78', x, 0.492, 0.573)
    solid(group, new THREE.BoxGeometry(0.035, 0.51, 0.055), '#d4c6a6', x - 0.09, 0.553, 0.59)
  }
  solid(group, new THREE.BoxGeometry(0.78, 0.065, 0.22), '#f3e8ce', 0, 0.852, 0.608)
  for (const x of [-1.15, -0.91, -0.65, 0.65, 0.91, 1.15]) {
    solid(group, new THREE.BoxGeometry(0.12, 0.22, 0.025), '#6a928c', x, 0.553, 0.444)
    solid(group, new THREE.BoxGeometry(0.158, 0.023, 0.038), '#f7edd3', x, 0.68, 0.449)
  }
  for (const x of [-0.39, 0.39]) {
    solid(group, new THREE.BoxGeometry(0.047, 0.65, 0.045), '#d2c4a4', x, 0.713, 0.58)
    solid(group, new THREE.BoxGeometry(0.07, 0.047, 0.072), '#e7dab9', x, 1.02, 0.588)
  }
  for (let step = 0; step < 3; step++)
    solid(group, new THREE.BoxGeometry(1.06, 0.03, 0.14), '#daceb0', 0, 0.249 + step * 0.03, 0.907 - step * 0.1)
  solid(group, new THREE.BoxGeometry(0.32, 0.028, 0.51), '#ede6d0', 0, 0.255, 1.181)
  solid(group, new THREE.CylinderGeometry(0.14, 0.2, 0.07, 8), '#dad8bd', 0, 0.295, 1.166)
  solid(group, new THREE.CylinderGeometry(0.043, 0.075, 0.37, 6), '#ece5cd', 0, 0.513, 1.166)
  solid(group, new THREE.ConeGeometry(0.047, 0.12, 6), '#ced2b8', 0, 0.758, 1.166)
  for (const x of [-1.27, 1.27])
    for (const z of [-1.12, 1.11]) {
      solid(group, new THREE.CylinderGeometry(0.022, 0.034, 0.46, 7), '#a79673', x, 0.473, z)
      for (let leaf = 0; leaf < 6; leaf++) {
        const angle = (leaf / 6) * Math.PI * 2
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(x, 0.715, z),
          new THREE.Vector3(x + Math.sin(angle) * 0.12, 0.771, z + Math.cos(angle) * 0.12),
          new THREE.Vector3(x + Math.sin(angle) * 0.22, 0.673, z + Math.cos(angle) * 0.22),
        ])
        solid(group, new THREE.TubeGeometry(curve, 8, 0.022, 5, false), leaf % 2 ? '#72996c' : '#538b70')
      }
    }
  return group
}

export function sanFranciscoLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#76b9c5', 0, 0.04)
  const red = '#c86452',
    trim = '#e28a6a'
  for (const x of [-1.32, 1.32]) {
    const shore = solid(group, new THREE.CylinderGeometry(0.4, 0.46, 0.16, 8), '#9cb093', x, 0.154)
    shore.scale.z = 1.6
    solid(group, new THREE.BoxGeometry(0.27, 0.37, 0.58), '#b9c2b5', x, 0.397)
  }
  solid(group, new THREE.BoxGeometry(3.02, 0.087, 0.58), red, 0, 0.591)
  solid(group, new THREE.BoxGeometry(3.015, 0.024, 0.46), '#77888a', 0, 0.647)
  for (let i = 0; i < 13; i++)
    solid(group, new THREE.BoxGeometry(0.1, 0.008, 0.013), '#ece5c9', -1.38 + i * 0.23, 0.664)
  for (const z of [-0.291, 0.291]) solid(group, new THREE.BoxGeometry(3.02, 0.032, 0.027), trim, 0, 0.705, z)
  for (const x of [-0.73, 0.73]) {
    solid(group, new THREE.BoxGeometry(0.31, 0.145, 0.91), '#c0ccc1', x, 0.168)
    for (const z of [-0.32, 0.32]) {
      solid(group, new THREE.BoxGeometry(0.105, 1.71, 0.115), red, x, 1.091, z)
      solid(group, new THREE.BoxGeometry(0.035, 1.65, 0.025), trim, x, 1.109, z + Math.sign(z) * 0.069)
      solid(group, new THREE.BoxGeometry(0.135, 0.052, 0.143), trim, x, 1.973, z)
    }
    for (const y of [0.8, 1.15, 1.52, 1.858]) solid(group, new THREE.BoxGeometry(0.105, 0.094, 0.68), red, x, y)
    for (const y of [1.185, 1.555]) {
      const brace = solid(group, new THREE.BoxGeometry(0.09, 0.06, 0.67), trim, x, y + 0.11)
      brace.rotation.x = 0.3
    }
  }
  const cableHeight = (x: number) =>
    Math.abs(x) <= 0.73
      ? 0.95 + 1.02 * (x / 0.73) ** 2
      : 0.715 + 1.255 * Math.max(0, (1.51 - Math.abs(x)) / 0.78) ** 1.2
  const hangers: THREE.Matrix4[] = [],
    dummy = new THREE.Object3D()
  for (const z of [-0.32, 0.32]) {
    for (const [start, end] of [
      [-1.51, -0.73],
      [-0.73, 0.73],
      [0.73, 1.51],
    ] as const) {
      const points = Array.from({ length: 25 }, (_, i) => {
        const x = start + ((end - start) * i) / 24
        return new THREE.Vector3(x, cableHeight(x), z)
      })
      solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.024, 7, false), red)
    }
    for (let i = 0; i <= 24; i++) {
      const x = -1.44 + i * 0.12,
        top = cableHeight(x),
        length = top - 0.705
      dummy.position.set(x, 0.705 + length / 2, z)
      dummy.scale.set(0.009, length, 0.009)
      dummy.updateMatrix()
      hangers.push(dummy.matrix.clone())
    }
  }
  const mesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 5),
    new THREE.MeshStandardMaterial({ color: trim, roughness: 0.68 }),
    hangers.length,
  )
  hangers.forEach((matrix, index) => mesh.setMatrixAt(index, matrix))
  mesh.castShadow = mesh.receiveShadow = true
  group.add(mesh)
  for (const [x, z, color] of [
    [-0.39, 0.12, '#ece8d4'],
    [0.27, -0.12, '#76aeb4'],
    [1.08, 0.12, '#e1b75e'],
  ] as const) {
    solid(group, new RoundedBoxGeometry(0.16, 0.055, 0.079, 2, 0.018), color, x, 0.697, z)
    solid(group, new THREE.BoxGeometry(0.085, 0.035, 0.063), '#a7c7c6', x, 0.74, z)
  }
  const boat = new THREE.Group()
  boat.position.set(0.23, 0.11, 1.04)
  boat.rotation.y = -0.3
  group.add(boat)
  solid(boat, new RoundedBoxGeometry(0.64, 0.085, 0.19, 2, 0.055), '#edf0df', 0, 0.045)
  solid(boat, new THREE.BoxGeometry(0.3, 0.08, 0.143), '#87aeb8', -0.04, 0.128)
  solid(boat, new THREE.BoxGeometry(0.33, 0.028, 0.16), '#f4edde', -0.04, 0.182)
  solid(boat, new THREE.CylinderGeometry(0.012, 0.017, 0.17, 6), '#bcc8ba', -0.07, 0.279)
  for (const z of [-1.07, 1.07]) solid(group, new THREE.BoxGeometry(0.33, 0.012, 0.027), '#afdadb', -0.81, 0.091, z)
  return group
}

export function shanghaiLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#bdcdb9', 0, 0.04)
  solid(group, new RoundedBoxGeometry(2.97, 0.04, 2.93, 2, 0.08), '#d9e1d6', 0, 0.1)
  solid(group, new THREE.CylinderGeometry(0.73, 0.8, 0.09, 24), '#bfd0c9', 0, 0.165)
  solid(group, new THREE.CylinderGeometry(0.33, 0.48, 0.14, 16), '#e4e7da', 0, 0.273)
  const up = new THREE.Vector3(0, 1, 0)
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * Math.PI * 2 + Math.PI / 3
    const bottom = new THREE.Vector3(Math.sin(angle) * 0.61, 0.22, Math.cos(angle) * 0.61)
    const top = new THREE.Vector3(Math.sin(angle) * 0.185, 1.01, Math.cos(angle) * 0.185)
    const direction = top.clone().sub(bottom),
      center = bottom.clone().add(top).multiplyScalar(0.5)
    const support = solid(
      group,
      new THREE.CylinderGeometry(0.075, 0.105, direction.length(), 12),
      '#dce1d7',
      center.x,
      center.y,
      center.z,
    )
    support.quaternion.setFromUnitVectors(up, direction.normalize())
    solid(
      group,
      new THREE.CylinderGeometry(0.073, 0.085, 1.15, 12),
      '#e5e5d8',
      Math.sin(angle) * 0.112,
      1.829,
      Math.cos(angle) * 0.112,
    )
  }
  const pearl = (radius: number, y: number) => {
    solid(group, new THREE.SphereGeometry(radius, 32, 20), '#b87e91', 0, y, 0, 0.25)
    for (const latitude of [-0.58, -0.27, 0.08, 0.42, 0.7]) {
      const ring = solid(
        group,
        new THREE.TorusGeometry(radius * Math.sqrt(1 - latitude * latitude) + 0.004, 0.013, 6, 32),
        '#ddd6d0',
        0,
        y + radius * latitude,
      )
      ring.rotation.x = Math.PI / 2
    }
    for (let meridian = 0; meridian < 8; meridian++) {
      const angle = (meridian / 8) * Math.PI * 2,
        points: THREE.Vector3[] = []
      for (let i = 0; i <= 16; i++) {
        const t = 0.15 + (i / 16) * (Math.PI - 0.3),
          r = (radius + 0.006) * Math.sin(t)
        points.push(new THREE.Vector3(Math.sin(angle) * r, y + (radius + 0.006) * Math.cos(t), Math.cos(angle) * r))
      }
      solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 18, 0.008, 5, false), '#dec6cc')
    }
    solid(group, new THREE.CylinderGeometry(radius * 1.026, radius * 1.026, 0.047, 32), '#73959e', 0, y)
  }
  pearl(0.435, 1.099)
  solid(group, new THREE.CylinderGeometry(0.19, 0.16, 0.055, 20), '#acb9b5', 0, 1.65)
  solid(group, new THREE.CylinderGeometry(0.18, 0.15, 0.055, 20), '#acb9b5', 0, 2.027)
  pearl(0.281, 2.501)
  solid(group, new THREE.CylinderGeometry(0.061, 0.083, 0.27, 12), '#e5e3d7', 0, 2.88)
  pearl(0.105, 3.053)
  solid(group, new THREE.CylinderGeometry(0.021, 0.043, 0.29, 10), '#c6c7bb', 0, 3.286)
  solid(group, new THREE.ConeGeometry(0.019, 0.17, 8), '#d8d8c9', 0, 3.516)
  solid(group, new THREE.BoxGeometry(2.83, 0.023, 0.38), '#76bac5', 0, 0.133, 1.22)
  for (const z of [0.985, 1.453]) solid(group, new THREE.BoxGeometry(2.91, 0.045, 0.065), '#e6e5d4', 0, 0.158, z)
  for (const x of [-1.08, 1.08]) {
    solid(group, new RoundedBoxGeometry(0.52, 0.075, 0.84, 2, 0.045), '#96b79e', x, 0.168, -0.61)
    for (const z of [-0.88, -0.33]) {
      solid(group, new THREE.CylinderGeometry(0.025, 0.036, 0.2, 6), '#9f987b', x, 0.304, z)
      solid(group, new THREE.IcosahedronGeometry(0.145, 1), '#6c977b', x, 0.493, z)
    }
  }
  solid(group, new THREE.BoxGeometry(0.45, 0.026, 0.55), '#ecebda', 0, 0.148, 0.757)
  return group
}

export function beijingLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#bdcdb5', 0, 0.04)
  const posts: THREE.Matrix4[] = [],
    dummy = new THREE.Object3D()
  for (let tier = 0; tier < 3; tier++) {
    const radius = 1.43 - tier * 0.15,
      y = 0.145 + tier * 0.1
    solid(group, new THREE.CylinderGeometry(radius, radius + 0.02, 0.09, 48), '#e2e5d8', 0, y)
    solid(group, new THREE.CylinderGeometry(radius + 0.025, radius + 0.025, 0.024, 48), '#f2f0df', 0, y + 0.056)
    const railRadius = radius - 0.055,
      railY = y + 0.157
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 48; i++) {
      const angle = 0.31 + (i / 48) * (Math.PI * 2 - 0.62)
      points.push(new THREE.Vector3(Math.sin(angle) * railRadius, railY, Math.cos(angle) * railRadius))
      if (i % 2 === 0) {
        dummy.position.set(Math.sin(angle) * railRadius, railY - 0.043, Math.cos(angle) * railRadius)
        dummy.updateMatrix()
        posts.push(dummy.matrix.clone())
      }
    }
    solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.018, 6, false), '#eff0e1')
  }
  const postMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.035, 0.115, 0.035),
    new THREE.MeshStandardMaterial({ color: '#f2f0df', roughness: 0.8 }),
    posts.length,
  )
  posts.forEach((matrix, index) => postMesh.setMatrixAt(index, matrix))
  postMesh.castShadow = postMesh.receiveShadow = true
  group.add(postMesh)
  solid(group, new THREE.CylinderGeometry(0.57, 0.57, 0.57, 32), '#a55149', 0, 0.705)
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2
    solid(
      group,
      new THREE.CylinderGeometry(0.022, 0.025, 0.55, 8),
      '#c87558',
      Math.sin(angle) * 0.576,
      0.712,
      Math.cos(angle) * 0.576,
    )
    const panel = solid(
      group,
      new THREE.BoxGeometry(0.14, 0.25, 0.021),
      '#4c746c',
      Math.sin(angle + Math.PI / 16) * 0.574,
      0.682,
      Math.cos(angle + Math.PI / 16) * 0.574,
    )
    panel.rotation.y = angle + Math.PI / 16
  }
  for (const [radius, y] of [
    [0.583, 0.927],
    [0.443, 1.395],
    [0.315, 1.842],
  ] as const) {
    solid(group, new THREE.CylinderGeometry(radius, radius, 0.052, 32), '#5c9995', 0, y)
    solid(group, new THREE.CylinderGeometry(radius + 0.014, radius + 0.014, 0.019, 32), '#cfb76c', 0, y + 0.035)
  }
  solid(group, new THREE.CylinderGeometry(0.435, 0.435, 0.25, 32), '#ad6754', 0, 1.313)
  solid(group, new THREE.CylinderGeometry(0.307, 0.307, 0.21, 32), '#a66151', 0, 1.748)
  const roof = (radius: number, y: number, height: number) => {
    const profile = [
      [1, 0.14],
      [0.965, 0],
      [0.83, 0.15],
      [0.62, 0.44],
      [0.35, 0.8],
      [0.06, 1],
    ] as const
    solid(
      group,
      new THREE.LatheGeometry(
        profile.map(([r, h]) => new THREE.Vector2(radius * r, height * h)),
        48,
      ),
      '#477e9b',
      0,
      y,
      0,
      0.18,
    )
    const eave = solid(group, new THREE.TorusGeometry(radius * 0.985, 0.017, 6, 48), '#779fae', 0, y + 0.027)
    eave.rotation.x = Math.PI / 2
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2
      const points = profile
        .slice(1)
        .map(
          ([r, h]) =>
            new THREE.Vector3(Math.sin(angle) * radius * r, y + height * h + 0.012, Math.cos(angle) * radius * r),
        )
      solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 14, 0.007, 5, false), '#7199ae')
    }
  }
  roof(0.93, 0.958, 0.32)
  roof(0.721, 1.423, 0.29)
  roof(0.536, 1.869, 0.32)
  solid(group, new THREE.CylinderGeometry(0.075, 0.099, 0.065, 16), '#c9ad62', 0, 2.221, 0, 0.4)
  solid(group, new THREE.CylinderGeometry(0.04, 0.068, 0.09, 12), '#dfbd64', 0, 2.298, 0, 0.4)
  solid(group, new THREE.ConeGeometry(0.044, 0.12, 12), '#eccd77', 0, 2.403, 0, 0.4)
  for (const x of [-0.13, 0.13]) {
    solid(group, new THREE.BoxGeometry(0.13, 0.32, 0.028), '#774f42', x, 0.617, 0.569)
    solid(group, new THREE.BoxGeometry(0.027, 0.36, 0.035), '#c9b379', x + Math.sign(x) * 0.08, 0.637, 0.6)
  }
  solid(group, new THREE.BoxGeometry(0.26, 0.088, 0.027), '#356c81', 0, 0.882, 0.596)
  for (let step = 0; step < 6; step++)
    solid(group, new THREE.BoxGeometry(0.48, 0.042, 0.127), '#e8e8d9', 0, 0.15 + step * 0.049, 1.415 - step * 0.112)
  return group
}
