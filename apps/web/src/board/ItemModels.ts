import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { solid } from './sceneUtils.js'

export function itemLandmark() {
  const group = new THREE.Group()
  group.name = '旅途道具补给站'
  solid(group, new RoundedBoxGeometry(3.2, 0.12, 3.2, 2, 0.1), '#cad7bd', 0, 0.06)
  solid(group, new RoundedBoxGeometry(2.7, 0.06, 2.5, 2, 0.06), '#e5e3ca', 0, 0.15, 0.1)
  solid(group, new RoundedBoxGeometry(2.05, 1.48, 1.4, 2, 0.055), '#96b49b', 0, 0.91, -0.32)
  solid(group, new THREE.BoxGeometry(2.09, 0.12, 1.44), '#6a8e76', 0, 0.29, -0.32)
  solid(group, new RoundedBoxGeometry(2.3, 0.13, 1.69, 2, 0.07), '#547f69', 0, 1.73, -0.32)
  // Four display bays repeat the same frame and carry small physical item symbols.
  for (const x of [-0.72, -0.24, 0.24, 0.72]) {
    solid(group, new RoundedBoxGeometry(0.43, 0.68, 0.045, 2, 0.025), '#e9efdd', x, 1.08, 0.4)
    solid(group, new THREE.BoxGeometry(0.4, 0.026, 0.15), '#b7cbb1', x, 0.775, 0.47)
  }
  for (const x of [-1, 1]) {
    solid(group, new THREE.BoxGeometry(0.085, 1.43, 0.12), '#eee6cc', x, 0.97, 0.45)
    solid(group, new THREE.CylinderGeometry(0.035, 0.045, 1.56, 8), '#6b8d70', x * 1.16, 0.95, 0.99)
  }
  solid(group, new RoundedBoxGeometry(2.17, 0.46, 0.49, 2, 0.045), '#759b7d', 0, 0.47, 0.72)
  solid(group, new RoundedBoxGeometry(2.29, 0.09, 0.63, 2, 0.035), '#eaddb5', 0, 0.75, 0.75)
  for (let i = 0; i < 8; i++) {
    const canopy = solid(
      group,
      new RoundedBoxGeometry(0.298, 0.095, 1.02, 2, 0.025),
      i % 2 ? '#f0e6c5' : '#709b80',
      -1.043 + i * 0.298,
      1.68,
      0.72,
    )
    canopy.rotation.x = 0.12
    solid(
      group,
      new RoundedBoxGeometry(0.295, 0.18, 0.085, 2, 0.028),
      i % 2 ? '#f0e6c5' : '#709b80',
      -1.043 + i * 0.298,
      1.54,
      1.19,
    )
  }
  const turtle = solid(group, new THREE.SphereGeometry(0.12, 12, 8), '#7da65d', -0.74, 0.91, 0.59)
  turtle.scale.set(1, 0.64, 0.85)
  solid(group, new THREE.SphereGeometry(0.06, 10, 8), '#a5c478', -0.62, 0.88, 0.61)
  solid(group, new RoundedBoxGeometry(0.23, 0.23, 0.23, 2, 0.025), '#faf1d7', -0.24, 0.93, 0.6)
  for (const [x, y] of [
    [-0.065, -0.065],
    [0.065, 0.065],
    [0, 0],
  ])
    solid(group, new THREE.SphereGeometry(0.023, 8, 6), '#557360', -0.24 + x!, 0.93 + y!, 0.722)
  for (const y of [0.88, 1.01]) solid(group, new THREE.BoxGeometry(0.3, 0.075, 0.04), '#e6bc77', 0.24, y, 0.58)
  for (const x of [0.13, 0.35]) solid(group, new THREE.BoxGeometry(0.026, 0.32, 0.045), '#657e6c', x, 0.92, 0.58)
  solid(group, new THREE.SphereGeometry(0.115, 12, 8), '#52625a', 0.73, 0.92, 0.6)
  solid(group, new THREE.CylinderGeometry(0.022, 0.027, 0.08, 8), '#d5b97e', 0.73, 1.06, 0.6)
  // A roof parcel makes the stop readable from the board overview as well as up close.
  const parcel = new THREE.Group()
  parcel.rotation.y = -0.15
  parcel.position.set(0, 1.82, -0.35)
  group.add(parcel)
  solid(parcel, new RoundedBoxGeometry(0.88, 0.6, 0.74, 2, 0.05), '#dcc18b', 0, 0.32)
  solid(parcel, new RoundedBoxGeometry(0.95, 0.12, 0.81, 2, 0.035), '#f0d7a1', 0, 0.65)
  solid(parcel, new THREE.BoxGeometry(0.13, 0.67, 0.77), '#6f9474', 0, 0.35)
  solid(parcel, new THREE.BoxGeometry(0.96, 0.018, 0.13), '#6f9474', 0, 0.72)
  for (const direction of [-1, 1]) {
    const bow = solid(parcel, new THREE.TorusGeometry(0.14, 0.035, 8, 16), '#78996f', direction * 0.13, 0.82)
    bow.scale.y = 0.6
    bow.rotation.z = direction * 0.25
  }
  for (const x of [-1.37, 1.37]) {
    solid(group, new RoundedBoxGeometry(0.29, 0.23, 0.29, 2, 0.025), '#d6be90', x, 0.255, -0.92)
    solid(group, new THREE.IcosahedronGeometry(0.2, 1), '#779c68', x, 0.49, -0.92)
  }
  return group
}

export function hazardModel(kind: 'roadblock' | 'bomb') {
  const group = new THREE.Group()
  group.name = kind === 'bomb' ? '炸弹' : '路障'
  const marker = solid(
    group,
    new THREE.TorusGeometry(0.66, 0.06, 8, 28),
    kind === 'bomb' ? '#d88d63' : '#e3ba65',
    0,
    0.055,
  )
  marker.rotation.x = -Math.PI / 2
  if (kind === 'roadblock') {
    for (const x of [-0.47, 0.47]) {
      solid(group, new THREE.BoxGeometry(0.1, 0.9, 0.1), '#597165', x, 0.45)
      solid(group, new RoundedBoxGeometry(0.32, 0.09, 0.58, 2, 0.035), '#788775', x, 0.065)
      solid(group, new THREE.SphereGeometry(0.13, 12, 8), '#eeb753', x, 1.01)
    }
    for (const y of [0.45, 0.77]) {
      solid(group, new RoundedBoxGeometry(1.4, 0.24, 0.15, 2, 0.025), '#f5efdf', 0, y)
      for (const x of [-0.46, 0, 0.46]) {
        const stripe = solid(group, new THREE.BoxGeometry(0.17, 0.23, 0.012), '#cf784a', x, y, 0.082)
        stripe.rotation.z = -0.36
        const back = stripe.clone()
        back.position.z = -0.082
        group.add(back)
      }
    }
  } else {
    solid(group, new THREE.SphereGeometry(0.47, 18, 12), '#435153', 0, 0.52)
    solid(group, new THREE.CylinderGeometry(0.15, 0.17, 0.15, 12), '#6c746a', 0.05, 0.99)
    const fuse = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, 1.06, 0),
      new THREE.Vector3(0.16, 1.32, 0),
      new THREE.Vector3(0.36, 1.28, 0),
    ])
    solid(group, new THREE.TubeGeometry(fuse, 10, 0.045, 6, false), '#dab984')
    solid(group, new THREE.OctahedronGeometry(0.14), '#eca953', 0.39, 1.29)
  }
  return group
}
