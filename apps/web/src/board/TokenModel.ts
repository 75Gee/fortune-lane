import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { TokenId } from '@fortune/game'
import { canvasTexture, solid } from './sceneUtils.js'

export function tokenModel(token: TokenId, color: string) {
  const group = new THREE.Group()
  solid(group, new THREE.CylinderGeometry(.25, .27, .075, 32), color, 0, .0375)
  solid(group, new THREE.CylinderGeometry(.226, .25, .035, 32), '#eee2ba', 0, .0925)
  solid(group, new THREE.TorusGeometry(.241, .012, 8, 32), '#cfb575', 0, .106, 0, .35).rotation.x = Math.PI / 2
  const box = (w: number, h: number, d: number, c: string, x = 0, y = .3, z = 0) => solid(group, new RoundedBoxGeometry(w, h, d, 2, Math.min(.025, w / 4, h / 4, d / 4)), c, x, y, z)
  const sphere = (r: number, c: string, x: number, y: number, z = 0) => solid(group, new THREE.SphereGeometry(r, 24, 16), c, x, y, z)
  const line = (points: number[][], radius: number, color: string) => solid(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), 18, radius, 6, false), color)
  const inscription = (text: string, width: number, height: number, foreground: string, background: string) => {
    const texture = canvasTexture(256, 96, ctx => {
      ctx.fillStyle = background; ctx.fillRect(0, 0, 256, 96); ctx.fillStyle = foreground
      ctx.font = '700 54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 51)
    })
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: .6 }))
  }
  if (token === 'train' || token === 'teapot') {
    const bus = token === 'train', paint = bus ? '#c84343' : '#eebe38'
    box(.57, .075, .3, '#39464a', 0, .17)
    box(.565, bus ? .465 : .16, .302, paint, 0, bus ? .412 : .28)
    box(bus ? .56 : .315, bus ? .035 : .135, bus ? .303 : .255, bus ? '#de6560' : paint, bus ? 0 : -.017, bus ? .664 : .405)
    for (const x of [-.185, .185]) for (const z of [-.162, .162]) {
      const tire = solid(group, new THREE.CylinderGeometry(.066, .066, .032, 20), '#273b3c', x, .184, z); tire.rotation.x = Math.PI / 2
      const hub = solid(group, new THREE.CylinderGeometry(.027, .027, .036, 16), '#c2c9c1', x, .184, z); hub.rotation.x = Math.PI / 2
    }
    for (const side of [-1, 1]) {
      const z = side * .154
      for (const x of bus ? [-.21, -.075, .06, .195] : [-.094, .052]) {
        box(bus ? .104 : .115, bus ? .116 : .078, .014, '#81b7c4', x, bus ? .55 : .422, bus ? z : side * .131)
        if (bus) box(.104, .102, .014, '#86beca', x, .351, z)
      }
      box(.555, .026, .018, bus ? '#f1dfb5' : '#3c4949', 0, bus ? .444 : .289, side * .158)
      box(.045, .008, .017, '#dfdece', .086, bus ? .31 : .36, side * .167)
      if (!bus) for (let i = 0; i < 10; i++) box(.027, .015, .006, i % 2 ? '#f2e8cc' : '#394b4b', -.142 + i * .031, .295, side * .17)
    }
    for (const z of [-.105, .105]) {
      box(.017, .037, .048, '#fff0bd', .291, .279, z)
      box(.016, .033, .035, '#bf5650', -.291, .265, z)
    }
    box(.017, .026, .272, '#cbd2c6', .292, .225)
    if (bus) {
      box(.014, .108, .236, '#76adba', .291, .546)
      box(.014, .116, .22, '#6eabbc', .291, .351)
      const number = inscription('15', .13, .048, '#f7ebc7', '#344b48'); number.rotation.y = Math.PI / 2; number.position.set(.299, .639, 0); group.add(number)
      for (const z of [-.078, .078]) line([[.3, .327, z], [.303, .38, z + .026]], .004, '#d9dfcd')
    } else {
      box(.014, .082, .221, '#8bc0cd', .149, .419)
      box(.014, .075, .217, '#8bc0cd', -.181, .41)
      box(.132, .055, .082, '#f6e9b7', -.016, .497)
      const sign = inscription('TAXI', .108, .036, '#42534b', '#f6e9b7'); sign.position.set(-.016, .497, .043); group.add(sign)
    }
  } else if (token === 'camera') {
    const ceramic = '#f5eee0'
    sphere(.19, ceramic, 0, .316).scale.set(1, 1.1, .86)
    for (const x of [-.107, .107]) sphere(.079, ceramic, x, .162, .087).scale.set(1, .65, 1.1)
    sphere(.174, ceramic, 0, .575).scale.set(1.02, .99, .87)
    for (const x of [-.117, .117]) {
      const ear = solid(group, new THREE.ConeGeometry(.074, .154, 3), ceramic, x, .727); ear.rotation.z = -Math.sign(x) * .16
      const inner = solid(group, new THREE.ConeGeometry(.041, .09, 3), '#d6908b', x, .746, .032); inner.rotation.z = ear.rotation.z
      line([[x * .39, .589, .152], [x * .59, .605, .159], [x * .83, .591, .149]], .007, '#415750')
      sphere(.022, '#e9aea0', x * .78, .549, .14).scale.set(1.25, .64, .4)
      for (const dy of [-.009, .013]) line([[x * .8, .553 + dy, .155], [x * 1.19, .558 + dy, .115]], .0035, '#a58c75')
    }
    sphere(.016, '#ce7d78', 0, .562, .177)
    line([[-.032, .54, .16], [0, .533, .18], [.032, .54, .16]], .005, '#867661')
    solid(group, new THREE.TorusGeometry(.145, .02, 8, 28), '#bf504a', 0, .433).rotation.x = Math.PI / 2
    sphere(.035, '#d2a74f', 0, .411, .152)
    sphere(.057, ceramic, -.208, .602, .025).scale.y = 1.29
    box(.093, .148, .091, ceramic, -.181, .482, .01)
    for (const x of [-.229, -.209, -.189]) line([[x, .633, .074], [x, .665, .063]], .003, '#b7a791')
    const coin = solid(group, new THREE.CylinderGeometry(.086, .086, .025, 24), '#d9b45a', .033, .286, .177, .35); coin.rotation.x = Math.PI / 2
    solid(group, new THREE.TorusGeometry(.069, .008, 6, 24), '#f0d48c', .033, .286, .196).scale.y = 1.2
    box(.012, .071, .013, '#9b7b3c', .033, .29, .208)
    for (const y of [.277, .31]) box(.056, .01, .013, '#9b7b3c', .033, y, .208)
    sphere(.049, ceramic, .125, .333, .119)
    line([[.137, .248, -.095], [.218, .251, -.126], [.209, .353, -.105], [.161, .347, -.106]], .028, ceramic)
  } else if (token === 'compass') {
    const positions: number[] = [], colors: number[] = [], indices: number[] = [], rows = 48, sides = 16
    const point = (t: number, v: number) => {
      const angle = -.72 * Math.PI + t * Math.PI * 1.44, radius = .018 + .091 * Math.sin(Math.PI * t) ** .65
      return new THREE.Vector3(Math.sin(angle) * (.21 + Math.cos(v) * radius), .235 + Math.sin(v) * radius * .85, Math.cos(angle) * (.145 + Math.cos(v) * radius))
    }
    const brown = new THREE.Color('#ba783b'), gold = new THREE.Color('#ecc17c')
    for (let row = 0; row <= rows; row++) for (let side = 0; side <= sides; side++) {
      const v = side / sides * Math.PI * 2, p = point(row / rows, v)
      positions.push(p.x, p.y, p.z)
      const shade = brown.clone().lerp(gold, .38 + Math.sin(v) * .24 + Math.cos(row * .63) * .12); colors.push(shade.r, shade.g, shade.b)
      if (row < rows && side < sides) { const a = row * (sides + 1) + side; indices.push(a, a + sides + 1, a + 1, a + 1, a + sides + 1, a + sides + 2) }
    }
    for (const row of [0, rows]) {
      const center = positions.length / 3, p = point(row / rows, 0); p.lerp(point(row / rows, Math.PI), .5)
      positions.push(p.x, p.y, p.z); colors.push(gold.r, gold.g, gold.b)
      for (let side = 0; side < sides; side++) { const a = row * (sides + 1) + side; if (row === 0) indices.push(center, a, a + 1); else indices.push(center, a + 1, a) }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
    const pastry = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .65, side: THREE.DoubleSide })); pastry.castShadow = pastry.receiveShadow = true; group.add(pastry)
    for (let i = 1; i < 8; i++) {
      const curve = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, side) => point(i / 8, side / 12 * Math.PI)))
      solid(group, new THREE.TubeGeometry(curve, 16, .008, 6, false), '#efd09a')
    }
  } else if (token === 'kite') {
    const outline = new THREE.Shape()
    outline.moveTo(-.345, 0); outline.bezierCurveTo(-.2, -.143, .2, -.143, .345, 0)
    outline.bezierCurveTo(.2, .143, -.2, .143, -.345, 0)
    const hole = new THREE.Path(); hole.ellipse(0, 0, .245, .07, 0, Math.PI * 2, true); outline.holes.push(hole)
    const hull = solid(group, new THREE.ExtrudeGeometry(outline, { depth: .073, bevelEnabled: true, bevelSize: .008, bevelThickness: .006, bevelSegments: 2 }), '#344a49', 0, .158); hull.rotation.x = -Math.PI / 2
    box(.47, .035, .148, '#957451', 0, .161)
    for (const x of [-.143, .105]) box(.087, .037, .145, '#bc635a', x, .211)
    box(.028, .09, .15, '#c88667', -.172, .245)
    for (const side of [-1, 1]) line([[-.32, .24, 0], [-.17, .238, side * .094], [.17, .238, side * .094], [.32, .24, 0]], .007, '#d2b376')
    line([[.293, .207, 0], [.341, .3, 0], [.355, .368, 0]], .018, '#b8c3b7')
    for (let tooth = 0; tooth < 4; tooth++) box(.044, .013, .024, '#ccd1bd', .357, .287 + tooth * .025)
    line([[-.307, .21, 0], [-.342, .257, 0], [-.351, .309, 0]], .012, '#b9a078')
    const oar = new THREE.Group(); oar.position.y = .286; oar.rotation.y = -.75; group.add(oar)
    solid(oar, new THREE.CylinderGeometry(.009, .009, .61, 8), '#bd9c67').rotation.z = Math.PI / 2
    solid(oar, new RoundedBoxGeometry(.13, .02, .052, 2, .006), '#d2b47c', .25)
  } else {
    solid(group, new THREE.CylinderGeometry(.023, .026, .205, 12), '#bda263', 0, .209)
    const mask = sphere(.218, '#c84246', 0, .537); mask.scale.set(.91, 1.28, .41)
    const white = new THREE.Shape()
    white.moveTo(.025, .09); white.bezierCurveTo(.07, .17, .15, .16, .173, .1)
    white.bezierCurveTo(.14, .09, .119, .027, .048, .035); white.quadraticCurveTo(.009, .044, .025, .09)
    const patch = new THREE.ExtrudeGeometry(white, { depth: .011, bevelEnabled: true, bevelSize: .002, bevelThickness: .002, bevelSegments: 1 })
    for (const side of [-1, 1]) {
      const eyePatch = solid(group, patch, '#f2e6cf', 0, .489, .084); eyePatch.scale.x = side
      const eye = sphere(.048, '#314745', side * .084, .564, .109); eye.scale.set(1.1, .47, .25)
      line([[side * .034, .634, .083], [side * .102, .661, .065], [side * .173, .612, .04]], .014, '#293f3d')
      line([[side * .069, .521, .097], [side * .132, .476, .074], [side * .091, .408, .067]], .011, '#f2e6ce')
      line([[side * .124, .43, .057], [side * .072, .381, .061], [side * .032, .361, .058]], .008, '#334841')
    }
    box(.047, .219, .028, '#f3e7ce', 0, .565, .097)
    const nose = sphere(.032, '#ce7059', 0, .515, .126); nose.scale.set(.85, 1.25, .65)
    line([[-.056, .431, .09], [0, .421, .112], [.056, .431, .09]], .012, '#2f4440')
    line([[-.075, .692, .055], [0, .763, .03], [.075, .692, .055]], .013, '#ead8b5')
    sphere(.027, '#d8b56a', 0, .712, .069).scale.z = .32
  }
  return group
}
