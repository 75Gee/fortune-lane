import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { solid } from './sceneUtils.js'

export function singaporeLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#c6d2bc', 0, .04)
  solid(group, new THREE.BoxGeometry(2.94, .025, .77), '#66b6c5', 0, .095, 1.04)
  solid(group, new THREE.BoxGeometry(2.94, .055, .19), '#e4e4d4', 0, .11, .59)
  solid(group, new RoundedBoxGeometry(2.66, .18, 1.18, 2, .045), '#e4e8dc', 0, .19)
  for (const x of [-.88, 0, .88]) {
    solid(group, new RoundedBoxGeometry(.55, 1.68, .55, 2, .045), '#7dabb6', x, 1.12)
    for (const side of [-1, 1]) {
      for (const dx of [-.24, -.12, 0, .12, .24]) {
        solid(group, new THREE.BoxGeometry(.025, 1.63, .02), '#dfe8df', x + dx, 1.12, side * .28)
      }
      for (let floor = 0; floor < 9; floor++) {
        solid(group, new THREE.BoxGeometry(.52, .017, .022), '#bfd5d4', x, .4 + floor * .18, side * .28)
      }
    }
    solid(group, new THREE.BoxGeometry(.09, 1.68, .58), '#e6e8d9', x - .25, 1.12)
    solid(group, new THREE.BoxGeometry(.09, 1.68, .58), '#e6e8d9', x + .25, 1.12)
    solid(group, new THREE.BoxGeometry(.22, .24, .04), '#558e9d', x, .3, .6)
  }
  const deckShape = new THREE.Shape()
  deckShape.moveTo(-1.48, -.15)
  deckShape.quadraticCurveTo(-1.57, .04, -1.43, .26)
  deckShape.quadraticCurveTo(-.4, .43, 1.2, .31)
  deckShape.quadraticCurveTo(1.43, .24, 1.53, -.06)
  deckShape.quadraticCurveTo(.3, -.4, -1.28, -.31)
  deckShape.quadraticCurveTo(-1.44, -.28, -1.48, -.15)
  const deck = solid(group, new THREE.ExtrudeGeometry(deckShape, { depth: .15, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2 }), '#e8e3d0', 0, 1.98)
  deck.rotation.x = -Math.PI / 2
  solid(group, new RoundedBoxGeometry(2.45, .035, .46, 2, .03), '#6fa57c', 0, 2.165)
  solid(group, new RoundedBoxGeometry(1.82, .025, .16, 2, .03), '#58bdce', -.12, 2.19, .11)
  for (const x of [-1.12, 1.05]) {
    solid(group, new THREE.CylinderGeometry(.022, .027, .17, 6), '#9b9d7a', x, 2.25, -.04)
    const crown = solid(group, new THREE.IcosahedronGeometry(.105, 0), '#4f946b', x, 2.36, -.04)
    crown.scale.y = .8
  }
  for (const x of [-1.34, 1.34]) {
    solid(group, new THREE.BoxGeometry(.24, .06, .44), '#83ac81', x, .12, -.9)
    solid(group, new THREE.IcosahedronGeometry(.16, 0), '#619873', x, .31, -.9)
  }
  return group
}

export function tokyoLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#bdcdb0', 0, .04)
  solid(group, new THREE.BoxGeometry(2.22, .04, 2.22), '#d9ddcb', 0, .1)
  solid(group, new THREE.BoxGeometry(.48, .025, 3), '#e8e5d6', 0, .13)
  solid(group, new THREE.BoxGeometry(1.16, .2, .9), '#e7e7db', 0, .25)
  for (const x of [-.4, 0, .4]) solid(group, new THREE.BoxGeometry(.23, .12, .025), '#8babad', x, .25, .46)

  // Repeated lattice members share one instanced mesh per color.
  const beams: { start: THREE.Vector3; end: THREE.Vector3; radius: number; white: boolean }[] = []
  const stages = [{ y: .16, radius: .78 }, { y: .81, radius: .49 }, { y: 1.38, radius: .29 }, { y: 1.7, radius: .22 }, { y: 2.12, radius: .13 }, { y: 2.39, radius: .07 }]
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const
  for (let stage = 0; stage < stages.length - 1; stage++) {
    const lower = stages[stage]!, upper = stages[stage + 1]!, white = stage === 2 || stage === 4
    for (let side = 0; side < 4; side++) {
      const [x, z] = corners[side]!, [nextX, nextZ] = corners[(side + 1) % 4]!
      const a = new THREE.Vector3(x * lower.radius, lower.y, z * lower.radius)
      const b = new THREE.Vector3(x * upper.radius, upper.y, z * upper.radius)
      const c = new THREE.Vector3(nextX * lower.radius, lower.y, nextZ * lower.radius)
      const d = new THREE.Vector3(nextX * upper.radius, upper.y, nextZ * upper.radius)
      beams.push({ start: a, end: b, radius: stage < 2 ? .044 : .027, white })
      beams.push({ start: a, end: d, radius: .021, white }, { start: c, end: b, radius: .021, white })
      beams.push({ start: b, end: d, radius: .026, white })
    }
  }
  const unitBeam = new THREE.CylinderGeometry(1, 1, 1, 6), dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0)
  for (const white of [false, true]) {
    const members = beams.filter((beam) => beam.white === white)
    const mesh = new THREE.InstancedMesh(unitBeam, new THREE.MeshStandardMaterial({ color: white ? '#f0eddf' : '#d55b4e', roughness: .75 }), members.length)
    members.forEach((beam, index) => {
      const direction = beam.end.clone().sub(beam.start), length = direction.length()
      dummy.position.copy(beam.start).add(beam.end).multiplyScalar(.5)
      dummy.quaternion.setFromUnitVectors(up, direction.normalize())
      dummy.scale.set(beam.radius, length, beam.radius); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh)
  }
  for (const [y, width] of [[1.44, .79], [2.13, .42]] as const) {
    solid(group, new THREE.BoxGeometry(width, .19, width), '#e7e4d9', 0, y)
    solid(group, new THREE.BoxGeometry(width + .06, .045, width + .06), '#d45b4d', 0, y + .12)
    for (const side of [-1, 1]) {
      solid(group, new THREE.BoxGeometry(width * .8, .075, .013), '#7a9b9f', 0, y, side * (width / 2 + .009))
      solid(group, new THREE.BoxGeometry(.013, .075, width * .8), '#7a9b9f', side * (width / 2 + .009), y)
    }
  }
  for (let i = 0; i < 4; i++) solid(group, new THREE.CylinderGeometry(.024, .04, .18, 8), i % 2 ? '#eeeadd' : '#d55b4e', 0, 2.49 + i * .18)
  for (const x of [-1.23, 1.23]) {
    solid(group, new THREE.CylinderGeometry(.04, .055, .42, 6), '#a3947a', x, .3, .95)
    for (const offset of [-.1, .1]) {
      const crown = solid(group, new THREE.IcosahedronGeometry(.23, 1), offset < 0 ? '#dda3b0' : '#efc5cd', x + offset, .56, .95)
      crown.scale.y = .85
    }
  }
  return group
}

export function seoulLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#bdd0b2', 0, .04)
  solid(group, new THREE.CylinderGeometry(.78, 1.36, .36, 12), '#91b285', 0, .26)
  solid(group, new THREE.CylinderGeometry(.73, .78, .065, 24), '#dde0cc', 0, .47)
  solid(group, new THREE.CylinderGeometry(.3, .4, .19, 16), '#dfdfd2', 0, .59)
  solid(group, new THREE.CylinderGeometry(.095, .16, 1.23, 20), '#e8e9e0', 0, 1.27)
  solid(group, new THREE.CylinderGeometry(.25, .11, .17, 20), '#d8ddd6', 0, 1.82)
  solid(group, new THREE.CylinderGeometry(.37, .37, .07, 24), '#eeeadc', 0, 1.9)
  solid(group, new THREE.CylinderGeometry(.33, .33, .23, 24), '#689baa', 0, 2.05)
  solid(group, new THREE.CylinderGeometry(.37, .37, .065, 24), '#eeeadc', 0, 2.2)
  solid(group, new THREE.CylinderGeometry(.2, .35, .13, 24), '#d9ded4', 0, 2.3)
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2
    solid(group, new THREE.CylinderGeometry(.012, .012, .23, 5), '#dbe5dc', Math.cos(angle) * .335, 2.05, Math.sin(angle) * .335)
  }
  solid(group, new THREE.CylinderGeometry(.025, .055, .79, 12), '#e5e7df', 0, 2.74)
  for (const y of [2.49, 2.77, 3.02]) solid(group, new THREE.CylinderGeometry(.062, .062, .045, 10), '#a86259', 0, y)
  for (let step = 0; step < 6; step++) solid(group, new THREE.BoxGeometry(.64, .055, .18), '#d7dbcc', 0, .12 + step * .058, 1.3 - step * .145)
  for (const x of [-1.03, 1.03]) for (const z of [-.79, .79]) {
    solid(group, new THREE.CylinderGeometry(.028, .044, .27, 5), '#9b947a', x, .24, z)
    solid(group, new THREE.ConeGeometry(.21, .47, 6), z > 0 ? '#61956f' : '#477f68', x, .53, z)
  }
  for (const x of [-.48, .48]) {
    solid(group, new THREE.BoxGeometry(.25, .035, .08), '#a5a98c', x, .56, .35)
    for (const dx of [-.085, .085]) solid(group, new THREE.BoxGeometry(.025, .07, .04), '#7d9582', x + dx, .51, .35)
  }
  return group
}

function operaShell(width: number, depth: number, height: number) {
  const group = new THREE.Group()
  const point = (t: number, u: number) => new THREE.Vector3(
    u * width / 2 * (1 - t) ** .65,
    height * t ** .8 * (1 - .58 * u * u * (1 - t)),
    (.5 - t) * depth,
  )
  // A tapered curved surface forms a sail, with its tip shared by the final row.
  const positions: number[] = [], indices: number[] = [], rows = 14, columns = 12
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const at = point(row / rows, column / columns * 2 - 1)
      positions.push(at.x, at.y, at.z)
      if (row < rows - 1 && column < columns) {
        const index = row * (columns + 1) + column
        indices.push(index, index + 1, index + columns + 1, index + 1, index + columns + 2, index + columns + 1)
      }
    }
  }
  const tip = positions.length / 3; positions.push(0, height, -depth / 2)
  for (let column = 0; column < columns; column++) {
    const index = (rows - 1) * (columns + 1) + column
    indices.push(index, index + 1, tip)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  const roof = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#f1efe4', side: THREE.DoubleSide, roughness: .78 }))
  roof.castShadow = roof.receiveShadow = true; group.add(roof)
  for (const u of [-1, 0, 1]) {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 15 }, (_, i) => point(i / 14, u)))
    solid(group, new THREE.TubeGeometry(curve, 20, .012, 5, false), '#dad8c9')
  }
  return group
}

export function sydneyLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#70b5c3', 0, .04)
  solid(group, new RoundedBoxGeometry(2.78, .14, 2.8, 2, .08), '#cbbba0', 0, .15)
  solid(group, new THREE.BoxGeometry(2.55, .055, 2.45), '#e0d6bd', 0, .25, -.08)
  for (const x of [-.65, .65]) {
    solid(group, new THREE.BoxGeometry(1.02, .18, 1.85), '#c7c9bd', x, .35, -.16)
    for (let layer = 0; layer < 3; layer++) {
      const height = (x < 0 ? 1.5 : 1.3) - layer * .33
      const shell = operaShell(1.08 - layer * .07, 1.03 - layer * .08, height)
      shell.position.set(x, .44, -.64 + layer * .49); group.add(shell)
    }
    solid(group, new THREE.BoxGeometry(.69, .19, .025), '#63959c', x, .43, .78)
    for (const dx of [-.23, 0, .23]) solid(group, new THREE.BoxGeometry(.018, .2, .027), '#e3decc', x + dx, .43, .8)
  }
  const entry = operaShell(.67, .57, .49); entry.position.set(0, .31, .88); group.add(entry)
  for (let step = 0; step < 4; step++) solid(group, new THREE.BoxGeometry(1.7, .04, .115), '#d9c9ac', 0, .12 + step * .04, 1.36 - step * .09)
  for (const side of [-1, 1]) {
    solid(group, new THREE.BoxGeometry(.06, .035, 2.52), '#eee6cf', side * 1.32, .24, -.08)
    solid(group, new THREE.BoxGeometry(.42, .012, .025), '#b0d9dc', side * 1.04, .092, 1.5)
  }
  return group
}

