import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { TokenId } from '@fortune/game'
import { canvasTexture, solid } from './sceneUtils.js'

export function tokenModel(token: TokenId, color: string) {
  const group = new THREE.Group()
  solid(group, new THREE.CylinderGeometry(0.25, 0.27, 0.075, 32), color, 0, 0.0375)
  solid(group, new THREE.CylinderGeometry(0.226, 0.25, 0.035, 32), '#eee2ba', 0, 0.0925)
  solid(group, new THREE.TorusGeometry(0.241, 0.012, 8, 32), '#cfb575', 0, 0.106, 0, 0.35).rotation.x = Math.PI / 2
  const box = (w: number, h: number, d: number, c: string, x = 0, y = 0.3, z = 0) =>
    solid(group, new RoundedBoxGeometry(w, h, d, 2, Math.min(0.025, w / 4, h / 4, d / 4)), c, x, y, z)
  const sphere = (r: number, c: string, x: number, y: number, z = 0) =>
    solid(group, new THREE.SphereGeometry(r, 24, 16), c, x, y, z)
  const line = (points: number[][], radius: number, color: string) =>
    solid(
      group,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
        18,
        radius,
        6,
        false,
      ),
      color,
    )
  const inscription = (text: string, width: number, height: number, foreground: string, background: string) => {
    const texture = canvasTexture(256, 96, (ctx) => {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, 256, 96)
      ctx.fillStyle = foreground
      ctx.font = '700 54px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 128, 51)
    })
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 }),
    )
  }
  if (token === 'train' || token === 'teapot') {
    const bus = token === 'train',
      paint = bus ? '#c84343' : '#eebe38'
    box(0.57, 0.075, 0.3, '#39464a', 0, 0.17)
    box(0.565, bus ? 0.465 : 0.16, 0.302, paint, 0, bus ? 0.412 : 0.28)
    box(
      bus ? 0.56 : 0.315,
      bus ? 0.035 : 0.135,
      bus ? 0.303 : 0.255,
      bus ? '#de6560' : paint,
      bus ? 0 : -0.017,
      bus ? 0.664 : 0.405,
    )
    for (const x of [-0.185, 0.185])
      for (const z of [-0.162, 0.162]) {
        const tire = solid(group, new THREE.CylinderGeometry(0.066, 0.066, 0.032, 20), '#273b3c', x, 0.184, z)
        tire.rotation.x = Math.PI / 2
        const hub = solid(group, new THREE.CylinderGeometry(0.027, 0.027, 0.036, 16), '#c2c9c1', x, 0.184, z)
        hub.rotation.x = Math.PI / 2
      }
    for (const side of [-1, 1]) {
      const z = side * 0.154
      for (const x of bus ? [-0.21, -0.075, 0.06, 0.195] : [-0.094, 0.052]) {
        box(bus ? 0.104 : 0.115, bus ? 0.116 : 0.078, 0.014, '#81b7c4', x, bus ? 0.55 : 0.422, bus ? z : side * 0.131)
        if (bus) box(0.104, 0.102, 0.014, '#86beca', x, 0.351, z)
      }
      box(0.555, 0.026, 0.018, bus ? '#f1dfb5' : '#3c4949', 0, bus ? 0.444 : 0.289, side * 0.158)
      box(0.045, 0.008, 0.017, '#dfdece', 0.086, bus ? 0.31 : 0.36, side * 0.167)
      if (!bus)
        for (let i = 0; i < 10; i++)
          box(0.027, 0.015, 0.006, i % 2 ? '#f2e8cc' : '#394b4b', -0.142 + i * 0.031, 0.295, side * 0.17)
    }
    for (const z of [-0.105, 0.105]) {
      box(0.017, 0.037, 0.048, '#fff0bd', 0.291, 0.279, z)
      box(0.016, 0.033, 0.035, '#bf5650', -0.291, 0.265, z)
    }
    box(0.017, 0.026, 0.272, '#cbd2c6', 0.292, 0.225)
    if (bus) {
      box(0.014, 0.108, 0.236, '#76adba', 0.291, 0.546)
      box(0.014, 0.116, 0.22, '#6eabbc', 0.291, 0.351)
      const number = inscription('15', 0.13, 0.048, '#f7ebc7', '#344b48')
      number.rotation.y = Math.PI / 2
      number.position.set(0.299, 0.639, 0)
      group.add(number)
      for (const z of [-0.078, 0.078])
        line(
          [
            [0.3, 0.327, z],
            [0.303, 0.38, z + 0.026],
          ],
          0.004,
          '#d9dfcd',
        )
    } else {
      box(0.014, 0.082, 0.221, '#8bc0cd', 0.149, 0.419)
      box(0.014, 0.075, 0.217, '#8bc0cd', -0.181, 0.41)
      box(0.132, 0.055, 0.082, '#f6e9b7', -0.016, 0.497)
      const sign = inscription('TAXI', 0.108, 0.036, '#42534b', '#f6e9b7')
      sign.position.set(-0.016, 0.497, 0.043)
      group.add(sign)
    }
  } else if (token === 'camera') {
    const ceramic = '#f5eee0'
    sphere(0.19, ceramic, 0, 0.316).scale.set(1, 1.1, 0.86)
    for (const x of [-0.107, 0.107]) sphere(0.079, ceramic, x, 0.162, 0.087).scale.set(1, 0.65, 1.1)
    sphere(0.174, ceramic, 0, 0.575).scale.set(1.02, 0.99, 0.87)
    for (const x of [-0.117, 0.117]) {
      const ear = solid(group, new THREE.ConeGeometry(0.074, 0.154, 3), ceramic, x, 0.727)
      ear.rotation.z = -Math.sign(x) * 0.16
      const inner = solid(group, new THREE.ConeGeometry(0.041, 0.09, 3), '#d6908b', x, 0.746, 0.032)
      inner.rotation.z = ear.rotation.z
      line(
        [
          [x * 0.39, 0.589, 0.152],
          [x * 0.59, 0.605, 0.159],
          [x * 0.83, 0.591, 0.149],
        ],
        0.007,
        '#415750',
      )
      sphere(0.022, '#e9aea0', x * 0.78, 0.549, 0.14).scale.set(1.25, 0.64, 0.4)
      for (const dy of [-0.009, 0.013])
        line(
          [
            [x * 0.8, 0.553 + dy, 0.155],
            [x * 1.19, 0.558 + dy, 0.115],
          ],
          0.0035,
          '#a58c75',
        )
    }
    sphere(0.016, '#ce7d78', 0, 0.562, 0.177)
    line(
      [
        [-0.032, 0.54, 0.16],
        [0, 0.533, 0.18],
        [0.032, 0.54, 0.16],
      ],
      0.005,
      '#867661',
    )
    solid(group, new THREE.TorusGeometry(0.145, 0.02, 8, 28), '#bf504a', 0, 0.433).rotation.x = Math.PI / 2
    sphere(0.035, '#d2a74f', 0, 0.411, 0.152)
    sphere(0.057, ceramic, -0.208, 0.602, 0.025).scale.y = 1.29
    box(0.093, 0.148, 0.091, ceramic, -0.181, 0.482, 0.01)
    for (const x of [-0.229, -0.209, -0.189])
      line(
        [
          [x, 0.633, 0.074],
          [x, 0.665, 0.063],
        ],
        0.003,
        '#b7a791',
      )
    const coin = solid(group, new THREE.CylinderGeometry(0.086, 0.086, 0.025, 24), '#d9b45a', 0.033, 0.286, 0.177, 0.35)
    coin.rotation.x = Math.PI / 2
    solid(group, new THREE.TorusGeometry(0.069, 0.008, 6, 24), '#f0d48c', 0.033, 0.286, 0.196).scale.y = 1.2
    box(0.012, 0.071, 0.013, '#9b7b3c', 0.033, 0.29, 0.208)
    for (const y of [0.277, 0.31]) box(0.056, 0.01, 0.013, '#9b7b3c', 0.033, y, 0.208)
    sphere(0.049, ceramic, 0.125, 0.333, 0.119)
    line(
      [
        [0.137, 0.248, -0.095],
        [0.218, 0.251, -0.126],
        [0.209, 0.353, -0.105],
        [0.161, 0.347, -0.106],
      ],
      0.028,
      ceramic,
    )
  } else if (token === 'compass') {
    const positions: number[] = [],
      colors: number[] = [],
      indices: number[] = [],
      rows = 48,
      sides = 16
    const point = (t: number, v: number) => {
      const angle = -0.72 * Math.PI + t * Math.PI * 1.44,
        radius = 0.018 + 0.091 * Math.sin(Math.PI * t) ** 0.65
      return new THREE.Vector3(
        Math.sin(angle) * (0.21 + Math.cos(v) * radius),
        0.235 + Math.sin(v) * radius * 0.85,
        Math.cos(angle) * (0.145 + Math.cos(v) * radius),
      )
    }
    const brown = new THREE.Color('#ba783b'),
      gold = new THREE.Color('#ecc17c')
    for (let row = 0; row <= rows; row++)
      for (let side = 0; side <= sides; side++) {
        const v = (side / sides) * Math.PI * 2,
          p = point(row / rows, v)
        positions.push(p.x, p.y, p.z)
        const shade = brown.clone().lerp(gold, 0.38 + Math.sin(v) * 0.24 + Math.cos(row * 0.63) * 0.12)
        colors.push(shade.r, shade.g, shade.b)
        if (row < rows && side < sides) {
          const a = row * (sides + 1) + side
          indices.push(a, a + sides + 1, a + 1, a + 1, a + sides + 1, a + sides + 2)
        }
      }
    for (const row of [0, rows]) {
      const center = positions.length / 3,
        p = point(row / rows, 0)
      p.lerp(point(row / rows, Math.PI), 0.5)
      positions.push(p.x, p.y, p.z)
      colors.push(gold.r, gold.g, gold.b)
      for (let side = 0; side < sides; side++) {
        const a = row * (sides + 1) + side
        if (row === 0) indices.push(center, a, a + 1)
        else indices.push(center, a + 1, a)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const pastry = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, side: THREE.DoubleSide }),
    )
    pastry.castShadow = pastry.receiveShadow = true
    group.add(pastry)
    for (let i = 1; i < 8; i++) {
      const curve = new THREE.CatmullRomCurve3(
        Array.from({ length: 13 }, (_, side) => point(i / 8, (side / 12) * Math.PI)),
      )
      solid(group, new THREE.TubeGeometry(curve, 16, 0.008, 6, false), '#efd09a')
    }
  } else if (token === 'kite') {
    const outline = new THREE.Shape()
    outline.moveTo(-0.345, 0)
    outline.bezierCurveTo(-0.2, -0.143, 0.2, -0.143, 0.345, 0)
    outline.bezierCurveTo(0.2, 0.143, -0.2, 0.143, -0.345, 0)
    const hole = new THREE.Path()
    hole.ellipse(0, 0, 0.245, 0.07, 0, Math.PI * 2, true)
    outline.holes.push(hole)
    const hull = solid(
      group,
      new THREE.ExtrudeGeometry(outline, {
        depth: 0.073,
        bevelEnabled: true,
        bevelSize: 0.008,
        bevelThickness: 0.006,
        bevelSegments: 2,
      }),
      '#344a49',
      0,
      0.158,
    )
    hull.rotation.x = -Math.PI / 2
    box(0.47, 0.035, 0.148, '#957451', 0, 0.161)
    for (const x of [-0.143, 0.105]) box(0.087, 0.037, 0.145, '#bc635a', x, 0.211)
    box(0.028, 0.09, 0.15, '#c88667', -0.172, 0.245)
    for (const side of [-1, 1])
      line(
        [
          [-0.32, 0.24, 0],
          [-0.17, 0.238, side * 0.094],
          [0.17, 0.238, side * 0.094],
          [0.32, 0.24, 0],
        ],
        0.007,
        '#d2b376',
      )
    line(
      [
        [0.293, 0.207, 0],
        [0.341, 0.3, 0],
        [0.355, 0.368, 0],
      ],
      0.018,
      '#b8c3b7',
    )
    for (let tooth = 0; tooth < 4; tooth++) box(0.044, 0.013, 0.024, '#ccd1bd', 0.357, 0.287 + tooth * 0.025)
    line(
      [
        [-0.307, 0.21, 0],
        [-0.342, 0.257, 0],
        [-0.351, 0.309, 0],
      ],
      0.012,
      '#b9a078',
    )
    const oar = new THREE.Group()
    oar.position.y = 0.286
    oar.rotation.y = -0.75
    group.add(oar)
    solid(oar, new THREE.CylinderGeometry(0.009, 0.009, 0.61, 8), '#bd9c67').rotation.z = Math.PI / 2
    solid(oar, new RoundedBoxGeometry(0.13, 0.02, 0.052, 2, 0.006), '#d2b47c', 0.25)
  } else {
    solid(group, new THREE.CylinderGeometry(0.023, 0.026, 0.205, 12), '#bda263', 0, 0.209)
    const mask = sphere(0.218, '#c84246', 0, 0.537)
    mask.scale.set(0.91, 1.28, 0.41)
    const white = new THREE.Shape()
    white.moveTo(0.025, 0.09)
    white.bezierCurveTo(0.07, 0.17, 0.15, 0.16, 0.173, 0.1)
    white.bezierCurveTo(0.14, 0.09, 0.119, 0.027, 0.048, 0.035)
    white.quadraticCurveTo(0.009, 0.044, 0.025, 0.09)
    const patch = new THREE.ExtrudeGeometry(white, {
      depth: 0.011,
      bevelEnabled: true,
      bevelSize: 0.002,
      bevelThickness: 0.002,
      bevelSegments: 1,
    })
    for (const side of [-1, 1]) {
      const eyePatch = solid(group, patch, '#f2e6cf', 0, 0.489, 0.084)
      eyePatch.scale.x = side
      const eye = sphere(0.048, '#314745', side * 0.084, 0.564, 0.109)
      eye.scale.set(1.1, 0.47, 0.25)
      line(
        [
          [side * 0.034, 0.634, 0.083],
          [side * 0.102, 0.661, 0.065],
          [side * 0.173, 0.612, 0.04],
        ],
        0.014,
        '#293f3d',
      )
      line(
        [
          [side * 0.069, 0.521, 0.097],
          [side * 0.132, 0.476, 0.074],
          [side * 0.091, 0.408, 0.067],
        ],
        0.011,
        '#f2e6ce',
      )
      line(
        [
          [side * 0.124, 0.43, 0.057],
          [side * 0.072, 0.381, 0.061],
          [side * 0.032, 0.361, 0.058],
        ],
        0.008,
        '#334841',
      )
    }
    box(0.047, 0.219, 0.028, '#f3e7ce', 0, 0.565, 0.097)
    const nose = sphere(0.032, '#ce7059', 0, 0.515, 0.126)
    nose.scale.set(0.85, 1.25, 0.65)
    line(
      [
        [-0.056, 0.431, 0.09],
        [0, 0.421, 0.112],
        [0.056, 0.431, 0.09],
      ],
      0.012,
      '#2f4440',
    )
    line(
      [
        [-0.075, 0.692, 0.055],
        [0, 0.763, 0.03],
        [0.075, 0.692, 0.055],
      ],
      0.013,
      '#ead8b5',
    )
    sphere(0.027, '#d8b56a', 0, 0.712, 0.069).scale.z = 0.32
  }
  return group
}
