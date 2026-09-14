import type { TileDefinition, TileState } from './types.js'

export const MAX_PROPERTY_LEVEL = 4

const groups = {
  brown: '#8b644c',
  sky: '#62b7d0',
  rose: '#d75e8d',
  orange: '#e9852e',
  red: '#cf4545',
  yellow: '#e0b72f',
  green: '#3f9569',
  navy: '#315d91',
} as const

function property(
  name: string,
  group: keyof typeof groups,
  price: number,
  buildCost: number,
  rents: readonly [number, number, number, number, number],
): Omit<TileDefinition, 'index'> {
  return {
    id: name,
    kind: 'property',
    name,
    group,
    color: groups[group],
    price,
    mortgage: price / 2,
    buildCost,
    rents,
  }
}

const route: readonly Omit<TileDefinition, 'index'>[] = [
  { id: 'go', kind: 'go', name: '启程' },
  property('曼谷', 'brown', 1000, 400, [120, 320, 650, 1100, 2500]),
  { id: 'fate-south', kind: 'fate', name: '命运' },
  property('新加坡', 'brown', 1200, 400, [150, 360, 720, 1200, 2700]),
  { id: 'income', kind: 'tax', name: '所得税', taxAmount: 1200 },
  { id: 'item-south', kind: 'item', name: '道具补给' },
  { id: 'airport-south', kind: 'airport', name: '云海机场', price: 2000, mortgage: 1000 },
  property('东京', 'sky', 1400, 500, [180, 430, 850, 1400, 3000]),
  { id: 'chance-south', kind: 'chance', name: '机会' },
  property('首尔', 'sky', 1400, 500, [180, 430, 850, 1400, 3000]),
  property('悉尼', 'sky', 1600, 500, [210, 480, 950, 1500, 3200]),
  { id: 'jail', kind: 'jail', name: '监狱 / 探访' },
  property('墨尔本', 'rose', 1800, 600, [240, 540, 1050, 1650, 3400]),
  {
    id: 'electric',
    kind: 'utility',
    name: '电力公司',
    price: 1500,
    mortgage: 750,
    utilityKind: 'electric',
  },
  property('迪拜', 'rose', 1800, 600, [240, 540, 1050, 1650, 3400]),
  property('伊斯坦布尔', 'rose', 2000, 600, [270, 600, 1150, 1800, 3600]),
  property('开罗', 'orange', 2100, 650, [285, 630, 1200, 1875, 3750]),
  { id: 'airport-west', kind: 'airport', name: '星湾机场', price: 2000, mortgage: 1000 },
  property('雅典', 'orange', 2200, 700, [300, 660, 1250, 1950, 3900]),
  { id: 'fate-west', kind: 'fate', name: '命运' },
  property('罗马', 'orange', 2200, 700, [300, 660, 1250, 1950, 3900]),
  property('维也纳', 'orange', 2400, 700, [330, 720, 1350, 2100, 4100]),
  { id: 'hospital', kind: 'hospital', name: '医院 / 探访' },
  property('柏林', 'red', 2600, 800, [360, 780, 1450, 2250, 4400]),
  { id: 'chance-north', kind: 'chance', name: '机会' },
  property('阿姆斯特丹', 'red', 2600, 800, [360, 780, 1450, 2250, 4400]),
  property('巴塞罗那', 'red', 2800, 800, [390, 840, 1550, 2400, 4600]),
  { id: 'item-north', kind: 'item', name: '道具补给' },
  { id: 'airport-north', kind: 'airport', name: '金穗机场', price: 2000, mortgage: 1000 },
  property('巴黎', 'yellow', 3000, 900, [420, 900, 1650, 2550, 4900]),
  property('伦敦', 'yellow', 3000, 900, [420, 900, 1650, 2550, 4900]),
  {
    id: 'water',
    kind: 'utility',
    name: '水利公司',
    price: 1500,
    mortgage: 750,
    utilityKind: 'water',
  },
  property('多伦多', 'yellow', 3200, 900, [450, 960, 1750, 2700, 5200]),
  { id: 'go_to_jail', kind: 'go_to_jail', name: '立即入狱' },
  property('纽约', 'green', 3400, 1000, [480, 1020, 1850, 2850, 5500]),
  property('洛杉矶', 'green', 3400, 1000, [480, 1020, 1850, 2850, 5500]),
  { id: 'fate-east', kind: 'fate', name: '命运' },
  property('旧金山', 'green', 3600, 1000, [510, 1080, 1950, 3000, 5800]),
  property('香港', 'green', 3700, 1100, [530, 1120, 2025, 3125, 6000]),
  { id: 'airport-east', kind: 'airport', name: '天际机场', price: 2000, mortgage: 1000 },
  { id: 'chance-east', kind: 'chance', name: '机会' },
  property('上海', 'navy', 3800, 1200, [550, 1160, 2100, 3250, 6200]),
  { id: 'maintenance', kind: 'tax', name: '城市维护', taxAmount: 800 },
  property('北京', 'navy', 4000, 1200, [600, 1250, 2250, 3500, 6600]),
]

export const BOARD: readonly TileDefinition[] = route.map((tile, index) => ({ ...tile, index }))
export const BOARD_SIDE_STEPS = BOARD.length / 4
export const BOARD_GRID_SIZE = BOARD_SIDE_STEPS + 1

export function getTileById(id: string): TileDefinition {
  const tile = BOARD.find((entry) => entry.id === id)
  if (!tile) throw new Error(`Unknown tile id: ${id}`)
  return tile
}

export function createTileStates(): TileState[] {
  return BOARD.map(() => ({ ownerId: null, level: 0, mortgaged: false }))
}

export function getTile(index: number): TileDefinition {
  const tile = BOARD[index]
  if (!tile) {
    throw new Error(`Unknown tile index: ${index}`)
  }
  return tile
}

export function isOwnable(tile: TileDefinition): boolean {
  return tile.kind === 'property' || tile.kind === 'airport' || tile.kind === 'utility'
}
