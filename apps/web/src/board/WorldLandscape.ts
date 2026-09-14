import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { BOARD, BOARD_GRID_SIZE, BOARD_SIDE_STEPS } from '@fortune/game'
import { canvasTexture, solid } from './sceneUtils.js'
import { bangkokDistrict } from './BangkokDistrict.js'
import { CORNER_CELL_SIZE, cornerFootprint, cornerLandmark } from './CornerLandmarks.js'
import {
  amsterdamLandmark, athensLandmark, barcelonaLandmark, beijingLandmark, berlinLandmark,
  dubaiLandmark, istanbulLandmark, londonLandmark, losAngelesLandmark, melbourneLandmark,
  newYorkLandmark, parisLandmark, romeLandmark, sanFranciscoLandmark, seoulLandmark,
  shanghaiLandmark, singaporeLandmark, sydneyLandmark, tokyoLandmark, torontoLandmark, viennaLandmark,
} from './CityLandmarks.js'
import { airportLandmark, eventLandmark, taxLandmark, utilityBadge, utilityLandmark } from './LandmarkModels.js'
import { BOARD_SIZE, inwardAt, landmarkPosition, TILE_SIZE, WORLD_SIZE } from './worldRoute.js'
import { itemLandmark } from './ItemModels.js'
import { cairoLandmark, hongKongLandmark } from './ExpansionLandmarks.js'
import { optimizeStaticModel } from './optimizeStaticModel.js'
import type { ContactShadows } from './ContactShadows.js'