export function melbourneLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#cbd2be', 0, .04)
  solid(group, new THREE.BoxGeometry(2.98, .035, 2.94), '#e0dacb', 0, .095)
  solid(group, new THREE.BoxGeometry(2.76, .09, 1.27), '#b49772', 0, .16)
  solid(group, new THREE.BoxGeometry(2.66, .78, 1.08), '#dfb65d', 0, .59)
  solid(group, new THREE.BoxGeometry(2.8, .075, 1.2), '#f0d699', 0, .99)
  solid(group, new RoundedBoxGeometry(2.68, .23, 1.06, 3, .1), '#558d7e', 0, 1.13)
  for (const x of [-1.22, -.82, -.42, .42, .82, 1.22]) {
    solid(group, new THREE.BoxGeometry(.055, .73, .055), '#f3d598', x, .61, .56)
    solid(group, new THREE.BoxGeometry(.085, .055, .08), '#f2dfb3', x, .91, .575)
  }

  const arch = (width: number, height: number) => {
    const shape = new THREE.Shape(), radius = width / 2
    shape.moveTo(-radius, 0); shape.lineTo(radius, 0)
    shape.lineTo(radius, height - radius)
    shape.absarc(0, height - radius, radius, 0, Math.PI, false)
    shape.lineTo(-radius, 0)
    return new THREE.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: false })
  }
  for (const x of [-1.02, -.62, .62, 1.02]) {
    solid(group, arch(.29, .48), '#f5deb0', x, .32, .551)
    solid(group, arch(.205, .395), '#476c69', x, .345, .578)
    solid(group, new THREE.BoxGeometry(.018, .3, .014), '#d8c999', x, .515, .61)
    solid(group, new THREE.BoxGeometry(.21, .018, .014), '#d8c999', x, .6, .61)
  }
  solid(group, new THREE.BoxGeometry(.73, 1.06, 1.12), '#e5bd69', 0, .74)
  solid(group, arch(.52, .65), '#f6dfaa', 0, .2, .57)
  solid(group, arch(.39, .55), '#385d59', 0, .21, .6)
  solid(group, new THREE.BoxGeometry(.035, .44, .02), '#cda65c', 0, .43, .634)
  for (const x of [-.29, .29]) {
    solid(group, new THREE.BoxGeometry(.085, .77, .1), '#efd49a', x, .62, .615)
    solid(group, new THREE.BoxGeometry(.12, .07, .13), '#f2dfb3', x, 1.01, .63)
  }
  solid(group, new THREE.BoxGeometry(.84, .09, 1.23), '#eed49d', 0, 1.31)
  solid(group, new THREE.CylinderGeometry(.36, .39, .2, 24), '#d9b463', 0, 1.43)
  const profile = [[.38, 0], [.4, .055], [.35, .14], [.31, .26], [.2, .38], [.075, .44], [.04, .47]]
    .map(([radius, height]) => new THREE.Vector2(radius!, height!))
  solid(group, new THREE.LatheGeometry(profile, 24), '#4d8878', 0, 1.53)
  solid(group, new THREE.CylinderGeometry(.047, .065, .15, 10), '#e2c47f', 0, 2.06)
  solid(group, new THREE.ConeGeometry(.085, .13, 10), '#447b70', 0, 2.2)
  solid(group, new THREE.ConeGeometry(.018, .14, 6), '#d7b870', 0, 2.33)
  const clockRim = solid(group, new THREE.CylinderGeometry(.155, .155, .04, 24), '#b98c42', 0, 1.105, .589)
  clockRim.rotation.x = Math.PI / 2
  const clockFace = solid(group, new THREE.CircleGeometry(.128, 24), '#fff2cf', 0, 1.105, .613)
  for (let hour = 0; hour < 12; hour++) {
    const angle = hour / 12 * Math.PI * 2
    const tick = solid(clockFace, new THREE.BoxGeometry(.012, .024, .007), '#675b45', Math.sin(angle) * .101, Math.cos(angle) * .101, .005)
    tick.rotation.z = -angle
  }
  solid(clockFace, new THREE.BoxGeometry(.014, .08, .012), '#425956', 0, .03, .013)
  const hand = solid(clockFace, new THREE.BoxGeometry(.064, .014, .012), '#425956', .024, -.015, .014)
  hand.rotation.z = -.45

  // Rear platforms stay inside the same square as the station frontage.
  solid(group, new THREE.BoxGeometry(2.7, .035, .43), '#939e94', 0, .135, -.97)
  for (const z of [-1.06, -.86]) solid(group, new THREE.BoxGeometry(2.7, .014, .025), '#657775', 0, .16, z)
  for (const x of [-1.08, 0, 1.08]) solid(group, new THREE.BoxGeometry(.035, .52, .035), '#638c7a', x, .4, -.96)
  solid(group, new RoundedBoxGeometry(2.78, .075, .55, 2, .025), '#80a69a', 0, .68, -.96)
  for (let step = 0; step < 3; step++) solid(group, new THREE.BoxGeometry(.89, .04, .16), '#d7c6a8', 0, .13 + step * .04, .98 - step * .12)
  for (const x of [-1.13, 1.13]) {
    solid(group, new THREE.BoxGeometry(.38, .07, .32), '#a9b795', x, .14, 1.14)
    solid(group, new RoundedBoxGeometry(.33, .17, .27, 2, .04), '#66946e', x, .25, 1.14)
  }
  return group
}

export function dubaiLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#d5d8cc', 0, .04)
  solid(group, new RoundedBoxGeometry(2.97, .035, 2.97, 3, .15), '#e6e4d7', 0, .097)
  solid(group, new RoundedBoxGeometry(2.67, .025, 1.01, 3, .16), '#62b9c9', 0, .128, .89)
  solid(group, new THREE.CylinderGeometry(.89, .97, .11, 24), '#c9d4d2', 0, .185)
  solid(group, new THREE.CylinderGeometry(.14, .25, 2.55, 12), '#8bb7c9', 0, 1.515, 0, .48)

  const bands: { radius: number; x: number; y: number; z: number }[] = []
  // Three radial wings step back at different heights around the central shaft.
  for (let level = 0; level < 9; level++) {
    const bottom = .24 + level * .285, radius = .2 - level * .014
    const activeWings = level < 6 ? 3 : level < 8 ? 2 : 1
    for (let wing = 0; wing < activeWings; wing++) {
      const angle = wing * Math.PI * 2 / 3 + Math.PI
      const reach = .51 - level * .045 - wing * .027
      const x = Math.sin(angle) * reach, z = Math.cos(angle) * reach
      const body = new THREE.Group(); body.rotation.y = angle; group.add(body)
      solid(body, new THREE.BoxGeometry(radius * 1.8, .285, reach), '#8db8c8', 0, bottom + .1425, reach / 2, .42)
      solid(body, new THREE.CylinderGeometry(radius * .94, radius, .285, 12), wing === 1 ? '#72a5bc' : '#95bdca', 0, bottom + .1425, reach, .5)
      solid(body, new THREE.BoxGeometry(.017, .28, reach), '#e0e9e7', radius * .9, bottom + .14, reach / 2, .45)
      solid(body, new THREE.BoxGeometry(.017, .28, reach), '#e0e9e7', -radius * .9, bottom + .14, reach / 2, .45)
      for (const dy of [.075, .16, .26]) bands.push({ radius: radius * (1 - dy / .285 * .06) + .007, x, y: bottom + dy, z })
    }
    bands.push({ radius: .25 - (bottom + .25 - .24) / 2.55 * .11 + .008, x: 0, y: bottom + .25, z: 0 })
  }
  const trim = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ color: '#dbe8e9', metalness: .55, roughness: .35 }), bands.length)
  const dummy = new THREE.Object3D()
  bands.forEach((band, index) => {
    dummy.position.set(band.x, band.y, band.z); dummy.scale.set(band.radius, .012, band.radius)
    dummy.updateMatrix(); trim.setMatrixAt(index, dummy.matrix)
  })
  trim.castShadow = trim.receiveShadow = true; group.add(trim)
  solid(group, new THREE.CylinderGeometry(.076, .14, .29, 12), '#afcbd4', 0, 2.935, 0, .55)
  solid(group, new THREE.CylinderGeometry(.033, .075, .25, 10), '#d0dfe0', 0, 3.205, 0, .6)
  solid(group, new THREE.ConeGeometry(.032, .44, 8), '#e6ece8', 0, 3.55, 0, .55)
  solid(group, new THREE.BoxGeometry(.34, .035, .56), '#edece0', 0, .16, 1.24)
  for (const x of [-.92, -.58, .58, .92]) {
    const ripple = solid(group, new THREE.TorusGeometry(.105, .009, 5, 20), '#b3e2e6', x, .148, .94)
    ripple.rotation.x = -Math.PI / 2
    solid(group, new THREE.ConeGeometry(.015, .15, 6), '#d4eff0', x, .21, .94)
  }
  for (const x of [-1.13, 1.13]) {
    solid(group, new RoundedBoxGeometry(.32, .055, 1.14, 2, .06), '#87ac91', x, .14, -.39)
    for (const z of [-.77, -.06]) {
      solid(group, new THREE.CylinderGeometry(.025, .045, .27, 6), '#aa9d7b', x, .29, z)
      for (let leaf = 0; leaf < 5; leaf++) {
        const angle = leaf * Math.PI * 2 / 5
        const frond = solid(group, new THREE.ConeGeometry(.065, .25, 4), '#58977b', x + Math.sin(angle) * .075, .445, z + Math.cos(angle) * .075)
        frond.rotation.set(Math.cos(angle) * .95, 0, -Math.sin(angle) * .95)
      }
    }
  }
  return group
}

export function istanbulLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#bdcdb8', 0, .04)
  solid(group, new THREE.BoxGeometry(2.92, .04, 2.92), '#deded1', 0, .1)
  solid(group, new THREE.BoxGeometry(1.94, .1, 1.92), '#c3c7b7', 0, .17)
  solid(group, new THREE.BoxGeometry(1.65, .74, 1.65), '#e7dfc7', 0, .59)
  solid(group, new THREE.BoxGeometry(1.76, .075, 1.76), '#f2ead5', 0, .98)

  const dome = (radius: number, x: number, y: number, z: number) => {
    solid(group, new THREE.CylinderGeometry(radius, radius, .075, 24), '#e1d7bd', x, y, z)
    const roof = solid(group, new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#7fabb5', x, y + .036, z, .2)
    roof.scale.y = .82
    solid(group, new THREE.CylinderGeometry(.013, .019, .09, 6), '#c5ab62', x, y + .082 + radius * .82, z, .3)
    solid(group, new THREE.ConeGeometry(.026, .065, 8), '#d6bd73', x, y + .16 + radius * .82, z, .3)
  }
  for (const x of [-.57, .57]) for (const z of [-.57, .57]) dome(.235, x, 1.025, z)
  for (const [x, z] of [[-.51, 0], [.51, 0], [0, -.51], [0, .51]]) dome(.37, x!, 1.08, z!)
  solid(group, new THREE.CylinderGeometry(.52, .59, .3, 24), '#e8dfc6', 0, 1.205)
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2
    const window = solid(group, new THREE.BoxGeometry(.045, .12, .022), '#567e88', Math.sin(angle) * .549, 1.27, Math.cos(angle) * .549)
    window.rotation.y = angle
  }
  dome(.565, 0, 1.375, 0)

  const windowShape = new THREE.Shape()
  windowShape.moveTo(-.06, 0); windowShape.lineTo(.06, 0)
  windowShape.lineTo(.06, .14); windowShape.quadraticCurveTo(.05, .2, 0, .23)
  windowShape.quadraticCurveTo(-.05, .2, -.06, .14); windowShape.closePath()
  const windowGeometry = new THREE.ExtrudeGeometry(windowShape, { depth: .012, bevelEnabled: false })
  for (let side = 0; side < 4; side++) {
    const facade = new THREE.Group(); facade.rotation.y = side * Math.PI / 2; group.add(facade)
    for (const x of [-.59, -.31, .31, .59]) {
      solid(facade, windowGeometry, '#557a83', x, .49, .831)
      solid(facade, new THREE.BoxGeometry(.17, .025, .025), '#f6ecd5', x, .475, .84)
    }
    solid(facade, new THREE.BoxGeometry(1.66, .035, .035), '#c6bea8', 0, .8, .84)
  }
  solid(group, new THREE.BoxGeometry(.37, .5, .065), '#f4e7cd', 0, .49, .86)
  const entry = solid(group, windowGeometry, '#3e686f', 0, .24, .905)
  entry.scale.set(2.05, 1.8, 1)
  solid(group, new THREE.BoxGeometry(.48, .06, .3), '#b2c8c9', 0, .76, .94)
  for (let step = 0; step < 3; step++) solid(group, new THREE.BoxGeometry(.63, .035, .16), '#e1d9c2', 0, .135 + step * .035, 1.23 - step * .12)

  for (const [x, z] of [[-1.17, -.73], [1.17, -.73], [-1.17, .73], [1.17, .73], [-.62, -1.21], [.62, -1.21]]) {
    const tower = new THREE.Group(); tower.position.set(x!, 0, z!); group.add(tower)
    solid(tower, new THREE.BoxGeometry(.23, .24, .23), '#d8cfb7', 0, .24)
    solid(tower, new THREE.CylinderGeometry(.056, .086, 1.46, 12), '#eee4ce', 0, 1.06)
    for (const y of [.86, 1.24, 1.64]) {
      solid(tower, new THREE.CylinderGeometry(.11, .07, .07, 12), '#c9c6b3', 0, y)
      solid(tower, new THREE.CylinderGeometry(.112, .112, .035, 12), '#f2e7cf', 0, y + .046)
    }
    solid(tower, new THREE.ConeGeometry(.088, .34, 12), '#648f9c', 0, 1.96, 0, .2)
    solid(tower, new THREE.ConeGeometry(.018, .12, 6), '#d6b864', 0, 2.17, 0, .3)
  }
  for (const x of [-1.17, 1.17]) {
    solid(group, new THREE.BoxGeometry(.34, .055, .31), '#98b396', x, .145, 1.24)
    solid(group, new THREE.ConeGeometry(.105, .36, 8), '#5c8e77', x, .35, 1.24)
  }
  return group
}

