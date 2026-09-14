import * as THREE from 'three'
import { MAX_PROPERTY_LEVEL } from '@fortune/game'

export function propertyBuildings() {
  const group = new THREE.Group()
  const slotGeometry = new THREE.BoxGeometry(.72, .025, .72)
  const insetGeometry = new THREE.BoxGeometry(.62, .012, .62)
  const wallGeometry = new THREE.BoxGeometry(.46, .26, .4)
  const roofShape = new THREE.Shape()
  roofShape.moveTo(-.29, 0); roofShape.lineTo(.29, 0); roofShape.lineTo(0, .18); roofShape.closePath()
  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: .48, bevelEnabled: false }).translate(0, .27, -.24)
  const doorGeometry = new THREE.BoxGeometry(.09, .16, .012)
  const windowGeometry = new THREE.BoxGeometry(.085, .075, .012)
  const slotMaterial = new THREE.MeshStandardMaterial({ color: '#a9b9a5', roughness: 1 })
  const insetMaterial = new THREE.MeshStandardMaterial({ color: '#d4ddcb', roughness: 1 })
  const houseMaterial = new THREE.MeshStandardMaterial({ color: '#42a477', roughness: .8 })
  const houseRoof = new THREE.MeshStandardMaterial({ color: '#267c59', roughness: .8 })
  const hotelMaterial = new THREE.MeshStandardMaterial({ color: '#db6862', roughness: .8 })
  const hotelRoof = new THREE.MeshStandardMaterial({ color: '#b84746', roughness: .8 })
  const doorMaterial = new THREE.MeshStandardMaterial({ color: '#e3ead8', roughness: .9 })
  const windowsMaterial = new THREE.MeshStandardMaterial({ color: '#d1e9e7', roughness: .6 })
  const models: THREE.Group[] = []
  for (let i = 0; i < MAX_PROPERTY_LEVEL; i++) {
    const slot = new THREE.Mesh(slotGeometry, slotMaterial)
    slot.position.set((i - (MAX_PROPERTY_LEVEL - 1) / 2) * .82, .014, 0); slot.receiveShadow = true; group.add(slot)
    const inset = new THREE.Mesh(insetGeometry, insetMaterial); inset.position.y = .019; slot.add(inset)
    const model = new THREE.Group(); model.position.set(slot.position.x, .045, 0); group.add(model); models.push(model)
    const hotel = i === MAX_PROPERTY_LEVEL - 1
    const wall = new THREE.Mesh(wallGeometry, hotel ? hotelMaterial : houseMaterial); wall.position.y = .14; model.add(wall)
    model.add(new THREE.Mesh(roofGeometry, hotel ? hotelRoof : houseRoof))
    const door = new THREE.Mesh(doorGeometry, doorMaterial); door.position.set(-.085, .09, .206); model.add(door)
    const window = new THREE.Mesh(windowGeometry, windowsMaterial); window.position.set(.09, .18, .206); model.add(window)
    model.traverse((piece) => { if (piece instanceof THREE.Mesh) piece.castShadow = piece.receiveShadow = true })
    model.visible = false
  }
  return {
    group,
    footprints: models.map((model) => model.position.clone()),
    setLevel(level: number, mortgaged: boolean) {
      models.forEach((model, index) => { model.visible = !mortgaged && index < level })
    },
  }
}
