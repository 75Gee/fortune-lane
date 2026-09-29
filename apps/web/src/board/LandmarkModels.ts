import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { solid } from './sceneUtils.js'

function foundation() {
  const group = new THREE.Group()
  solid(group, new THREE.BoxGeometry(3.2, 0.08, 3.2), '#c6d2bc', 0, 0.04)
  return group
}

export function eventLandmark(kind: 'chance' | 'fate') {
  const group = foundation()
  solid(group, new THREE.CylinderGeometry(0.7, 0.76, 0.12, 32), '#eef0df', 0, 0.14)
  solid(group, new THREE.CylinderGeometry(0.6, 0.65, 0.04, 32), kind === 'chance' ? '#d7be7b' : '#cd95a3', 0, 0.22)
  const symbol = new THREE.Group()
  symbol.name = 'event-symbol'
  symbol.position.y = 0.2
  group.add(symbol)
  const color = kind === 'chance' ? '#edb544' : '#d66b87'
  if (kind === 'chance') {
    const curve = new THREE.CatmullRomCurve3(
      [
        [-0.48, 1.75],
        [-0.4, 2.04],
        [-0.12, 2.2],
        [0.27, 2.15],
        [0.48, 1.9],
        [0.35, 1.6],
        [0.06, 1.38],
        [0, 1.08],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
    )
    solid(symbol, new THREE.TubeGeometry(curve, 48, 0.145, 10, false), color)
  } else {
    solid(symbol, new RoundedBoxGeometry(0.32, 1.22, 0.32, 2, 0.075), color, 0, 1.64)
  }
  solid(symbol, new RoundedBoxGeometry(0.31, 0.31, 0.31, 2, 0.07), color, 0, 0.56)
  return group
}

export function airportLandmark() {
  const group = foundation()
  solid(group, new THREE.BoxGeometry(2.8, 0.025, 1.1), '#7d9297', 0, 0.095, 0.85)
  for (let i = 0; i < 6; i++)
    solid(group, new THREE.BoxGeometry(0.19, 0.012, 0.035), '#f0eed7', -0.98 + i * 0.39, 0.115, 1.14)
  solid(group, new THREE.BoxGeometry(2.25, 0.54, 0.9), '#e6e8db', 0.14, 0.35, -0.35)
  solid(group, new RoundedBoxGeometry(2.46, 0.12, 1.02, 2, 0.04), '#508eaa', 0.14, 0.68, -0.35)
  for (let i = 0; i < 6; i++)
    solid(group, new THREE.BoxGeometry(0.26, 0.24, 0.025), '#679da9', -0.72 + i * 0.34, 0.38, 0.112)
  solid(group, new THREE.BoxGeometry(1.65, 0.055, 0.35), '#c8d9d5', 0.15, 0.5, 0.23)
  solid(group, new THREE.BoxGeometry(0.32, 0.94, 0.32), '#e3e5d7', -0.99, 0.57, -0.69)
  solid(group, new THREE.CylinderGeometry(0.3, 0.25, 0.28, 8), '#5f95a3', -0.99, 1.12, -0.69)
  solid(group, new THREE.CylinderGeometry(0.34, 0.34, 0.065, 8), '#eef0df', -0.99, 1.295, -0.69)
  solid(group, new THREE.CylinderGeometry(0.02, 0.02, 0.33, 8), '#69818b', -0.99, 1.48, -0.69)
  const plane = new THREE.Group()
  plane.position.set(0.35, 0.27, 0.8)
  group.add(plane)
  solid(plane, new THREE.CapsuleGeometry(0.085, 0.66, 4, 12), '#fff9e9').rotation.z = Math.PI / 2
  solid(plane, new THREE.BoxGeometry(0.28, 0.045, 0.9), '#f7f5e7', -0.02).rotation.y = -0.2
  solid(plane, new THREE.BoxGeometry(0.17, 0.035, 0.38), '#508eaa', -0.33)
  solid(plane, new THREE.BoxGeometry(0.15, 0.19, 0.025), '#508eaa', -0.33, 0.1)
  for (const z of [-0.25, 0.25])
    solid(plane, new THREE.CapsuleGeometry(0.05, 0.15, 3, 8), '#d4ddd7', 0.02, -0.055, z).rotation.z = Math.PI / 2
  return group
}

export function utilityLandmark() {
  const group = foundation()
  solid(group, new THREE.BoxGeometry(2.15, 0.85, 1.55), '#e2e5d8', 0, 0.51, -0.05)
  solid(group, new THREE.BoxGeometry(2.34, 0.12, 1.72), '#6d918e', 0, 1, -0.05)
  solid(group, new THREE.BoxGeometry(0.4, 0.54, 0.035), '#708f93', 0, 0.36, 0.742)
  for (const x of [-0.7, 0.7]) solid(group, new THREE.BoxGeometry(0.3, 0.3, 0.03), '#9cc4ca', x, 0.57, 0.74)
  for (const x of [-0.58, 0.58]) {
    solid(group, new THREE.CylinderGeometry(0.28, 0.28, 0.42, 16), '#b9cdcc', x, 1.26, -0.25)
    solid(group, new THREE.CylinderGeometry(0.31, 0.31, 0.055, 16), '#e4e9df', x, 1.5, -0.25)
  }
  solid(group, new THREE.BoxGeometry(1.2, 0.045, 0.7), '#c2cbc1', 0, 0.1, 1.08)
  return group
}

export function utilityBadge(kind: 'electric' | 'water') {
  const group = new THREE.Group()
  group.position.set(0, 0.86, 0.76)
  solid(group, new THREE.BoxGeometry(0.6, 0.42, 0.045), '#f5f2e4')
  const shape = new THREE.Shape()
  if (kind === 'electric') {
    shape.moveTo(0.01, 0.17)
    shape.lineTo(-0.14, -0.035)
    shape.lineTo(-0.035, -0.035)
    shape.lineTo(-0.065, -0.18)
    shape.lineTo(0.15, 0.055)
    shape.lineTo(0.025, 0.055)
    shape.closePath()
  } else {
    shape.moveTo(0, 0.17)
    shape.bezierCurveTo(-0.05, 0.07, -0.145, -0.02, -0.12, -0.09)
    shape.bezierCurveTo(-0.085, -0.21, 0.085, -0.21, 0.12, -0.09)
    shape.bezierCurveTo(0.145, -0.02, 0.05, 0.07, 0, 0.17)
  }
  solid(
    group,
    new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }),
    kind === 'electric' ? '#dca43e' : '#3b9fc4',
    0,
    0.015,
    0.026,
  )
  return group
}