export function athensLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#c7ccb7', 0, .04)
  solid(group, new RoundedBoxGeometry(2.97, .12, 2.97, 2, .14), '#b9b49b', 0, .14)
  for (let step = 0; step < 3; step++) {
    solid(group, new THREE.BoxGeometry(2.55 - step * .17, .065, 2.8 - step * .14), step === 2 ? '#eee6d1' : '#d8cfb6', 0, .23 + step * .065)
  }
  solid(group, new THREE.BoxGeometry(.96, .84, 1.52), '#c9c3ac', 0, .8)
  solid(group, new THREE.BoxGeometry(.37, .61, .025), '#59665d', 0, .69, .773)
  for (const x of [-.23, .23]) solid(group, new THREE.BoxGeometry(.08, .69, .07), '#e8dfc6', x, .73, .79)
  solid(group, new THREE.BoxGeometry(.53, .08, .07), '#e8dfc6', 0, 1.105, .79)

  // The colonnade shares its shaft, base and capital geometry across all columns.
  const columns: [number, number][] = []
  for (let i = 0; i < 8; i++) for (const z of [-1.04, 1.04]) columns.push([-.875 + i * .25, z])
  for (let i = 1; i < 10; i++) for (const x of [-.875, .875]) columns.push([x, -1.04 + i * .208])
  const dummy = new THREE.Object3D()
  for (const part of [
    { geometry: new THREE.CylinderGeometry(.064, .078, .87, 12), y: .86, color: '#f1e8d2' },
    { geometry: new THREE.CylinderGeometry(.088, .09, .055, 12), y: .405, color: '#e3d8bd' },
    { geometry: new THREE.CylinderGeometry(.097, .065, .055, 12), y: 1.313, color: '#e1d5b9' },
    { geometry: new THREE.BoxGeometry(.197, .052, .197), y: 1.365, color: '#f0e5cb' },
  ]) {
    const mesh = new THREE.InstancedMesh(part.geometry, new THREE.MeshStandardMaterial({ color: part.color, roughness: .85 }), columns.length)
    columns.forEach(([x, z], index) => {
      dummy.position.set(x, part.y, z); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh)
  }
  solid(group, new THREE.BoxGeometry(2.08, .14, 2.42), '#d5c9ae', 0, 1.456)
  solid(group, new THREE.BoxGeometry(2.19, .06, 2.53), '#eee3cb', 0, 1.556)
  for (const z of [-1.219, 1.219]) for (let i = 0; i < 15; i++) {
    solid(group, new THREE.BoxGeometry(.043, .085, .02), '#a9a58f', -.91 + i * .13, 1.462, z)
  }
  for (const x of [-1.049, 1.049]) for (let i = 0; i < 17; i++) {
    solid(group, new THREE.BoxGeometry(.02, .085, .043), '#a9a58f', x, 1.462, -1.1 + i * .1375)
  }

  const pediment = new THREE.Shape()
  pediment.moveTo(-1.065, 0); pediment.lineTo(1.065, 0); pediment.lineTo(0, .41); pediment.closePath()
  solid(group, new THREE.ExtrudeGeometry(pediment, { depth: 2.46, bevelEnabled: false }), '#ddd2b8', 0, 1.586, -1.23)
  const inset = new THREE.Shape()
  inset.moveTo(-.8, 0); inset.lineTo(.8, 0); inset.lineTo(0, .27); inset.closePath()
  const insetGeometry = new THREE.ShapeGeometry(inset)
  for (const side of [-1, 1]) {
    const relief = solid(group, insetGeometry, '#b9ae93', 0, 1.635, side * 1.233)
    if (side < 0) relief.rotation.y = Math.PI
    for (const x of [-.36, 0, .36]) {
      solid(group, new THREE.CylinderGeometry(.029, .047, x === 0 ? .15 : .08, 6), '#e9dec4', x, 1.69, side * 1.244)
    }
  }
  const slope = Math.atan2(.41, 1.065), slopeWidth = Math.hypot(1.065, .41)
  for (const side of [-1, 1]) {
    const roof = solid(group, new THREE.BoxGeometry(slopeWidth + .07, .04, 2.55), '#c8b899', side * .5325, 1.808)
    roof.rotation.z = -side * slope
    for (let row = 0; row < 11; row++) {
      const rib = solid(group, new THREE.BoxGeometry(slopeWidth + .07, .018, .022), '#ddd0b4', side * .5325, 1.835, -1.16 + row * .232)
      rib.rotation.z = -side * slope
    }
  }
  solid(group, new THREE.BoxGeometry(.07, .06, 2.6), '#eee1c5', 0, 2.019)
  for (const x of [-1.34, 1.34]) {
    solid(group, new THREE.CylinderGeometry(.026, .04, .21, 6), '#8f9276', x, .31, -.98)
    const leaves = solid(group, new THREE.IcosahedronGeometry(.17, 1), '#79947a', x, .48, -.98)
    leaves.scale.y = .8
  }
  return group
}

