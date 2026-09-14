import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { solid } from './sceneUtils.js'

function foundation() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, .08, 3.2), '#c6d2bc', 0, .04)
  return group
}

export function eventLandmark(kind: 'chance' | 'fate') {
  const group = foundation()
  solid(group, new THREE.CylinderGeometry(.7, .76, .12, 32), '#eef0df', 0, .14)
  solid(group, new THREE.CylinderGeometry(.6, .65, .04, 32), kind === 'chance' ? '#d7be7b' : '#cd95a3', 0, .22)
  const symbol = new THREE.Group(); symbol.name = 'event-symbol'; symbol.position.y = .2; group.add(symbol)
  const color = kind === 'chance' ? '#edb544' : '#d66b87'
  if (kind === 'chance') {
    const curve = new THREE.CatmullRomCurve3([
      [-.48, 1.75], [-.4, 2.04], [-.12, 2.2], [.27, 2.15], [.48, 1.9], [.35, 1.6], [.06, 1.38], [0, 1.08],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0)))
    solid(symbol, new THREE.TubeGeometry(curve, 48, .145, 10, false), color)
  } else {
    solid(symbol, new RoundedBoxGeometry(.32, 1.22, .32, 2, .075), color, 0, 1.64)
  }
  solid(symbol, new RoundedBoxGeometry(.31, .31, .31, 2, .07), color, 0, .56)
  return group
}

export function airportLandmark() {
  const group = foundation()
  solid(group, new THREE.BoxGeometry(2.8, .025, 1.1), '#7d9297', 0, .095, .85)
  for (let i = 0; i < 6; i++) solid(group, new THREE.BoxGeometry(.19, .012, .035), '#f0eed7', -.98 + i * .39, .115, 1.14)
  solid(group, new THREE.BoxGeometry(2.25, .54, .9), '#e6e8db', .14, .35, -.35)
  solid(group, new RoundedBoxGeometry(2.46, .12, 1.02, 2, .04), '#508eaa', .14, .68, -.35)
  for (let i = 0; i < 6; i++) solid(group, new THREE.BoxGeometry(.26, .24, .025), '#679da9', -.72 + i * .34, .38, .112)
  solid(group, new THREE.BoxGeometry(1.65, .055, .35), '#c8d9d5', .15, .5, .23)
  solid(group, new THREE.BoxGeometry(.32, .94, .32), '#e3e5d7', -.99, .57, -.69)
  solid(group, new THREE.CylinderGeometry(.3, .25, .28, 8), '#5f95a3', -.99, 1.12, -.69)
  solid(group, new THREE.CylinderGeometry(.34, .34, .065, 8), '#eef0df', -.99, 1.295, -.69)
  solid(group, new THREE.CylinderGeometry(.02, .02, .33, 8), '#69818b', -.99, 1.48, -.69)
  const plane = new THREE.Group(); plane.position.set(.35, .27, .8); group.add(plane)
  solid(plane, new THREE.CapsuleGeometry(.085, .66, 4, 12), '#fff9e9').rotation.z = Math.PI / 2
  solid(plane, new THREE.BoxGeometry(.28, .045, .9), '#f7f5e7', -.02).rotation.y = -.2
  solid(plane, new THREE.BoxGeometry(.17, .035, .38), '#508eaa', -.33)
  solid(plane, new THREE.BoxGeometry(.15, .19, .025), '#508eaa', -.33, .1)
  for (const z of [-.25, .25]) solid(plane, new THREE.CapsuleGeometry(.05, .15, 3, 8), '#d4ddd7', .02, -.055, z).rotation.z = Math.PI / 2
  return group
}

export function utilityLandmark() {
  const group = foundation()
  solid(group, new THREE.BoxGeometry(2.15, .85, 1.55), '#e2e5d8', 0, .51, -.05)
  solid(group, new THREE.BoxGeometry(2.34, .12, 1.72), '#6d918e', 0, 1, -.05)
  solid(group, new THREE.BoxGeometry(.4, .54, .035), '#708f93', 0, .36, .742)
  for (const x of [-.7, .7]) solid(group, new THREE.BoxGeometry(.3, .3, .03), '#9cc4ca', x, .57, .74)
  for (const x of [-.58, .58]) {
    solid(group, new THREE.CylinderGeometry(.28, .28, .42, 16), '#b9cdcc', x, 1.26, -.25)
    solid(group, new THREE.CylinderGeometry(.31, .31, .055, 16), '#e4e9df', x, 1.5, -.25)
  }
  solid(group, new THREE.BoxGeometry(1.2, .045, .7), '#c2cbc1', 0, .1, 1.08)
  return group
}