export function taxLandmark(kind: 'income' | 'maintenance') {
  const group = foundation(),
    maintenance = kind === 'maintenance'
  solid(group, new THREE.BoxGeometry(2.92, 0.035, 2.88), '#dce1d1', 0, 0.103)
  solid(group, new THREE.BoxGeometry(2.25, 0.085, 1.66), '#becbbd', 0, 0.162)
  solid(group, new THREE.BoxGeometry(1.89, 0.83, 1.25), maintenance ? '#d4e2d8' : '#e3dfca', 0, 0.619)
  solid(group, new THREE.BoxGeometry(2.07, 0.09, 1.43), maintenance ? '#5e9288' : '#8a9d97', 0, 1.079)
  solid(group, new THREE.BoxGeometry(0.42, 0.56, 0.028), '#628d91', 0, 0.483, 0.641)
  for (const x of [-0.63, 0.63]) {
    solid(group, new THREE.BoxGeometry(0.34, 0.3, 0.026), '#77a7ad', x, 0.638, 0.641)
    solid(group, new THREE.BoxGeometry(0.019, 0.32, 0.024), '#f0efde', x, 0.638, 0.662)
    solid(group, new THREE.BoxGeometry(0.38, 0.028, 0.053), '#e8e8d6', x, 0.469, 0.653)
  }
  for (let step = 0; step < 3; step++)
    solid(group, new THREE.BoxGeometry(0.86, 0.032, 0.13), '#e8e6d2', 0, 0.142 + step * 0.032, 1.096 - step * 0.105)
  if (!maintenance) {
    for (const x of [-0.78, -0.28, 0.28, 0.78]) {
      solid(group, new THREE.CylinderGeometry(0.053, 0.065, 0.66, 10), '#f0e8ce', x, 0.554, 0.815)
      solid(group, new THREE.BoxGeometry(0.17, 0.044, 0.17), '#d0c8ad', x, 0.906, 0.815)
    }
    solid(group, new THREE.BoxGeometry(1.91, 0.072, 0.36), '#e8dec0', 0, 0.964, 0.773)
    const pediment = new THREE.Shape()
    pediment.moveTo(-1.06, 0)
    pediment.lineTo(1.06, 0)
    pediment.lineTo(0, 0.36)
    pediment.closePath()
    solid(group, new THREE.ExtrudeGeometry(pediment, { depth: 0.2, bevelEnabled: false }), '#d6caaa', 0, 1.09, 0.545)
    const coin = solid(group, new THREE.CylinderGeometry(0.28, 0.28, 0.065, 32), '#d8b367', 0, 1.64, 0, 0.35)
    coin.rotation.x = Math.PI / 2
    solid(group, new THREE.TorusGeometry(0.23, 0.014, 6, 28), '#efd28f', 0, 1.64, 0.04, 0.3)
    for (const side of [-1, 1]) {
      const arm = solid(group, new THREE.BoxGeometry(0.027, 0.125, 0.016), '#f9e9b6', side * 0.035, 1.716, 0.051)
      arm.rotation.z = side * 0.6
    }
    solid(group, new THREE.BoxGeometry(0.026, 0.17, 0.016), '#f9e9b6', 0, 1.597, 0.051)
    for (const y of [1.615, 1.664]) solid(group, new THREE.BoxGeometry(0.148, 0.022, 0.016), '#f9e9b6', 0, y, 0.052)
  } else {
    const tool = new THREE.Group()
    tool.position.y = 1.24
    tool.rotation.z = -0.38
    group.add(tool)
    solid(tool, new RoundedBoxGeometry(0.105, 0.4, 0.065, 2, 0.025), '#7195a0', 0, 0.13)
    const jaw = solid(tool, new THREE.TorusGeometry(0.112, 0.038, 8, 20, Math.PI * 1.5), '#a8c3c5', 0, 0.391)
    jaw.rotation.z = Math.PI * 0.75
    solid(group, new THREE.BoxGeometry(1.05, 0.025, 0.36), '#849693', -0.59, 0.134, 1.207)
    for (const x of [-0.96, -0.64, -0.32])
      solid(group, new THREE.BoxGeometry(0.15, 0.012, 0.019), '#eef0dd', x, 0.153, 1.207)
    for (const x of [0.42, 0.75]) {
      solid(group, new THREE.BoxGeometry(0.19, 0.024, 0.19), '#9aafa4', x, 0.145, 1.18)
      solid(group, new THREE.ConeGeometry(0.073, 0.19, 12), '#d59456', x, 0.248, 1.18)
      solid(group, new THREE.CylinderGeometry(0.035, 0.047, 0.035, 12), '#eee5ce', x, 0.258, 1.18)
    }
  }
  for (const x of [-1.21, 1.21])
    for (const z of [-0.99, 0.7]) {
      solid(group, new RoundedBoxGeometry(0.24, 0.07, 0.3, 2, 0.035), '#a4b994', x, 0.157, z)
      solid(group, new RoundedBoxGeometry(0.19, 0.17, 0.25, 2, 0.045), '#6c9d79', x, 0.277, z)
    }
  return group
}