export function romeLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#c5cbb6', 0, .04)
  solid(group, new RoundedBoxGeometry(3.02, .055, 2.78, 2, .16), '#dcd5c1', 0, .108)
  const amphitheatre = new THREE.Group(); amphitheatre.scale.z = .79; group.add(amphitheatre)
  solid(amphitheatre, new THREE.CylinderGeometry(1.45, 1.49, .09, 56), '#c4b69a', 0, .18)
  solid(amphitheatre, new THREE.CylinderGeometry(.76, .76, .025, 48), '#cbb892', 0, .238)

  for (let step = 0; step < 4; step++) {
    const inside = .77 + step * .09, outside = inside + .095
    const shape = new THREE.Shape()
    shape.absarc(0, 0, outside, 0, Math.PI * 2, false)
    const hole = new THREE.Path(); hole.absarc(0, 0, inside, 0, Math.PI * 2, true); shape.holes.push(hole)
    const seat = solid(amphitheatre, new THREE.ExtrudeGeometry(shape, { depth: .05 + step * .055, bevelEnabled: false, curveSegments: 28 }), step % 2 ? '#d2c5aa' : '#e0d3b9', 0, .225)
    seat.rotation.x = -Math.PI / 2
  }
  const radius = 1.29, segments = 28, angleStep = Math.PI * 2 / segments, width = radius * angleStep
  const openingRadius = width * .31, leg = .155, height = .355
  const arch = new THREE.Shape()
  arch.moveTo(-width / 2, 0); arch.lineTo(-openingRadius, 0); arch.lineTo(-openingRadius, leg)
  arch.absarc(0, leg, openingRadius, Math.PI, 0, true)
  arch.lineTo(openingRadius, 0); arch.lineTo(width / 2, 0)
  arch.lineTo(width / 2, height); arch.lineTo(-width / 2, height); arch.closePath()

  // Bend each open arch around the ring so adjacent panels meet without seams.
  const bend = (geometry: THREE.BufferGeometry) => {
    const positions = geometry.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const angle = positions.getX(i) / radius, distance = radius + positions.getZ(i)
      positions.setXYZ(i, Math.sin(angle) * distance, positions.getY(i), Math.cos(angle) * distance)
    }
    positions.needsUpdate = true; geometry.computeVertexNormals()
    return geometry
  }
  const archGeometry = bend(new THREE.ExtrudeGeometry(arch, { depth: .13, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -.065))
  const ledgeGeometry = bend(new THREE.BoxGeometry(width, .04, .18, 4).translate(0, height, 0))
  const pilasterGeometry = bend(new THREE.BoxGeometry(.032, .265, .035).translate(-width / 2 + .016, .155, .08))
  const bays: { angle: number; y: number }[] = [], attic: { angle: number; y: number }[] = []
  for (let i = 0; i < segments; i++) {
    const angle = i * angleStep, front = Math.cos(angle)
    const levels = front > .55 ? 1 : front > -.15 ? 2 : 3
    for (let level = 0; level < levels; level++) bays.push({ angle, y: .235 + level * height })
    if (levels === 3) attic.push({ angle, y: .235 + 3 * height })
  }
  const dummy = new THREE.Object3D()
  for (const part of [
    { geometry: archGeometry, color: '#dac6a4', placements: bays },
    { geometry: ledgeGeometry, color: '#ede0c5', placements: bays },
    { geometry: pilasterGeometry, color: '#efdfc0', placements: bays },
    { geometry: bend(new THREE.BoxGeometry(width, .21, .13, 4).translate(0, .105, 0)), color: '#cfbd9e', placements: attic },
    { geometry: bend(new THREE.BoxGeometry(width, .035, .17, 4).translate(0, .224, 0)), color: '#e7d7b9', placements: attic },
    { geometry: bend(new THREE.BoxGeometry(.045, .065, .015).translate(0, .11, .073)), color: '#8e8976', placements: attic },
  ]) {
    const mesh = new THREE.InstancedMesh(part.geometry, new THREE.MeshStandardMaterial({ color: part.color, roughness: .88 }), part.placements.length)
    part.placements.forEach((bay, index) => {
      dummy.position.set(0, bay.y, 0); dummy.rotation.y = bay.angle
      dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true; amphitheatre.add(mesh)
  }
  for (const x of [-.34, 0, .34]) solid(amphitheatre, new THREE.BoxGeometry(.045, .065, .95), '#ab9d7f', x, .27)
  for (const z of [-.3, .08, .38]) solid(amphitheatre, new THREE.BoxGeometry(1.03, .06, .04), '#b9a887', 0, .265, z)
  solid(group, new THREE.BoxGeometry(.58, .035, .27), '#ebe0c8', 0, .15, 1.31)
  for (const x of [-1.26, 1.26]) for (const z of [-1.16, 1.16]) {
    solid(group, new THREE.CylinderGeometry(.025, .035, .21, 6), '#989078', x, .245, z)
    solid(group, new THREE.ConeGeometry(.1, .34, 8), '#648975', x, .48, z)
  }
  return group
}

export function viennaLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#bfcfb9', 0, .04)
  solid(group, new THREE.BoxGeometry(2.98, .035, 2.94), '#e4dfcd', 0, .098)
  solid(group, new THREE.BoxGeometry(2.84, .065, 1.07), '#c6c6b1', 0, .15)
  solid(group, new THREE.BoxGeometry(2.68, .78, .64), '#e4c46d', 0, .565)
  solid(group, new THREE.BoxGeometry(2.75, .06, .71), '#f2e2b6', 0, .975)
  const roof = (width: number, depth: number, height: number, x: number, y: number) => {
    const geometry = new THREE.CylinderGeometry(1, 1, height, 4, 1, false, Math.PI / 4)
    const positions = geometry.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const taper = positions.getY(i) > 0 ? .66 : 1
      positions.setX(i, positions.getX(i) * width / Math.SQRT2 * taper)
      positions.setZ(i, positions.getZ(i) * depth / Math.SQRT2 * taper)
    }
    positions.needsUpdate = true; geometry.computeVertexNormals()
    solid(group, geometry, '#617c7b', x, y, 0, .16)
  }
  roof(2.78, .78, .25, 0, 1.125)
  for (const x of [-1.1, 0, 1.1]) {
    const width = x === 0 ? .7 : .51, top = x === 0 ? 1.12 : 1.015
    solid(group, new THREE.BoxGeometry(width, top - .19, .91), '#ebcd7d', x, (top + .19) / 2)
    solid(group, new THREE.BoxGeometry(width + .09, .065, .99), '#f2e4bb', x, top + .033)
    roof(width + .1, 1, .28, x, top + .205)
    for (const dx of [-width / 2 + .045, width / 2 - .045]) {
      solid(group, new THREE.BoxGeometry(.046, top - .25, .04), '#faecc7', x + dx, (top + .25) / 2, .472)
    }
  }
  const windowPositions: THREE.Vector3[] = []
  for (const side of [-1, 1]) {
    for (const x of [-1.2, -1, -.78, -.56, -.16, 0, .16, .56, .78, 1, 1.2]) {
      const pavilion = Math.abs(x) < .35 || Math.abs(x) > .85
      for (const y of [.43, .77]) {
        if (y === .43 && Math.abs(x) < .25) continue
        windowPositions.push(new THREE.Vector3(x, y, side * (pavilion ? .464 : .329)))
      }
    }
    solid(group, new THREE.BoxGeometry(2.67, .033, .033), '#f0dfaf', 0, .61, side * .344)
  }
  const dummy = new THREE.Object3D()
  for (const part of [
    { geometry: new THREE.BoxGeometry(.128, .22, .018), color: '#f7e9c1', offset: 0 },
    { geometry: new THREE.BoxGeometry(.083, .167, .02), color: '#577879', offset: .012 },
    { geometry: new THREE.BoxGeometry(.014, .168, .024), color: '#d5d9c3', offset: .023 },
    { geometry: new THREE.BoxGeometry(.084, .013, .024), color: '#d5d9c3', offset: .023 },
  ]) {
    const mesh = new THREE.InstancedMesh(part.geometry, new THREE.MeshStandardMaterial({ color: part.color, roughness: .72 }), windowPositions.length)
    windowPositions.forEach((position, index) => {
      dummy.position.copy(position); dummy.position.z += Math.sign(position.z) * part.offset
      dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh)
  }
  for (const x of [-.18, 0, .18]) {
    solid(group, new THREE.BoxGeometry(.12, .26, .035), '#486c69', x, .335, .475)
    solid(group, new THREE.BoxGeometry(.024, .3, .06), '#f6e4b3', x - .075, .35, .5)
  }
  solid(group, new THREE.BoxGeometry(.59, .075, .2), '#f4e6bf', 0, .55, .52)
  solid(group, new THREE.BoxGeometry(.55, .06, .035), '#e6d9b6', 0, .637, .606)
  for (const x of [-.25, -.15, -.05, .05, .15, .25]) solid(group, new THREE.BoxGeometry(.019, .065, .025), '#b0aa8c', x, .589, .606)
  const pediment = new THREE.Shape()
  pediment.moveTo(-.38, 0); pediment.lineTo(.38, 0); pediment.lineTo(0, .22); pediment.closePath()
  solid(group, new THREE.ExtrudeGeometry(pediment, { depth: .075, bevelEnabled: false }), '#f5e6bc', 0, 1.11, .48)
  const clock = solid(group, new THREE.CircleGeometry(.058, 20), '#fff4d3', 0, 1.19, .558)
  solid(clock, new THREE.BoxGeometry(.008, .038, .007), '#657468', 0, .014, .006)
  solid(clock, new THREE.BoxGeometry(.026, .008, .007), '#657468', .01, 0, .007)
  for (const x of [-.72, .72]) solid(group, new THREE.BoxGeometry(.075, .19, .095), '#c9c5b1', x, 1.27, -.12)

  for (const side of [-1, 1]) {
    solid(group, new THREE.BoxGeometry(.38, .018, .75), '#f4ebd8', 0, .129, side * 1.01)
    for (const x of [-.7, .7]) {
      solid(group, new RoundedBoxGeometry(.79, .065, .62, 2, .06), '#568b6c', x, .152, side * 1.03)
      solid(group, new RoundedBoxGeometry(.63, .02, .46, 2, .055), '#a6c394', x, .195, side * 1.03)
      for (const dx of [-.2, 0, .2]) {
        solid(group, new THREE.BoxGeometry(.075, .035, .24), side > 0 ? '#d58f9a' : '#c5d0a4', x + dx, .218, side * 1.03)
      }
    }
  }
  solid(group, new THREE.CylinderGeometry(.185, .2, .06, 24), '#c6d6cd', 0, .165, 1.15)
  solid(group, new THREE.CylinderGeometry(.156, .156, .015, 24), '#79bdca', 0, .202, 1.15)
  solid(group, new THREE.CylinderGeometry(.035, .056, .12, 10), '#e8e3ce', 0, .262, 1.15)
  solid(group, new THREE.CylinderGeometry(.09, .06, .035, 16), '#d8dfd0', 0, .333, 1.15)
  for (let step = 0; step < 3; step++) solid(group, new THREE.BoxGeometry(.66, .027, .105), '#e0d7be', 0, .13 + step * .027, .77 - step * .079)
  return group
}

export function berlinLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#bdcbb8', 0, .04)
  solid(group, new THREE.BoxGeometry(3.02, .045, 2.9), '#d9ddcf', 0, .105)
  solid(group, new THREE.BoxGeometry(2.94, .07, 1.09), '#bbbfae', 0, .16)
  for (const x of [-.55, 0, .55]) solid(group, new THREE.BoxGeometry(.025, .008, 2.73), '#bec8ba', x, .132)
  const columns: [number, number][] = []
  for (const x of [-.85, -.53, -.21, .21, .53, .85]) for (const z of [-.29, .29]) columns.push([x, z])
  const dummy = new THREE.Object3D()
  for (const part of [
    { geometry: new THREE.CylinderGeometry(.076, .096, 1.04, 12), y: .775, color: '#e9e1c9' },
    { geometry: new THREE.CylinderGeometry(.112, .115, .055, 12), y: .228, color: '#d0c7ad' },
    { geometry: new THREE.CylinderGeometry(.112, .077, .055, 12), y: 1.32, color: '#d9ceb3' },
    { geometry: new THREE.BoxGeometry(.24, .055, .24), y: 1.375, color: '#eee5ce' },
  ]) {
    const mesh = new THREE.InstancedMesh(part.geometry, new THREE.MeshStandardMaterial({ color: part.color, roughness: .8 }), columns.length)
    columns.forEach(([x, z], index) => {
      dummy.position.set(x, part.y, z); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh)
  }
  solid(group, new THREE.BoxGeometry(2.02, .2, .95), '#d8cdb2', 0, 1.497)
  solid(group, new THREE.BoxGeometry(2.16, .065, 1.05), '#f0e7d0', 0, 1.63)
  solid(group, new THREE.BoxGeometry(1.89, .12, .84), '#c8c4ad', 0, 1.722)
  solid(group, new THREE.BoxGeometry(1.99, .04, .94), '#e7dfc8', 0, 1.802)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 15; i++) solid(group, new THREE.BoxGeometry(.042, .09, .024), '#aaa990', -.91 + i * .13, 1.5, side * .487)
    const x = side * 1.245
    solid(group, new THREE.BoxGeometry(.44, .74, .81), '#dfd6bd', x, .565)
    solid(group, new THREE.BoxGeometry(.51, .055, .9), '#f0e6cc', x, .963)
    solid(group, new THREE.BoxGeometry(.47, .08, .84), '#81928b', x, 1.03)
    solid(group, new THREE.BoxGeometry(.2, .45, .028), '#71847c', x, .46, .418)
    for (const dx of [-.163, .163]) solid(group, new THREE.BoxGeometry(.04, .59, .04), '#f0e4c9', x + dx, .61, .427)
    solid(group, new THREE.BoxGeometry(.32, .04, .07), '#c3baa1', x, .744, .43)
  }
  solid(group, new THREE.BoxGeometry(.65, .13, .57), '#c7c5ae', 0, 1.883)
  solid(group, new THREE.BoxGeometry(.71, .045, .62), '#e2dfc8', 0, 1.97)

  // The four horses and chariot remain a compact bronze silhouette above the gate.
  const bronze = '#507e70', bronzeLight = '#779d87'
  solid(group, new THREE.BoxGeometry(.34, .11, .23), bronze, 0, 2.093, -.16, .35)
  for (const x of [-.2, .2]) {
    const wheel = solid(group, new THREE.TorusGeometry(.071, .014, 6, 16), bronze, x, 2.065, -.17, .35)
    wheel.rotation.y = Math.PI / 2
    solid(group, new THREE.BoxGeometry(.017, .13, .015), bronzeLight, x, 2.065, -.17, .3)
    solid(group, new THREE.BoxGeometry(.017, .015, .13), bronzeLight, x, 2.065, -.17, .3)
  }
  for (const x of [-.225, -.075, .075, .225]) {
    const body = solid(group, new THREE.IcosahedronGeometry(1, 1), bronze, x, 2.16, .115, .3)
    body.scale.set(.056, .067, .115)
    for (const dx of [-.032, .032]) for (const z of [.045, .185]) {
      const leg = solid(group, new THREE.CylinderGeometry(.011, .014, .13, 5), bronze, x + dx, 2.065, z, .3)
      leg.rotation.x = z > .1 ? -.17 : .15
    }
    const neck = solid(group, new THREE.CylinderGeometry(.027, .041, .15, 7), bronzeLight, x, 2.242, .192, .3)
    neck.rotation.x = .34
    const head = solid(group, new THREE.BoxGeometry(.049, .054, .094), bronze, x, 2.322, .225, .3)
    head.rotation.x = -.18
    for (const dx of [-.017, .017]) solid(group, new THREE.ConeGeometry(.01, .035, 4), bronzeLight, x + dx, 2.369, .2, .3)
    solid(group, new THREE.BoxGeometry(.013, .014, .3), bronze, x, 2.12, -.07, .3)
  }
  solid(group, new THREE.ConeGeometry(.058, .21, 8), bronze, 0, 2.244, -.16, .3)
  solid(group, new THREE.SphereGeometry(.037, 10, 8), bronzeLight, 0, 2.38, -.16, .3)
  const arm = solid(group, new THREE.BoxGeometry(.15, .027, .03), bronze, .055, 2.325, -.15, .3)
  arm.rotation.z = .3
  solid(group, new THREE.CylinderGeometry(.009, .012, .41, 6), bronze, .13, 2.427, -.15, .3)
  solid(group, new THREE.TorusGeometry(.049, .012, 6, 16), bronzeLight, .13, 2.647, -.15, .3)
  solid(group, new THREE.BoxGeometry(.08, .015, .02), bronzeLight, .13, 2.649, -.15, .3)
  solid(group, new THREE.BoxGeometry(.015, .08, .02), bronzeLight, .13, 2.649, -.15, .3)
  for (const x of [-1.19, 1.19]) for (const z of [-1.07, 1.07]) {
    solid(group, new RoundedBoxGeometry(.35, .06, .38, 2, .04), '#9eb294', x, .163, z)
    solid(group, new RoundedBoxGeometry(.26, .18, .29, 2, .055), '#648f74', x, .279, z)
  }
  return group
}

export function amsterdamLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#bdcbb7', 0, .04)
  solid(group, new THREE.BoxGeometry(3.02, .1, 1.94), '#cecaba', 0, .13, -.51)
  solid(group, new THREE.BoxGeometry(3.02, .025, .8), '#67afbc', 0, .103, .93)
  for (const z of [.493, 1.387]) {
    solid(group, new THREE.BoxGeometry(3.02, .095, .12), '#b29d86', 0, .156, z)
    solid(group, new THREE.BoxGeometry(3.06, .027, .14), '#e0dac6', 0, .217, z)
  }

  const windows: THREE.Vector3[] = []
  const houses = [
    { x: -1.12, height: 1.21, color: '#b76f61', gable: 'step' },
    { x: -.56, height: 1.43, color: '#657e87', gable: 'bell' },
    { x: 0, height: 1.28, color: '#e1d7bf', gable: 'triangle' },
    { x: .56, height: 1.54, color: '#8f5957', gable: 'step' },
    { x: 1.12, height: 1.22, color: '#618a79', gable: 'bell' },
  ]
  for (const house of houses) {
    const top = .18 + house.height
    solid(group, new THREE.BoxGeometry(.49, house.height, .79), house.color, house.x, .18 + house.height / 2)
    solid(group, new THREE.BoxGeometry(.505, .05, .83), '#e9e0c9', house.x, top + .015)
    const roofProfile = new THREE.Shape()
    roofProfile.moveTo(-.252, 0); roofProfile.lineTo(.252, 0); roofProfile.lineTo(0, .29); roofProfile.closePath()
    solid(group, new THREE.ExtrudeGeometry(roofProfile, { depth: .84, bevelEnabled: false }), '#526a6d', house.x, top + .04, -.435)
    const gable = new THREE.Shape()
    gable.moveTo(-.26, 0); gable.lineTo(.26, 0)
    if (house.gable === 'step') {
      gable.lineTo(.26, .075); gable.lineTo(.185, .075); gable.lineTo(.185, .17)
      gable.lineTo(.11, .17); gable.lineTo(.11, .27); gable.lineTo(.047, .27)
      gable.lineTo(.047, .36); gable.lineTo(-.047, .36); gable.lineTo(-.047, .27)
      gable.lineTo(-.11, .27); gable.lineTo(-.11, .17); gable.lineTo(-.185, .17)
      gable.lineTo(-.185, .075); gable.lineTo(-.26, .075)
    } else if (house.gable === 'bell') {
      gable.lineTo(.26, .055); gable.bezierCurveTo(.1, .055, .16, .26, .07, .3)
      gable.lineTo(.07, .345); gable.lineTo(-.07, .345); gable.lineTo(-.07, .3)
      gable.bezierCurveTo(-.16, .26, -.1, .055, -.26, .055)
    } else {
      gable.lineTo(0, .35)
    }
    gable.closePath()
    const gableGeometry = new THREE.ExtrudeGeometry(gable, { depth: .055, bevelEnabled: false, curveSegments: 10 })
    solid(group, gableGeometry, '#efe4cc', house.x, top + .015, .408)
    const face = solid(group, gableGeometry, house.color, house.x, top + .025, .424)
    face.scale.set(.85, .85, .85)
    solid(group, new THREE.BoxGeometry(.068, .103, .019), '#375d67', house.x, top + .13, .484)
    solid(group, new THREE.BoxGeometry(.025, .035, .17), '#566960', house.x, top + .3, .5)
    solid(group, new THREE.BoxGeometry(.018, .057, .022), '#566960', house.x, top + .278, .579)
    const floors = house.height > 1.35 ? 3 : 2
    for (let floor = 0; floor < floors; floor++) for (const dx of [-.115, .115]) {
      windows.push(new THREE.Vector3(house.x + dx, top - .22 - floor * .31, .407))
    }
    solid(group, new THREE.BoxGeometry(.134, .28, .033), '#eee1c2', house.x, .34, .405)
    solid(group, new THREE.BoxGeometry(.09, .233, .027), '#385e5c', house.x, .327, .436)
    solid(group, new THREE.BoxGeometry(.165, .028, .1), '#b5b8a4', house.x, .207, .429)
    for (const dx of [-.224, .224]) solid(group, new THREE.BoxGeometry(.023, house.height, .025), '#dfd2b7', house.x + dx, .18 + house.height / 2, .407)
    solid(group, new THREE.BoxGeometry(.065, .2, .08), house.color, house.x + .14, top + .23, -.26)
  }
  const dummy = new THREE.Object3D()
  for (const part of [
    { geometry: new THREE.BoxGeometry(.136, .221, .02), color: '#f1e8d1', offset: 0 },
    { geometry: new THREE.BoxGeometry(.098, .18, .022), color: '#406d7a', offset: .013 },
    { geometry: new THREE.BoxGeometry(.011, .18, .019), color: '#e5e4ce', offset: .029 },
    { geometry: new THREE.BoxGeometry(.098, .012, .019), color: '#e5e4ce', offset: .029 },
  ]) {
    const mesh = new THREE.InstancedMesh(part.geometry, new THREE.MeshStandardMaterial({ color: part.color, roughness: .65 }), windows.length)
    windows.forEach((position, index) => {
      dummy.position.copy(position); dummy.position.z += part.offset
      dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh)
  }

  const bridgeShape = new THREE.Shape()
  bridgeShape.moveTo(-.55, .22); bridgeShape.quadraticCurveTo(0, .54, .55, .22)
  bridgeShape.lineTo(.55, .16); bridgeShape.quadraticCurveTo(0, .48, -.55, .16); bridgeShape.closePath()
  const bridge = solid(group, new THREE.ExtrudeGeometry(bridgeShape, { depth: .48, bevelEnabled: false, curveSegments: 16 }), '#d7c8b0', -.24, 0, .95)
  bridge.rotation.y = Math.PI / 2
  for (const x of [-.235, .235]) {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12 * 2 - 1, y = .22 + .16 * (1 - t * t)
      points.push(new THREE.Vector3(x, y + .145, .95 + t * .55))
      if (i % 2 === 0) solid(group, new THREE.BoxGeometry(.019, .145, .019), '#506f68', x, y + .0725, .95 + t * .55)
    }
    solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, .015, 6, false), '#506f68')
  }
  const hullShape = new THREE.Shape()
  hullShape.moveTo(-.32, 0); hullShape.quadraticCurveTo(-.2, -.12, .22, -.1)
  hullShape.lineTo(.33, 0); hullShape.quadraticCurveTo(.16, .12, -.22, .1); hullShape.closePath()
  const boat = new THREE.Group(); boat.position.set(-.92, .128, .93); group.add(boat)
  const hull = solid(boat, new THREE.ExtrudeGeometry(hullShape, { depth: .07, bevelEnabled: false }), '#9b584d')
  hull.rotation.x = -Math.PI / 2
  solid(boat, new RoundedBoxGeometry(.35, .115, .143, 2, .025), '#e9e4ce', .02, .117)
  solid(boat, new THREE.BoxGeometry(.27, .067, .15), '#6296a1', .02, .127)
  solid(boat, new THREE.BoxGeometry(.36, .022, .16), '#eae6d5', .02, .178)
  for (const x of [-.055, .055]) solid(boat, new THREE.BoxGeometry(.015, .08, .156), '#f0e9d5', x, .13)
  for (const x of [-1.25, 1.25]) {
    solid(group, new THREE.BoxGeometry(.27, .055, .29), '#9db397', x, .2, -.98)
    solid(group, new THREE.CylinderGeometry(.026, .035, .24, 6), '#9e9679', x, .34, -.98)
    const crown = solid(group, new THREE.IcosahedronGeometry(.16, 1), '#6c9778', x, .55, -.98)
    crown.scale.y = 1.2
  }
  return group
}