export function utilityBadge(kind: 'electric' | 'water') {
  const group = new THREE.Group(); group.position.set(0, .86, .76)
  solid(group, new THREE.BoxGeometry(.6, .42, .045), '#f5f2e4')
  const shape = new THREE.Shape()
  if (kind === 'electric') {
    shape.moveTo(.01, .17); shape.lineTo(-.14, -.035); shape.lineTo(-.035, -.035)
    shape.lineTo(-.065, -.18); shape.lineTo(.15, .055); shape.lineTo(.025, .055); shape.closePath()
  } else {
    shape.moveTo(0, .17); shape.bezierCurveTo(-.05, .07, -.145, -.02, -.12, -.09)
    shape.bezierCurveTo(-.085, -.21, .085, -.21, .12, -.09); shape.bezierCurveTo(.145, -.02, .05, .07, 0, .17)
  }
  solid(group, new THREE.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: false }), kind === 'electric' ? '#dca43e' : '#3b9fc4', 0, .015, .026)
  return group
}

export function taxLandmark(kind: 'income' | 'maintenance') {
  const group = foundation(), maintenance = kind === 'maintenance'
  solid(group, new THREE.BoxGeometry(2.92, .035, 2.88), '#dce1d1', 0, .103)
  solid(group, new THREE.BoxGeometry(2.25, .085, 1.66), '#becbbd', 0, .162)
  solid(group, new THREE.BoxGeometry(1.89, .83, 1.25), maintenance ? '#d4e2d8' : '#e3dfca', 0, .619)
  solid(group, new THREE.BoxGeometry(2.07, .09, 1.43), maintenance ? '#5e9288' : '#8a9d97', 0, 1.079)
  solid(group, new THREE.BoxGeometry(.42, .56, .028), '#628d91', 0, .483, .641)
  for (const x of [-.63, .63]) {
    solid(group, new THREE.BoxGeometry(.34, .3, .026), '#77a7ad', x, .638, .641)
    solid(group, new THREE.BoxGeometry(.019, .32, .024), '#f0efde', x, .638, .662)
    solid(group, new THREE.BoxGeometry(.38, .028, .053), '#e8e8d6', x, .469, .653)
  }
  for (let step = 0; step < 3; step++) solid(group, new THREE.BoxGeometry(.86, .032, .13), '#e8e6d2', 0, .142 + step * .032, 1.096 - step * .105)
  if (!maintenance) {
    for (const x of [-.78, -.28, .28, .78]) {
      solid(group, new THREE.CylinderGeometry(.053, .065, .66, 10), '#f0e8ce', x, .554, .815)
      solid(group, new THREE.BoxGeometry(.17, .044, .17), '#d0c8ad', x, .906, .815)
    }
    solid(group, new THREE.BoxGeometry(1.91, .072, .36), '#e8dec0', 0, .964, .773)
    const pediment = new THREE.Shape()
    pediment.moveTo(-1.06, 0); pediment.lineTo(1.06, 0); pediment.lineTo(0, .36); pediment.closePath()
    solid(group, new THREE.ExtrudeGeometry(pediment, { depth: .2, bevelEnabled: false }), '#d6caaa', 0, 1.09, .545)
    const coin = solid(group, new THREE.CylinderGeometry(.28, .28, .065, 32), '#d8b367', 0, 1.64, 0, .35)
    coin.rotation.x = Math.PI / 2
    solid(group, new THREE.TorusGeometry(.23, .014, 6, 28), '#efd28f', 0, 1.64, .04, .3)
    for (const side of [-1, 1]) {
      const arm = solid(group, new THREE.BoxGeometry(.027, .125, .016), '#f9e9b6', side * .035, 1.716, .051)
      arm.rotation.z = side * .6
    }
    solid(group, new THREE.BoxGeometry(.026, .17, .016), '#f9e9b6', 0, 1.597, .051)
    for (const y of [1.615, 1.664]) solid(group, new THREE.BoxGeometry(.148, .022, .016), '#f9e9b6', 0, y, .052)
  } else {
    const tool = new THREE.Group(); tool.position.y = 1.24; tool.rotation.z = -.38; group.add(tool)
    solid(tool, new RoundedBoxGeometry(.105, .4, .065, 2, .025), '#7195a0', 0, .13)
    const jaw = solid(tool, new THREE.TorusGeometry(.112, .038, 8, 20, Math.PI * 1.5), '#a8c3c5', 0, .391)
    jaw.rotation.z = Math.PI * .75
    solid(group, new THREE.BoxGeometry(1.05, .025, .36), '#849693', -.59, .134, 1.207)
    for (const x of [-.96, -.64, -.32]) solid(group, new THREE.BoxGeometry(.15, .012, .019), '#eef0dd', x, .153, 1.207)
    for (const x of [.42, .75]) {
      solid(group, new THREE.BoxGeometry(.19, .024, .19), '#9aafa4', x, .145, 1.18)
      solid(group, new THREE.ConeGeometry(.073, .19, 12), '#d59456', x, .248, 1.18)
      solid(group, new THREE.CylinderGeometry(.035, .047, .035, 12), '#eee5ce', x, .258, 1.18)
    }
  }
  for (const x of [-1.21, 1.21]) for (const z of [-.99, .7]) {
    solid(group, new RoundedBoxGeometry(.24, .07, .3, 2, .035), '#a4b994', x, .157, z)
    solid(group, new RoundedBoxGeometry(.19, .17, .25, 2, .045), '#6c9d79', x, .277, z)
  }
  return group
}
