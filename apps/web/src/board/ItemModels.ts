import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { solid } from './sceneUtils.js'

export function itemLandmark() {
  const group = new THREE.Group()
  group.name = '旅途道具补给站'
  solid(group, new RoundedBoxGeometry(3.2, .12, 3.2, 2, .1), '#cad7bd', 0, .06)
  solid(group, new RoundedBoxGeometry(2.7, .06, 2.5, 2, .06), '#e5e3ca', 0, .15, .1)
  solid(group, new RoundedBoxGeometry(2.05, 1.48, 1.4, 2, .055), '#96b49b', 0, .91, -.32)
  solid(group, new THREE.BoxGeometry(2.09, .12, 1.44), '#6a8e76', 0, .29, -.32)
  solid(group, new RoundedBoxGeometry(2.3, .13, 1.69, 2, .07), '#547f69', 0, 1.73, -.32)
  // Four display bays repeat the same frame and carry small physical item symbols.
  for (const x of [-.72, -.24, .24, .72]) {
    solid(group, new RoundedBoxGeometry(.43, .68, .045, 2, .025), '#e9efdd', x, 1.08, .4)
    solid(group, new THREE.BoxGeometry(.4, .026, .15), '#b7cbb1', x, .775, .47)
  }
  for (const x of [-1, 1]) {
    solid(group, new THREE.BoxGeometry(.085, 1.43, .12), '#eee6cc', x, .97, .45)
    solid(group, new THREE.CylinderGeometry(.035, .045, 1.56, 8), '#6b8d70', x * 1.16, .95, .99)
  }
  solid(group, new RoundedBoxGeometry(2.17, .46, .49, 2, .045), '#759b7d', 0, .47, .72)
  solid(group, new RoundedBoxGeometry(2.29, .09, .63, 2, .035), '#eaddb5', 0, .75, .75)
  for (let i = 0; i < 8; i++) {
    const canopy = solid(group, new RoundedBoxGeometry(.298, .095, 1.02, 2, .025), i % 2 ? '#f0e6c5' : '#709b80', -1.043 + i * .298, 1.68, .72)
    canopy.rotation.x = .12
    solid(group, new RoundedBoxGeometry(.295, .18, .085, 2, .028), i % 2 ? '#f0e6c5' : '#709b80', -1.043 + i * .298, 1.54, 1.19)
  }
  const turtle = solid(group, new THREE.SphereGeometry(.12, 12, 8), '#7da65d', -.74, .91, .59)
  turtle.scale.set(1, .64, .85)
  solid(group, new THREE.SphereGeometry(.06, 10, 8), '#a5c478', -.62, .88, .61)
  solid(group, new RoundedBoxGeometry(.23, .23, .23, 2, .025), '#faf1d7', -.24, .93, .6)
  for (const [x, y] of [[-.065, -.065], [.065, .065], [0, 0]]) solid(group, new THREE.SphereGeometry(.023, 8, 6), '#557360', -.24 + x!, .93 + y!, .722)
  for (const y of [.88, 1.01]) solid(group, new THREE.BoxGeometry(.3, .075, .04), '#e6bc77', .24, y, .58)
  for (const x of [.13, .35]) solid(group, new THREE.BoxGeometry(.026, .32, .045), '#657e6c', x, .92, .58)
  solid(group, new THREE.SphereGeometry(.115, 12, 8), '#52625a', .73, .92, .6)
  solid(group, new THREE.CylinderGeometry(.022, .027, .08, 8), '#d5b97e', .73, 1.06, .6)
  // A roof parcel makes the stop readable from the board overview as well as up close.
  const parcel = new THREE.Group(); parcel.rotation.y = -.15; parcel.position.set(0, 1.82, -.35); group.add(parcel)
  solid(parcel, new RoundedBoxGeometry(.88, .6, .74, 2, .05), '#dcc18b', 0, .32)
  solid(parcel, new RoundedBoxGeometry(.95, .12, .81, 2, .035), '#f0d7a1', 0, .65)
  solid(parcel, new THREE.BoxGeometry(.13, .67, .77), '#6f9474', 0, .35)
  solid(parcel, new THREE.BoxGeometry(.96, .018, .13), '#6f9474', 0, .72)
  for (const direction of [-1, 1]) {
    const bow = solid(parcel, new THREE.TorusGeometry(.14, .035, 8, 16), '#78996f', direction * .13, .82)
    bow.scale.y = .6; bow.rotation.z = direction * .25
  }
  for (const x of [-1.37, 1.37]) {
    solid(group, new RoundedBoxGeometry(.29, .23, .29, 2, .025), '#d6be90', x, .255, -.92)
    solid(group, new THREE.IcosahedronGeometry(.2, 1), '#779c68', x, .49, -.92)
  }
  return group
}

export function hazardModel(kind: 'roadblock' | 'bomb') {
  const group = new THREE.Group()
  group.name = kind === 'bomb' ? '炸弹' : '路障'
  const marker = solid(group, new THREE.TorusGeometry(.66, .06, 8, 28), kind === 'bomb' ? '#d88d63' : '#e3ba65', 0, .055)
  marker.rotation.x = -Math.PI / 2
  if (kind === 'roadblock') {
    for (const x of [-.47, .47]) {
      solid(group, new THREE.BoxGeometry(.1, .9, .1), '#597165', x, .45)
      solid(group, new RoundedBoxGeometry(.32, .09, .58, 2, .035), '#788775', x, .065)
      solid(group, new THREE.SphereGeometry(.13, 12, 8), '#eeb753', x, 1.01)
    }
    for (const y of [.45, .77]) {
      solid(group, new RoundedBoxGeometry(1.4, .24, .15, 2, .025), '#f5efdf', 0, y)
      for (const x of [-.46, 0, .46]) {
        const stripe = solid(group, new THREE.BoxGeometry(.17, .23, .012), '#cf784a', x, y, .082)
        stripe.rotation.z = -.36
        const back = stripe.clone(); back.position.z = -.082; group.add(back)
      }
    }
  } else {
    solid(group, new THREE.SphereGeometry(.47, 18, 12), '#435153', 0, .52)
    solid(group, new THREE.CylinderGeometry(.15, .17, .15, 12), '#6c746a', .05, .99)
    const fuse = new THREE.CatmullRomCurve3([new THREE.Vector3(.05, 1.06, 0), new THREE.Vector3(.16, 1.32, 0), new THREE.Vector3(.36, 1.28, 0)])
    solid(group, new THREE.TubeGeometry(fuse, 10, .045, 6, false), '#dab984')
    solid(group, new THREE.OctahedronGeometry(.14), '#eca953', .39, 1.29)
  }
  return group
}