export function barcelonaLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#c0cdb5', 0, .04)
  solid(group, new RoundedBoxGeometry(2.91, .05, 2.94, 2, .08), '#ded9c6', 0, .105)
  solid(group, new THREE.BoxGeometry(2.08, .095, 2.13), '#c3bba2', 0, .178)
  solid(group, new THREE.BoxGeometry(1.23, .69, 1.7), '#d9c8a5', 0, .57)
  solid(group, new THREE.BoxGeometry(1.87, .65, .6), '#e5d3af', 0, .55)
  const roofProfile = new THREE.Shape()
  roofProfile.moveTo(-.67, 0); roofProfile.lineTo(.67, 0); roofProfile.lineTo(0, .36); roofProfile.closePath()
  solid(group, new THREE.ExtrudeGeometry(roofProfile, { depth: 1.77, bevelEnabled: false }), '#a9a893', 0, .914, -.885)

  const portal = new THREE.Shape()
  portal.moveTo(-.135, 0); portal.lineTo(.135, 0); portal.lineTo(.135, .26)
  portal.quadraticCurveTo(.1, .39, 0, .48); portal.quadraticCurveTo(-.1, .39, -.135, .26); portal.closePath()
  const portalGeometry = new THREE.ExtrudeGeometry(portal, { depth: .028, bevelEnabled: false, curveSegments: 10 })
  const frontProfile = new THREE.Shape()
  frontProfile.moveTo(-.64, 0); frontProfile.lineTo(.64, 0); frontProfile.lineTo(.64, .49)
  frontProfile.lineTo(0, 1.06); frontProfile.lineTo(-.64, .49); frontProfile.closePath()
  solid(group, new THREE.ExtrudeGeometry(frontProfile, { depth: .09, bevelEnabled: false }), '#e7d7b5', 0, .23, .849)
  for (const x of [-.36, 0, .36]) {
    const surround = solid(group, portalGeometry, '#c2ae8b', x, .235, .94)
    surround.scale.set(1.13, x === 0 ? 1.16 : .98, 1)
    const door = solid(group, portalGeometry, '#597469', x, .247, .972)
    door.scale.set(.77, x === 0 ? .98 : .8, 1)
  }
  solid(group, new THREE.TorusGeometry(.15, .026, 8, 24), '#c6b48e', 0, .936, .968)
  solid(group, new THREE.CircleGeometry(.13, 24), '#699ca6', 0, .936, .974)
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2
    const petal = solid(group, new THREE.CircleGeometry(.033, 8), i % 2 ? '#d39b72' : '#b3cfb4', Math.sin(angle) * .081, .936 + Math.cos(angle) * .081, .98)
    petal.scale.y = 1.4; petal.rotation.z = -angle
  }
  solid(group, new THREE.CircleGeometry(.029, 12), '#e9dcb2', 0, .936, .987)
  for (const x of [-.59, -.2, .2, .59]) {
    solid(group, new THREE.BoxGeometry(.04, .57, .085), '#eadcbd', x, .545, .962)
    solid(group, new THREE.ConeGeometry(.051, .2, 6), '#d7c29a', x, .929, .963)
  }

  const slits: { x: number; y: number; z: number; angle: number; height: number }[] = []
  const tower = (x: number, z: number, base: number, height: number, radius: number, crown: string) => {
    const profile = [[1.12, 0], [1.05, .12], [.68, .65], [.42, .86], [.28, .94], [.06, 1]] as const
    const points = profile.map(([r, y]) => new THREE.Vector2(radius * r, height * y))
    solid(group, new THREE.LatheGeometry(points, 16), '#decca7', x, base, z)
    solid(group, new THREE.CylinderGeometry(radius * 1.13, radius * 1.17, .055, 16), '#ece0be', x, base + .04, z)
    for (const fraction of [.24, .37, .5, .63, .75]) {
      const section = fraction <= .65 ? 1 : 2
      const [r0, y0] = profile[section]!, [r1, y1] = profile[section + 1]!
      const r = radius * (r0 + (r1 - r0) * (fraction - y0) / (y1 - y0))
      for (let slit = 0; slit < 8; slit++) {
        const angle = slit / 8 * Math.PI * 2
        slits.push({ x: x + Math.sin(angle) * (r + .002), y: base + height * fraction, z: z + Math.cos(angle) * (r + .002), angle, height: height * .072 })
      }
    }
    if (crown === 'cross') {
      solid(group, new THREE.CylinderGeometry(.026, .036, .24, 8), '#efe6cf', x, base + height + .095, z)
      solid(group, new THREE.BoxGeometry(.19, .035, .04), '#efe6cf', x, base + height + .145, z)
      solid(group, new THREE.BoxGeometry(.04, .035, .19), '#efe6cf', x, base + height + .145, z)
    } else if (crown === 'star') {
      const star = new THREE.Shape()
      for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2, r = i % 2 ? .044 : .11
        if (i === 0) star.moveTo(Math.sin(angle) * r, Math.cos(angle) * r)
        else star.lineTo(Math.sin(angle) * r, Math.cos(angle) * r)
      }
      star.closePath()
      solid(group, new THREE.ExtrudeGeometry(star, { depth: .035, bevelEnabled: false }), '#d4e8dc', x, base + height + .055, z - .0175)
    } else {
      solid(group, new THREE.CylinderGeometry(.023, .04, .1, 8), '#e8dfbf', x, base + height + .035, z)
      solid(group, new THREE.OctahedronGeometry(.075), crown, x, base + height + .13, z)
      solid(group, new THREE.ConeGeometry(.021, .06, 6), '#e8d195', x, base + height + .225, z)
    }
  }
  for (const x of [-.74, -.25, .25, .74]) tower(x, .62, .51, Math.abs(x) < .5 ? 1.82 : 1.54, .155, x < 0 ? '#83a895' : '#c59c68')
  for (const x of [-.72, .72]) {
    tower(x, -.67, .51, 1.52, .15, '#b28185')
    tower(x, -.09, .75, 1.69, .145, '#84a69a')
  }
  tower(0, -.67, .89, 1.7, .18, 'star')
  tower(0, 0, 1.035, 2.12, .245, 'cross')
  const slitMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.026, 1, .018), new THREE.MeshStandardMaterial({ color: '#7e8272', roughness: .85 }), slits.length)
  const dummy = new THREE.Object3D()
  slits.forEach((slit, index) => {
    dummy.position.set(slit.x, slit.y, slit.z); dummy.rotation.y = slit.angle; dummy.scale.set(1, slit.height, 1)
    dummy.updateMatrix(); slitMesh.setMatrixAt(index, dummy.matrix)
  })
  slitMesh.castShadow = slitMesh.receiveShadow = true; group.add(slitMesh)
  for (const side of [-1, 1]) for (const z of [-.65, -.3, .1]) {
    const glass = solid(group, portalGeometry, z < 0 ? '#749c9b' : '#b88e78', side * .624, .31, z)
    glass.rotation.y = side * Math.PI / 2; glass.scale.set(.6, .85, 1)
    solid(group, new THREE.BoxGeometry(.065, .58, .065), '#eadbb8', side * .672, .515, z - .125)
  }
  for (let step = 0; step < 3; step++) solid(group, new THREE.BoxGeometry(1.37, .035, .15), '#e7dcc1', 0, .145 + step * .035, 1.29 - step * .12)
  for (const x of [-1.24, 1.24]) for (const z of [-1.15, .98]) {
    solid(group, new THREE.CylinderGeometry(.027, .035, .22, 6), '#a39c7f', x, .25, z)
    const crown = solid(group, new THREE.IcosahedronGeometry(.17, 1), '#719779', x, .45, z)
    crown.scale.y = 1.1
  }
  return group
}