export function worldLandscape(scene: THREE.Scene, grounding: ContactShadows) {
  scene.background = new THREE.Color('#b8d9e1')
  scene.fog = new THREE.Fog('#b8d9e1', 180, 450)
  const water = solid(scene, new THREE.PlaneGeometry(700, 700), '#7bbac5', 0, -.95)
  water.rotation.x = -Math.PI / 2
  solid(scene, new RoundedBoxGeometry(WORLD_SIZE + 4, .7, WORLD_SIZE + 4, 2, 1), '#a9bca0', 0, -.48)
  solid(scene, new RoundedBoxGeometry(BOARD_SIZE + .15, .38, BOARD_SIZE + .15, 2, .12), '#557e70', 0, -.06)
  solid(scene, new THREE.BoxGeometry(TILE_SIZE * (BOARD_GRID_SIZE - 2), .08, TILE_SIZE * (BOARD_GRID_SIZE - 2)), '#8faf9e', 0, .14)
  const centerMap = canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = '#8faf9e'; ctx.fillRect(0, 0, 1024, 1024)
    ctx.strokeStyle = '#9fbcac'; ctx.lineWidth = 2
    for (let i = 0; i <= BOARD_GRID_SIZE - 2; i++) {
      const p = i * 1024 / (BOARD_GRID_SIZE - 2)
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 1024); ctx.moveTo(0, p); ctx.lineTo(1024, p); ctx.stroke()
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#547e6f'; ctx.font = '600 44px sans-serif'
    ctx.fillText('大富翁世界之旅', 512, 500)
    ctx.font = '20px sans-serif'; ctx.fillText('WORLD TOUR', 512, 544)
  })
  const center = new THREE.Mesh(new THREE.PlaneGeometry(TILE_SIZE * (BOARD_GRID_SIZE - 2), TILE_SIZE * (BOARD_GRID_SIZE - 2)), new THREE.MeshStandardMaterial({ map: centerMap, roughness: 1 }))
  center.rotation.x = -Math.PI / 2; center.position.y = .185; center.receiveShadow = true; scene.add(center)

  const lots: THREE.Mesh[] = []
  const lotGeometry = new THREE.BoxGeometry(TILE_SIZE, .12, TILE_SIZE)
  const cornerLotGeometry = cornerFootprint(TILE_SIZE, .12)
  const padGeometry = new THREE.BoxGeometry(TILE_SIZE * .9, .025, TILE_SIZE * .9)
  const lotMaterial = new THREE.MeshStandardMaterial({ color: '#c2ccbb', roughness: 1 })
  const padMaterial = new THREE.MeshStandardMaterial({ color: '#b3c4a5', roughness: 1 })
  const models: THREE.Group[] = []
  const airport = airportLandmark(), utility = utilityLandmark()
  const symbols = { chance: eventLandmark('chance'), fate: eventLandmark('fate') }
  const district = bangkokDistrict()
  const place = (model: THREE.Group, index: number) => {
    const bounds = new THREE.Box3().setFromObject(model)
    // Preserve the authored central axis; asymmetric details must not shift the building.
    const extent = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x), Math.abs(bounds.min.z), Math.abs(bounds.max.z))
    const scale = TILE_SIZE * .9 / (extent * 2)
    model.scale.setScalar(scale); model.position.set(0, -bounds.min.y * scale, 0)
    const display = new THREE.Group(), inward = inwardAt(index)
    display.add(model); display.position.copy(landmarkPosition(index)); display.position.y = .155
    display.rotation.y = Math.atan2(inward.x, inward.z)
    display.traverse((object) => { object.userData.tileIndex = index })
    scene.add(display); models.push(display)
  }
  for (const tile of BOARD) {
    const position = landmarkPosition(tile.index)
    if (tile.kind === 'go' || tile.kind === 'jail' || tile.kind === 'hospital' || tile.kind === 'go_to_jail') {
      // Quarter turns preserve the three-cell L instead of rotating it diagonally.
      const angle = -tile.index / BOARD_SIDE_STEPS * Math.PI / 2
      const lot = new THREE.Mesh(cornerLotGeometry, lotMaterial)
      lot.position.copy(position); lot.position.y = .02; lot.rotation.y = angle
      lot.receiveShadow = true; lot.userData.tileIndex = tile.index; scene.add(lot); lots.push(lot)
      const model = cornerLandmark(tile.kind)
      model.scale.setScalar(TILE_SIZE / CORNER_CELL_SIZE)
      model.position.copy(position); model.position.y = .155; model.rotation.y = angle
      model.traverse((object) => { object.userData.tileIndex = tile.index })
      scene.add(model); models.push(model)
      for (const [x, z] of [[0, 0], [-TILE_SIZE, 0], [0, -TILE_SIZE]]) {
        const at = new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).add(position)
        // The outer lot top is .08; the main route's taller tiles are a separate row.
        grounding.add({ x: at.x, y: .087, z: at.z, width: 4.1, depth: 4.1, rotation: angle, shape: 'rounded', opacity: .2 })
      }
      continue
    }
    const lot = new THREE.Mesh(lotGeometry, lotMaterial)
    lot.position.copy(position); lot.position.y = .08; lot.receiveShadow = true; lot.userData.tileIndex = tile.index
    scene.add(lot); lots.push(lot)
    grounding.add({ x: position.x, y: .147, z: position.z, width: 3.98, depth: 3.98, shape: 'rounded', opacity: .22 })
    let model: THREE.Group | null = null
    if (tile.id === '曼谷') model = district.group
    else if (tile.id === '新加坡') model = singaporeLandmark()
    else if (tile.id === '东京') model = tokyoLandmark()
    else if (tile.id === '首尔') model = seoulLandmark()
    else if (tile.id === '悉尼') model = sydneyLandmark()
    else if (tile.id === '墨尔本') model = melbourneLandmark()
    else if (tile.id === '迪拜') model = dubaiLandmark()
    else if (tile.id === '伊斯坦布尔') model = istanbulLandmark()
    else if (tile.id === '开罗') model = cairoLandmark()
    else if (tile.id === '雅典') model = athensLandmark()
    else if (tile.id === '罗马') model = romeLandmark()
    else if (tile.id === '维也纳') model = viennaLandmark()
    else if (tile.id === '柏林') model = berlinLandmark()
    else if (tile.id === '阿姆斯特丹') model = amsterdamLandmark()
    else if (tile.id === '巴塞罗那') model = barcelonaLandmark()
    else if (tile.id === '巴黎') model = parisLandmark()
    else if (tile.id === '伦敦') model = londonLandmark()
    else if (tile.id === '多伦多') model = torontoLandmark()
    else if (tile.id === '纽约') model = newYorkLandmark()
    else if (tile.id === '洛杉矶') model = losAngelesLandmark()
    else if (tile.id === '旧金山') model = sanFranciscoLandmark()
    else if (tile.id === '香港') model = hongKongLandmark()
    else if (tile.id === '上海') model = shanghaiLandmark()
    else if (tile.id === '北京') model = beijingLandmark()
    else if (tile.kind === 'item') model = itemLandmark()
    else if (tile.kind === 'tax') model = taxLandmark(tile.id === 'income' ? 'income' : 'maintenance')
    else if (tile.kind === 'airport') model = airport.clone(true)
    else if (tile.kind === 'utility') {
      model = utility.clone(true); model.add(utilityBadge(tile.utilityKind ?? 'water'))
    } else if (tile.kind === 'chance' || tile.kind === 'fate') {
      model = symbols[tile.kind].clone(true)
    }
    if (model) place(model, tile.index)
    else {
      const pad = new THREE.Mesh(padGeometry, padMaterial)
      pad.position.y = .073; pad.receiveShadow = true; pad.userData.tileIndex = tile.index; lot.add(pad)
    }
  }

  // Background scenery stays beyond the complete ring of landmark lots.
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2, distance = WORLD_SIZE * 1.3
    const mountain = solid(scene, new THREE.ConeGeometry(5 + i % 3, 4 + i % 4, 5), i % 2 ? '#87b5b3' : '#96bebb', Math.sin(angle) * distance, -.6, Math.cos(angle) * distance)
    mountain.rotation.y = angle; mountain.scale.z = .75
  }
  // Decorative scenery rests while players think; gameplay objects animate separately.
  models.forEach(model => optimizeStaticModel(model, new Set()))
  return {
    models,
    lots,
  }
}