export function parisLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#b5c8ac', 0, .04)
  solid(group, new THREE.BoxGeometry(2.98, .035, 2.98), '#dfe0ce', 0, .098)
  solid(group, new THREE.BoxGeometry(.55, .016, 2.96), '#efe9d6', 0, .125)
  solid(group, new THREE.BoxGeometry(2.96, .016, .55), '#efe9d6', 0, .126)
  for (const x of [-.96, .96]) for (const z of [-.96, .96]) solid(group, new THREE.BoxGeometry(.37, .12, .37), '#b6b8a2', x, .185, z)

  const beams: { start: THREE.Vector3; end: THREE.Vector3; radius: number; trim: boolean }[] = []
  const member = (start: THREE.Vector3, end: THREE.Vector3, radius: number, trim = false) => beams.push({ start, end, radius, trim })
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const
  const lower = [{ y: .245, radius: .96, half: .1 }, { y: .52, radius: .79, half: .085 }, { y: .83, radius: .61, half: .07 }, { y: 1.13, radius: .49, half: .06 }]
  // Each curved foot is an individual truss, leaving the four entrance arches open.
  for (const [cx, cz] of corners) for (let stage = 0; stage < lower.length - 1; stage++) {
    const bottom = lower[stage]!, top = lower[stage + 1]!
    const point = (level: typeof bottom, corner: readonly [number, number]) => new THREE.Vector3(cx * level.radius + corner[0] * level.half, level.y, cz * level.radius + corner[1] * level.half)
    for (let side = 0; side < 4; side++) {
      const a = point(bottom, corners[side]!), b = point(top, corners[side]!)
      const c = point(bottom, corners[(side + 1) % 4]!), d = point(top, corners[(side + 1) % 4]!)
      member(a, b, .031); member(a, d, .012, true); member(c, b, .012, true); member(b, d, .016)
    }
  }
  const upper = [{ y: 1.13, radius: .49 }, { y: 1.41, radius: .37 }, { y: 1.69, radius: .28 }, { y: 2.02, radius: .21 }, { y: 2.35, radius: .157 }, { y: 2.66, radius: .116 }, { y: 2.96, radius: .083 }]
  for (let stage = 0; stage < upper.length - 1; stage++) {
    const bottom = upper[stage]!, top = upper[stage + 1]!
    for (let side = 0; side < 4; side++) {
      const [x, z] = corners[side]!, [nx, nz] = corners[(side + 1) % 4]!
      const a = new THREE.Vector3(x * bottom.radius, bottom.y, z * bottom.radius)
      const b = new THREE.Vector3(x * top.radius, top.y, z * top.radius)
      const c = new THREE.Vector3(nx * bottom.radius, bottom.y, nz * bottom.radius)
      const d = new THREE.Vector3(nx * top.radius, top.y, nz * top.radius)
      member(a, b, stage < 2 ? .029 : .022)
      member(a, d, .014, true); member(c, b, .014, true); member(b, d, .019)
    }
  }
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), beamGeometry = new THREE.CylinderGeometry(1, 1, 1, 6)
  for (const trim of [false, true]) {
    const members = beams.filter((beam) => beam.trim === trim)
    const mesh = new THREE.InstancedMesh(beamGeometry, new THREE.MeshStandardMaterial({ color: trim ? '#b6a385' : '#8b806b', roughness: .6, metalness: .25 }), members.length)
    members.forEach((beam, index) => {
      const direction = beam.end.clone().sub(beam.start), length = direction.length()
      dummy.position.copy(beam.start).add(beam.end).multiplyScalar(.5)
      dummy.quaternion.setFromUnitVectors(up, direction.normalize()); dummy.scale.set(beam.radius, length, beam.radius)
      dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix)
    })
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh)
  }
  for (let side = 0; side < 4; side++) {
    const arch = new THREE.Group(); arch.rotation.y = side * Math.PI / 2; group.add(arch)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.88, .31, .92), new THREE.Vector3(-.66, .67, .74),
      new THREE.Vector3(-.34, .94, .56), new THREE.Vector3(0, 1.015, .53),
      new THREE.Vector3(.34, .94, .56), new THREE.Vector3(.66, .67, .74), new THREE.Vector3(.88, .31, .92),
    ])
    solid(arch, new THREE.TubeGeometry(curve, 28, .035, 7, false), '#9d8d72', 0, 0, 0, .25)
  }
  for (const [y, width] of [[1.15, 1.29], [1.71, .84]] as const) {
    solid(group, new THREE.BoxGeometry(width, .075, width), '#968a72', 0, y, 0, .25)
    solid(group, new THREE.BoxGeometry(width + .045, .025, width + .045), '#c1b093', 0, y + .05, 0, .2)
    for (const side of [-1, 1]) {
      solid(group, new THREE.BoxGeometry(width, .016, .018), '#8d8875', 0, y + .137, side * width / 2)
      solid(group, new THREE.BoxGeometry(.018, .016, width), '#8d8875', side * width / 2, y + .137)
      for (let i = 0; i <= 6; i++) {
        const offset = -width / 2 + i * width / 6
        solid(group, new THREE.BoxGeometry(.012, .08, .012), '#a89b7e', offset, y + .092, side * width / 2)
        solid(group, new THREE.BoxGeometry(.012, .08, .012), '#a89b7e', side * width / 2, y + .092, offset)
      }
    }
  }
  solid(group, new THREE.BoxGeometry(.285, .12, .285), '#a69b80', 0, 2.98)
  for (const side of [-1, 1]) {
    solid(group, new THREE.BoxGeometry(.21, .055, .012), '#65858a', 0, 2.995, side * .15)
    solid(group, new THREE.BoxGeometry(.012, .055, .21), '#65858a', side * .15, 2.995)
  }
  solid(group, new THREE.CylinderGeometry(.053, .15, .14, 4, 1, false, Math.PI / 4), '#9b8d74', 0, 3.115)
  solid(group, new THREE.CylinderGeometry(.017, .034, .3, 8), '#b3a183', 0, 3.31)
  solid(group, new THREE.ConeGeometry(.017, .13, 6), '#d0bea0', 0, 3.525)
  for (const x of [-1.23, 1.23]) for (const z of [-1.18, 1.18]) {
    solid(group, new RoundedBoxGeometry(.38, .05, .43, 2, .055), '#81a47c', x, .145, z)
    solid(group, new THREE.CylinderGeometry(.027, .035, .22, 6), '#a59879', x, .28, z)
    const tree = solid(group, new THREE.IcosahedronGeometry(.145, 1), '#639171', x, .47, z)
    tree.scale.y = 1.3
  }
  return group
}

export function londonLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#c0cbb7', 0, .04)
  solid(group, new THREE.BoxGeometry(2.99, .045, 2.93), '#d9d8c6', 0, .105)
  solid(group, new THREE.BoxGeometry(2.84, .1, 1.2), '#c4bfa6', 0, .178)
  solid(group, new THREE.BoxGeometry(.67, 1.68, .67), '#d8c19a', 0, 1.065)
  const archShape = new THREE.Shape()
  archShape.moveTo(-.065, 0); archShape.lineTo(.065, 0); archShape.lineTo(.065, .21)
  archShape.quadraticCurveTo(.05, .285, 0, .325); archShape.quadraticCurveTo(-.05, .285, -.065, .21); archShape.closePath()
  const archGeometry = new THREE.ExtrudeGeometry(archShape, { depth: .016, bevelEnabled: false, curveSegments: 8 })
  for (let side = 0; side < 4; side++) {
    const facade = new THREE.Group(); facade.rotation.y = side * Math.PI / 2; group.add(facade)
    for (const y of [.51, .96, 1.41]) {
      for (const x of [-.14, .14]) {
        solid(facade, archGeometry, '#637a75', x, y, .342)
        solid(facade, new THREE.BoxGeometry(.014, .28, .023), '#ead9b4', x, y + .12, .364)
        solid(facade, new THREE.BoxGeometry(.17, .028, .038), '#efe0bf', x, y - .016, .354)
      }
    }
    for (const x of [-.291, 0, .291]) solid(facade, new THREE.BoxGeometry(.033, 1.61, .038), '#ecdbb7', x, 1.075, .351)
  }
  for (const y of [.43, .91, 1.365, 1.83]) solid(group, new THREE.BoxGeometry(.73, .045, .73), '#ead9b6', 0, y)
  solid(group, new THREE.BoxGeometry(.77, .55, .77), '#d0b58b', 0, 2.125)
  solid(group, new THREE.BoxGeometry(.83, .055, .83), '#f0e1c1', 0, 1.88)
  solid(group, new THREE.BoxGeometry(.84, .07, .84), '#eee0bf', 0, 2.43)
  for (let side = 0; side < 4; side++) {
    const clock = new THREE.Group(); clock.rotation.y = side * Math.PI / 2; group.add(clock)
    solid(clock, new THREE.TorusGeometry(.244, .025, 8, 32), '#b1996d', 0, 2.135, .402)
    solid(clock, new THREE.CircleGeometry(.219, 32), '#fbf5dd', 0, 2.135, .407)
    solid(clock, new THREE.TorusGeometry(.169, .006, 5, 32), '#c8c7ae', 0, 2.135, .419)
    for (let hour = 0; hour < 12; hour++) {
      const angle = hour / 12 * Math.PI * 2
      const tick = solid(clock, new THREE.BoxGeometry(.015, hour % 3 === 0 ? .044 : .028, .009), '#536761', Math.sin(angle) * .194, 2.135 + Math.cos(angle) * .194, .42)
      tick.rotation.z = -angle
    }
    for (const [angle, length, width] of [[Math.PI / 3, .153, .012], [-Math.PI / 3, .115, .018]] as const) {
      const hand = solid(clock, new THREE.BoxGeometry(width, length, .013), '#42645f', Math.sin(angle) * length / 2, 2.135 + Math.cos(angle) * length / 2, .436)
      hand.rotation.z = -angle
    }
    solid(clock, new THREE.CircleGeometry(.02, 12), '#b49b69', 0, 2.135, .447)
  }
  for (const x of [-.36, .36]) for (const z of [-.36, .36]) {
    solid(group, new THREE.BoxGeometry(.058, .49, .058), '#ecdbb7', x, 2.15, z)
    solid(group, new THREE.CylinderGeometry(.035, .049, .24, 8), '#dcc49a', x, 2.571, z)
    solid(group, new THREE.ConeGeometry(.055, .19, 8), '#70847b', x, 2.781, z)
  }
  solid(group, new THREE.BoxGeometry(.53, .32, .53), '#65766f', 0, 2.625)
  for (let side = 0; side < 4; side++) {
    const belfry = new THREE.Group(); belfry.rotation.y = side * Math.PI / 2; group.add(belfry)
    for (const x of [-.18, -.06, .06, .18]) solid(belfry, new THREE.BoxGeometry(.028, .3, .025), '#d6c29c', x, 2.63, .278)
    for (const y of [2.54, 2.61, 2.68]) solid(belfry, new THREE.BoxGeometry(.46, .018, .025), '#9ca68f', 0, y, .277)
  }
  solid(group, new THREE.BoxGeometry(.6, .045, .6), '#ddcda9', 0, 2.805)
  solid(group, new THREE.CylinderGeometry(.083, .435, .43, 4, 1, false, Math.PI / 4), '#60766f', 0, 3.043)
  solid(group, new THREE.BoxGeometry(.15, .055, .15), '#d9c394', 0, 3.285)
  solid(group, new THREE.ConeGeometry(.078, .22, 4, 1, false, Math.PI / 4), '#71877a', 0, 3.422)
  solid(group, new THREE.ConeGeometry(.012, .12, 6), '#d1b87e', 0, 3.59)

  const wingRoof = new THREE.Shape()
  wingRoof.moveTo(-.35, 0); wingRoof.lineTo(.35, 0); wingRoof.lineTo(0, .23); wingRoof.closePath()
  for (const x of [-.89, .89]) {
    solid(group, new THREE.BoxGeometry(.99, .63, .65), '#d9c49d', x, .544)
    solid(group, new THREE.BoxGeometry(1.03, .045, .73), '#eedfbc', x, .88)
    const roof = solid(group, new THREE.ExtrudeGeometry(wingRoof, { depth: 1.025, bevelEnabled: false }), '#6e8075', x - .5125, .906)
    roof.rotation.y = Math.PI / 2
    for (const dx of [-.35, -.115, .115, .35]) {
      solid(group, archGeometry, '#62817d', x + dx, .367, .336)
      solid(group, new THREE.BoxGeometry(.021, .28, .018), '#ecdcb7', x + dx, .495, .362)
    }
    for (const dx of [-.468, -.235, 0, .235, .468]) {
      solid(group, new THREE.BoxGeometry(.036, .6, .045), '#eee0bd', x + dx, .572, .35)
      solid(group, new THREE.ConeGeometry(.047, .18, 5), '#d1bd94', x + dx, .989, .35)
    }
  }
  solid(group, new THREE.BoxGeometry(2.89, .022, .39), '#7bb7c0', 0, .129, 1.19)
  for (const z of [.952, 1.431]) solid(group, new THREE.BoxGeometry(2.93, .045, .075), '#d0ceb8', 0, .154, z)
  for (const x of [-1.09, 1.09]) {
    solid(group, new RoundedBoxGeometry(.53, .055, .51, 2, .055), '#89a68a', x, .156, -.99)
    solid(group, new RoundedBoxGeometry(.42, .13, .4, 2, .06), '#659273', x, .249, -.99)
  }
  for (let step = 0; step < 3; step++) solid(group, new THREE.BoxGeometry(.7, .027, .11), '#e7dbbb', 0, .145 + step * .027, .765 - step * .085)
  return group
}

export function torontoLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#bccdb7', 0, .04)
  solid(group, new RoundedBoxGeometry(2.99, .04, 2.99, 2, .09), '#dce0d4', 0, .1)
  solid(group, new THREE.CylinderGeometry(.51, .59, .12, 24), '#b6c6c0', 0, .186)
  solid(group, new THREE.CylinderGeometry(.105, .18, 1.83, 16), '#e4e6dd', 0, 1.16)
  const finProfile = new THREE.Shape()
  finProfile.moveTo(.095, 0); finProfile.lineTo(.39, 0); finProfile.lineTo(.13, 1.83); finProfile.lineTo(.065, 1.83); finProfile.closePath()
  const finGeometry = new THREE.ExtrudeGeometry(finProfile, { depth: .115, bevelEnabled: false }).translate(0, 0, -.0575)
  for (let fin = 0; fin < 3; fin++) {
    const rib = solid(group, finGeometry, fin === 0 ? '#d1d9d2' : '#e9e9de', 0, .246)
    rib.rotation.y = fin * Math.PI * 2 / 3 - Math.PI / 6
  }
  const elevator = solid(group, new THREE.BoxGeometry(.034, 1.76, .014), '#7babb5', 0, 1.177, .146)
  elevator.rotation.x = -.041
  solid(group, new THREE.CylinderGeometry(.365, .13, .21, 24), '#b9c9c8', 0, 2.071)
  solid(group, new THREE.CylinderGeometry(.43, .385, .085, 32), '#e3e8df', 0, 2.217)
  solid(group, new THREE.CylinderGeometry(.42, .42, .17, 32), '#6899ab', 0, 2.344, 0, .22)
  solid(group, new THREE.CylinderGeometry(.446, .446, .045, 32), '#e7e8dc', 0, 2.451)
  solid(group, new THREE.CylinderGeometry(.25, .425, .11, 32), '#bdcecd', 0, 2.528)
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2
    solid(group, new THREE.CylinderGeometry(.009, .009, .17, 5), '#e1e7dc', Math.sin(angle) * .423, 2.344, Math.cos(angle) * .423)
  }
  solid(group, new THREE.CylinderGeometry(.058, .115, .4, 16), '#e0e6df', 0, 2.747)
  solid(group, new THREE.CylinderGeometry(.123, .095, .065, 20), '#e5e8dd', 0, 2.965)
  solid(group, new THREE.CylinderGeometry(.117, .117, .065, 20), '#7696a0', 0, 3.03)
  solid(group, new THREE.CylinderGeometry(.059, .128, .07, 20), '#e6e8dd', 0, 3.098)
  for (let band = 0; band < 5; band++) {
    solid(group, new THREE.CylinderGeometry(.034 - band * .0045, .038 - band * .0045, .087, 10), band % 2 === 0 ? '#c87470' : '#eeeadd', 0, 3.176 + band * .087)
  }
  solid(group, new THREE.ConeGeometry(.015, .13, 8), '#e3e4d7', 0, 3.633)

  const stadium = new THREE.Group(); stadium.position.set(.83, 0, -.83); group.add(stadium)
  const stand = solid(stadium, new THREE.CylinderGeometry(.62, .65, .2, 32), '#a3b8b8', 0, .221)
  stand.scale.z = .69
  const rim = solid(stadium, new THREE.CylinderGeometry(.64, .64, .035, 32), '#e8eae1', 0, .338)
  rim.scale.z = .69
  const roof = solid(stadium, new THREE.SphereGeometry(.62, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#e6e9df', 0, .355)
  roof.scale.set(1, .45, .69)
  for (const u of [-.46, 0, .46]) {
    const span = Math.sqrt(1 - u * u), points: THREE.Vector3[] = []
    for (let i = 0; i <= 16; i++) {
      const angle = i / 16 * Math.PI
      points.push(new THREE.Vector3(u * .62, .36 + Math.sin(angle) * span * .279, Math.cos(angle) * span * .428))
    }
    solid(stadium, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, .009, 5, false), '#becdca')
  }
  for (let i = 0; i < 7; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 6
    const window = solid(stadium, new THREE.BoxGeometry(.1, .067, .024), '#527e89', Math.sin(angle) * .627, .227, Math.cos(angle) * .434)
    window.rotation.y = Math.atan2(Math.sin(angle) * .69, Math.cos(angle))
  }
  solid(group, new THREE.BoxGeometry(.39, .023, .83), '#eef0e3', 0, .139, .989)
  for (const x of [-.84, .84]) {
    solid(group, new RoundedBoxGeometry(.69, .055, .42, 2, .055), '#89ab8d', x, .158, 1.02)
    for (const dx of [-.22, .22]) {
      solid(group, new THREE.CylinderGeometry(.022, .031, .19, 6), '#9d987d', x + dx, .28, 1.02)
      solid(group, new THREE.IcosahedronGeometry(.13, 1), '#709679', x + dx, .446, 1.02)
    }
  }
  solid(group, new THREE.BoxGeometry(.27, .035, .09), '#9dafa5', -1.13, .194, -.32)
  solid(group, new THREE.CylinderGeometry(.012, .017, .68, 6), '#acbcb4', -1.13, .515, -.32)
  solid(group, new THREE.BoxGeometry(.21, .135, .014), '#f1eee2', -1.025, .775, -.32)
  for (const x of [-1.11, -.94]) solid(group, new THREE.BoxGeometry(.038, .135, .017), '#c26d68', x, .775, -.32)
  const maple = new THREE.Shape()
  maple.moveTo(0, .045); maple.lineTo(.012, .017); maple.lineTo(.028, .027)
  maple.lineTo(.022, .004); maple.lineTo(.041, .007); maple.lineTo(.024, -.018)
  maple.lineTo(.007, -.023); maple.lineTo(.004, -.038); maple.lineTo(-.004, -.038)
  maple.lineTo(-.007, -.023); maple.lineTo(-.024, -.018); maple.lineTo(-.041, .007)
  maple.lineTo(-.022, .004); maple.lineTo(-.028, .027); maple.lineTo(-.012, .017); maple.closePath()
  solid(group, new THREE.ExtrudeGeometry(maple, { depth: .018, bevelEnabled: false }), '#c26d68', -1.025, .775, -.329)
  return group
}

export function newYorkLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#76b5bf', 0, .04)
  const island = new THREE.Shape()
  for (let i = 0; i < 20; i++) {
    const angle = i / 20 * Math.PI * 2, radius = i % 2 ? 1.04 : 1.43
    const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius
    if (i === 0) island.moveTo(x, z); else island.lineTo(x, z)
  }
  island.closePath()
  const fort = solid(group, new THREE.ExtrudeGeometry(island, { depth: .11, bevelEnabled: false }), '#c4c9b0', 0, .09)
  fort.rotation.x = -Math.PI / 2
  solid(group, new THREE.CylinderGeometry(.87, .99, .045, 10), '#91ad8b', 0, .223)
  solid(group, new THREE.BoxGeometry(1.13, .13, 1.13), '#d4c8ad', 0, .308)
  solid(group, new THREE.BoxGeometry(.93, .08, .93), '#e7dbc0', 0, .413)
  solid(group, new THREE.BoxGeometry(.71, .43, .71), '#c5b89b', 0, .668)
  solid(group, new THREE.BoxGeometry(.83, .075, .83), '#ecdfc0', 0, .92)
  solid(group, new THREE.BoxGeometry(.71, .04, .71), '#a6ad91', 0, .978)
  for (let side = 0; side < 4; side++) {
    const wall = new THREE.Group(); wall.rotation.y = side * Math.PI / 2; group.add(wall)
    for (const x of [-.23, 0, .23]) {
      solid(wall, new THREE.BoxGeometry(.102, .19, .018), '#a1947b', x, .699, .363)
      solid(wall, new THREE.BoxGeometry(.14, .026, .028), '#e1d2b3', x, .816, .367)
    }
  }
  const bronze = '#6caa94', shade = '#518c7d', highlight = '#94bca0'
  const robe = [[.315, 0], [.32, .055], [.26, .31], [.18, .55], [.215, .7], [.17, .84]] as const
  solid(group, new THREE.LatheGeometry(robe.map(([r, y]) => new THREE.Vector2(r, y)), 16), bronze, 0, 1)
  solid(group, new RoundedBoxGeometry(.4, .19, .27, 2, .055), bronze, 0, 1.792)
  for (let fold = 0; fold < 9; fold++) {
    const angle = fold / 9 * Math.PI * 2
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.sin(angle) * .311, 1.04, Math.cos(angle) * .311),
      new THREE.Vector3(Math.sin(angle + .12) * .245, 1.33, Math.cos(angle + .12) * .245),
      new THREE.Vector3(Math.sin(angle + .22) * .181, 1.61, Math.cos(angle + .22) * .181),
      new THREE.Vector3(Math.sin(angle + .25) * .174, 1.81, Math.cos(angle + .25) * .174),
    ])
    solid(group, new THREE.TubeGeometry(curve, 15, .012, 5, false), fold % 2 ? highlight : shade)
  }
  solid(group, new THREE.CylinderGeometry(.052, .065, .11, 10), bronze, 0, 1.933)
  const head = solid(group, new THREE.IcosahedronGeometry(.113, 1), bronze, 0, 2.069, .017)
  head.scale.set(.87, 1.17, .88)
  solid(group, new THREE.BoxGeometry(.028, .044, .035), highlight, 0, 2.057, .122)
  const crown = solid(group, new THREE.TorusGeometry(.101, .023, 6, 16), shade, 0, 2.138, .012)
  crown.rotation.x = Math.PI / 2
  const up = new THREE.Vector3(0, 1, 0)
  for (let ray = 0; ray < 7; ray++) {
    const angle = (ray - 3) * Math.PI / 8, direction = new THREE.Vector3(Math.sin(angle), Math.cos(angle), 0)
    const spike = solid(group, new THREE.ConeGeometry(.018, .15, 5), highlight, direction.x * .155, 2.125 + direction.y * .155, .014)
    spike.quaternion.setFromUnitVectors(up, direction)
  }
  const limb = (start: THREE.Vector3, end: THREE.Vector3, radius: number) => {
    const direction = end.clone().sub(start), center = start.clone().add(end).multiplyScalar(.5)
    const arm = solid(group, new THREE.CylinderGeometry(radius * .78, radius, direction.length(), 9), bronze, center.x, center.y, center.z)
    arm.quaternion.setFromUnitVectors(up, direction.normalize())
  }
  limb(new THREE.Vector3(-.16, 1.8, 0), new THREE.Vector3(-.36, 2.055, .015), .072)
  limb(new THREE.Vector3(-.36, 2.055, .015), new THREE.Vector3(-.475, 2.403, .025), .048)
  solid(group, new THREE.SphereGeometry(.053, 10, 8), highlight, -.475, 2.405, .025)
  solid(group, new THREE.CylinderGeometry(.024, .035, .16, 10), '#78a68c', -.475, 2.504, .025)
  solid(group, new THREE.CylinderGeometry(.093, .042, .077, 12), '#c9aa69', -.475, 2.618, .025, .3)
  const flame = solid(group, new THREE.IcosahedronGeometry(.095, 1), '#e0b35e', -.475, 2.75, .025, .25)
  flame.scale.set(.65, 1.35, .65)
  solid(group, new THREE.ConeGeometry(.035, .11, 6), '#f0cf7e', -.487, 2.884, .025)
  limb(new THREE.Vector3(.18, 1.8, 0), new THREE.Vector3(.32, 1.612, .14), .065)
  limb(new THREE.Vector3(.32, 1.612, .14), new THREE.Vector3(.225, 1.718, .255), .05)
  const tablet = solid(group, new THREE.BoxGeometry(.19, .285, .053), shade, .26, 1.655, .258)
  tablet.rotation.z = -.21
  for (const y of [-.04, .015, .07]) solid(tablet, new THREE.BoxGeometry(.115, .012, .008), '#97b8a0', 0, y, .03)
  for (let step = 0; step < 4; step++) solid(group, new THREE.BoxGeometry(.54, .037, .12), '#dcd1b4', 0, .15 + step * .037, 1.13 - step * .11)
  for (const x of [-1.21, 1.21]) solid(group, new THREE.BoxGeometry(.24, .012, .02), '#b5dde0', x, .091, .91)
  return group
}

export function losAngelesLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#b9cbb0', 0, .04)
  solid(group, new RoundedBoxGeometry(2.98, .16, 2.9, 2, .15), '#a5b894', 0, .16)
  solid(group, new THREE.BoxGeometry(2.81, .045, 1.69), '#e2dcc6', 0, .263)
  solid(group, new THREE.BoxGeometry(2.57, .5, .86), '#eee2c3', 0, .535)
  solid(group, new THREE.BoxGeometry(2.66, .055, .95), '#d5c9ad', 0, .813)
  solid(group, new THREE.BoxGeometry(.96, .74, 1.12), '#f0e5c7', 0, .656)
  solid(group, new THREE.BoxGeometry(1.06, .075, 1.22), '#ddd1b3', 0, 1.063)
  const dome = (x: number, y: number, radius: number) => {
    solid(group, new THREE.CylinderGeometry(radius, radius, .13, 24), '#bbc5b3', x, y)
    solid(group, new THREE.CylinderGeometry(radius * 1.07, radius * 1.07, .037, 24), '#e6ddc3', x, y - .072)
    const roof = solid(group, new THREE.SphereGeometry(radius, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), '#769d91', x, y + .065, 0, .25)
    roof.scale.y = .84
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 20; i++) {
      const angle = i / 20 * Math.PI
      points.push(new THREE.Vector3(x, y + .07 + Math.sin(angle) * radius * .84, Math.cos(angle) * radius))
    }
    solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, .016, 6, false), '#4f786f')
  }
  dome(0, 1.17, .455)
  for (const x of [-1.035, 1.035]) dome(x, .948, .29)
  for (const x of [-.24, 0, .24]) {
    solid(group, new THREE.BoxGeometry(.143, .41, .026), '#627f78', x, .492, .573)
    solid(group, new THREE.BoxGeometry(.035, .51, .055), '#d4c6a6', x - .09, .553, .59)
  }
  solid(group, new THREE.BoxGeometry(.78, .065, .22), '#f3e8ce', 0, .852, .608)
  for (const x of [-1.15, -.91, -.65, .65, .91, 1.15]) {
    solid(group, new THREE.BoxGeometry(.12, .22, .025), '#6a928c', x, .553, .444)
    solid(group, new THREE.BoxGeometry(.158, .023, .038), '#f7edd3', x, .68, .449)
  }
  for (const x of [-.39, .39]) {
    solid(group, new THREE.BoxGeometry(.047, .65, .045), '#d2c4a4', x, .713, .58)
    solid(group, new THREE.BoxGeometry(.07, .047, .072), '#e7dab9', x, 1.02, .588)
  }
  for (let step = 0; step < 3; step++) solid(group, new THREE.BoxGeometry(1.06, .03, .14), '#daceb0', 0, .249 + step * .03, .907 - step * .1)
  solid(group, new THREE.BoxGeometry(.32, .028, .51), '#ede6d0', 0, .255, 1.181)
  solid(group, new THREE.CylinderGeometry(.14, .2, .07, 8), '#dad8bd', 0, .295, 1.166)
  solid(group, new THREE.CylinderGeometry(.043, .075, .37, 6), '#ece5cd', 0, .513, 1.166)
  solid(group, new THREE.ConeGeometry(.047, .12, 6), '#ced2b8', 0, .758, 1.166)
  for (const x of [-1.27, 1.27]) for (const z of [-1.12, 1.11]) {
    solid(group, new THREE.CylinderGeometry(.022, .034, .46, 7), '#a79673', x, .473, z)
    for (let leaf = 0; leaf < 6; leaf++) {
      const angle = leaf / 6 * Math.PI * 2
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, .715, z),
        new THREE.Vector3(x + Math.sin(angle) * .12, .771, z + Math.cos(angle) * .12),
        new THREE.Vector3(x + Math.sin(angle) * .22, .673, z + Math.cos(angle) * .22),
      ])
      solid(group, new THREE.TubeGeometry(curve, 8, .022, 5, false), leaf % 2 ? '#72996c' : '#538b70')
    }
  }
  return group
}

export function sanFranciscoLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#76b9c5', 0, .04)
  const red = '#c86452', trim = '#e28a6a'
  for (const x of [-1.32, 1.32]) {
    const shore = solid(group, new THREE.CylinderGeometry(.4, .46, .16, 8), '#9cb093', x, .154)
    shore.scale.z = 1.6
    solid(group, new THREE.BoxGeometry(.27, .37, .58), '#b9c2b5', x, .397)
  }
  solid(group, new THREE.BoxGeometry(3.02, .087, .58), red, 0, .591)
  solid(group, new THREE.BoxGeometry(3.015, .024, .46), '#77888a', 0, .647)
  for (let i = 0; i < 13; i++) solid(group, new THREE.BoxGeometry(.1, .008, .013), '#ece5c9', -1.38 + i * .23, .664)
  for (const z of [-.291, .291]) solid(group, new THREE.BoxGeometry(3.02, .032, .027), trim, 0, .705, z)
  for (const x of [-.73, .73]) {
    solid(group, new THREE.BoxGeometry(.31, .145, .91), '#c0ccc1', x, .168)
    for (const z of [-.32, .32]) {
      solid(group, new THREE.BoxGeometry(.105, 1.71, .115), red, x, 1.091, z)
      solid(group, new THREE.BoxGeometry(.035, 1.65, .025), trim, x, 1.109, z + Math.sign(z) * .069)
      solid(group, new THREE.BoxGeometry(.135, .052, .143), trim, x, 1.973, z)
    }
    for (const y of [.8, 1.15, 1.52, 1.858]) solid(group, new THREE.BoxGeometry(.105, .094, .68), red, x, y)
    for (const y of [1.185, 1.555]) {
      const brace = solid(group, new THREE.BoxGeometry(.09, .06, .67), trim, x, y + .11)
      brace.rotation.x = .3
    }
  }
  const cableHeight = (x: number) => Math.abs(x) <= .73
    ? .95 + 1.02 * (x / .73) ** 2
    : .715 + 1.255 * Math.max(0, (1.51 - Math.abs(x)) / .78) ** 1.2
  const hangers: THREE.Matrix4[] = [], dummy = new THREE.Object3D()
  for (const z of [-.32, .32]) {
    for (const [start, end] of [[-1.51, -.73], [-.73, .73], [.73, 1.51]] as const) {
      const points = Array.from({ length: 25 }, (_, i) => {
        const x = start + (end - start) * i / 24
        return new THREE.Vector3(x, cableHeight(x), z)
      })
      solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, .024, 7, false), red)
    }
    for (let i = 0; i <= 24; i++) {
      const x = -1.44 + i * .12, top = cableHeight(x), length = top - .705
      dummy.position.set(x, .705 + length / 2, z); dummy.scale.set(.009, length, .009)
      dummy.updateMatrix(); hangers.push(dummy.matrix.clone())
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), new THREE.MeshStandardMaterial({ color: trim, roughness: .68 }), hangers.length)
  hangers.forEach((matrix, index) => mesh.setMatrixAt(index, matrix))
  mesh.castShadow = mesh.receiveShadow = true; group.add(mesh)
  for (const [x, z, color] of [[-.39, .12, '#ece8d4'], [.27, -.12, '#76aeb4'], [1.08, .12, '#e1b75e']] as const) {
    solid(group, new RoundedBoxGeometry(.16, .055, .079, 2, .018), color, x, .697, z)
    solid(group, new THREE.BoxGeometry(.085, .035, .063), '#a7c7c6', x, .74, z)
  }
  const boat = new THREE.Group(); boat.position.set(.23, .11, 1.04); boat.rotation.y = -.3; group.add(boat)
  solid(boat, new RoundedBoxGeometry(.64, .085, .19, 2, .055), '#edf0df', 0, .045)
  solid(boat, new THREE.BoxGeometry(.3, .08, .143), '#87aeb8', -.04, .128)
  solid(boat, new THREE.BoxGeometry(.33, .028, .16), '#f4edde', -.04, .182)
  solid(boat, new THREE.CylinderGeometry(.012, .017, .17, 6), '#bcc8ba', -.07, .279)
  for (const z of [-1.07, 1.07]) solid(group, new THREE.BoxGeometry(.33, .012, .027), '#afdadb', -.81, .091, z)
  return group
}

export function shanghaiLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#bdcdb9', 0, .04)
  solid(group, new RoundedBoxGeometry(2.97, .04, 2.93, 2, .08), '#d9e1d6', 0, .1)
  solid(group, new THREE.CylinderGeometry(.73, .8, .09, 24), '#bfd0c9', 0, .165)
  solid(group, new THREE.CylinderGeometry(.33, .48, .14, 16), '#e4e7da', 0, .273)
  const up = new THREE.Vector3(0, 1, 0)
  for (let leg = 0; leg < 3; leg++) {
    const angle = leg / 3 * Math.PI * 2 + Math.PI / 3
    const bottom = new THREE.Vector3(Math.sin(angle) * .61, .22, Math.cos(angle) * .61)
    const top = new THREE.Vector3(Math.sin(angle) * .185, 1.01, Math.cos(angle) * .185)
    const direction = top.clone().sub(bottom), center = bottom.clone().add(top).multiplyScalar(.5)
    const support = solid(group, new THREE.CylinderGeometry(.075, .105, direction.length(), 12), '#dce1d7', center.x, center.y, center.z)
    support.quaternion.setFromUnitVectors(up, direction.normalize())
    solid(group, new THREE.CylinderGeometry(.073, .085, 1.15, 12), '#e5e5d8', Math.sin(angle) * .112, 1.829, Math.cos(angle) * .112)
  }
  const pearl = (radius: number, y: number) => {
    solid(group, new THREE.SphereGeometry(radius, 32, 20), '#b87e91', 0, y, 0, .25)
    for (const latitude of [-.58, -.27, .08, .42, .7]) {
      const ring = solid(group, new THREE.TorusGeometry(radius * Math.sqrt(1 - latitude * latitude) + .004, .013, 6, 32), '#ddd6d0', 0, y + radius * latitude)
      ring.rotation.x = Math.PI / 2
    }
    for (let meridian = 0; meridian < 8; meridian++) {
      const angle = meridian / 8 * Math.PI * 2, points: THREE.Vector3[] = []
      for (let i = 0; i <= 16; i++) {
        const t = .15 + i / 16 * (Math.PI - .3), r = (radius + .006) * Math.sin(t)
        points.push(new THREE.Vector3(Math.sin(angle) * r, y + (radius + .006) * Math.cos(t), Math.cos(angle) * r))
      }
      solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 18, .008, 5, false), '#dec6cc')
    }
    solid(group, new THREE.CylinderGeometry(radius * 1.026, radius * 1.026, .047, 32), '#73959e', 0, y)
  }
  pearl(.435, 1.099)
  solid(group, new THREE.CylinderGeometry(.19, .16, .055, 20), '#acb9b5', 0, 1.65)
  solid(group, new THREE.CylinderGeometry(.18, .15, .055, 20), '#acb9b5', 0, 2.027)
  pearl(.281, 2.501)
  solid(group, new THREE.CylinderGeometry(.061, .083, .27, 12), '#e5e3d7', 0, 2.88)
  pearl(.105, 3.053)
  solid(group, new THREE.CylinderGeometry(.021, .043, .29, 10), '#c6c7bb', 0, 3.286)
  solid(group, new THREE.ConeGeometry(.019, .17, 8), '#d8d8c9', 0, 3.516)
  solid(group, new THREE.BoxGeometry(2.83, .023, .38), '#76bac5', 0, .133, 1.22)
  for (const z of [.985, 1.453]) solid(group, new THREE.BoxGeometry(2.91, .045, .065), '#e6e5d4', 0, .158, z)
  for (const x of [-1.08, 1.08]) {
    solid(group, new RoundedBoxGeometry(.52, .075, .84, 2, .045), '#96b79e', x, .168, -.61)
    for (const z of [-.88, -.33]) {
      solid(group, new THREE.CylinderGeometry(.025, .036, .2, 6), '#9f987b', x, .304, z)
      solid(group, new THREE.IcosahedronGeometry(.145, 1), '#6c977b', x, .493, z)
    }
  }
  solid(group, new THREE.BoxGeometry(.45, .026, .55), '#ecebda', 0, .148, .757)
  return group
}

export function beijingLandmark() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#bdcdb5', 0, .04)
  const posts: THREE.Matrix4[] = [], dummy = new THREE.Object3D()
  for (let tier = 0; tier < 3; tier++) {
    const radius = 1.43 - tier * .15, y = .145 + tier * .1
    solid(group, new THREE.CylinderGeometry(radius, radius + .02, .09, 48), '#e2e5d8', 0, y)
    solid(group, new THREE.CylinderGeometry(radius + .025, radius + .025, .024, 48), '#f2f0df', 0, y + .056)
    const railRadius = radius - .055, railY = y + .157
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 48; i++) {
      const angle = .31 + i / 48 * (Math.PI * 2 - .62)
      points.push(new THREE.Vector3(Math.sin(angle) * railRadius, railY, Math.cos(angle) * railRadius))
      if (i % 2 === 0) {
        dummy.position.set(Math.sin(angle) * railRadius, railY - .043, Math.cos(angle) * railRadius)
        dummy.updateMatrix(); posts.push(dummy.matrix.clone())
      }
    }
    solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, .018, 6, false), '#eff0e1')
  }
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.035, .115, .035), new THREE.MeshStandardMaterial({ color: '#f2f0df', roughness: .8 }), posts.length)
  posts.forEach((matrix, index) => postMesh.setMatrixAt(index, matrix))
  postMesh.castShadow = postMesh.receiveShadow = true; group.add(postMesh)
  solid(group, new THREE.CylinderGeometry(.57, .57, .57, 32), '#a55149', 0, .705)
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2
    solid(group, new THREE.CylinderGeometry(.022, .025, .55, 8), '#c87558', Math.sin(angle) * .576, .712, Math.cos(angle) * .576)
    const panel = solid(group, new THREE.BoxGeometry(.14, .25, .021), '#4c746c', Math.sin(angle + Math.PI / 16) * .574, .682, Math.cos(angle + Math.PI / 16) * .574)
    panel.rotation.y = angle + Math.PI / 16
  }
  for (const [radius, y] of [[.583, .927], [.443, 1.395], [.315, 1.842]] as const) {
    solid(group, new THREE.CylinderGeometry(radius, radius, .052, 32), '#5c9995', 0, y)
    solid(group, new THREE.CylinderGeometry(radius + .014, radius + .014, .019, 32), '#cfb76c', 0, y + .035)
  }
  solid(group, new THREE.CylinderGeometry(.435, .435, .25, 32), '#ad6754', 0, 1.313)
  solid(group, new THREE.CylinderGeometry(.307, .307, .21, 32), '#a66151', 0, 1.748)
  const roof = (radius: number, y: number, height: number) => {
    const profile = [[1, .14], [.965, 0], [.83, .15], [.62, .44], [.35, .8], [.06, 1]] as const
    solid(group, new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(radius * r, height * h)), 48), '#477e9b', 0, y, 0, .18)
    const eave = solid(group, new THREE.TorusGeometry(radius * .985, .017, 6, 48), '#779fae', 0, y + .027)
    eave.rotation.x = Math.PI / 2
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2
      const points = profile.slice(1).map(([r, h]) => new THREE.Vector3(Math.sin(angle) * radius * r, y + height * h + .012, Math.cos(angle) * radius * r))
      solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 14, .007, 5, false), '#7199ae')
    }
  }
  roof(.93, .958, .32)
  roof(.721, 1.423, .29)
  roof(.536, 1.869, .32)
  solid(group, new THREE.CylinderGeometry(.075, .099, .065, 16), '#c9ad62', 0, 2.221, 0, .4)
  solid(group, new THREE.CylinderGeometry(.04, .068, .09, 12), '#dfbd64', 0, 2.298, 0, .4)
  solid(group, new THREE.ConeGeometry(.044, .12, 12), '#eccd77', 0, 2.403, 0, .4)
  for (const x of [-.13, .13]) {
    solid(group, new THREE.BoxGeometry(.13, .32, .028), '#774f42', x, .617, .569)
    solid(group, new THREE.BoxGeometry(.027, .36, .035), '#c9b379', x + Math.sign(x) * .08, .637, .6)
  }
  solid(group, new THREE.BoxGeometry(.26, .088, .027), '#356c81', 0, .882, .596)
  for (let step = 0; step < 6; step++) solid(group, new THREE.BoxGeometry(.48, .042, .127), '#e8e8d9', 0, .15 + step * .049, 1.415 - step * .112)
  return group
}
