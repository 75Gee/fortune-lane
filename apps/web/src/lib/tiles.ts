import type { TileDefinition } from '@fortune/game'

const GROUP_LABELS: Record<string, string> = {
  brown: '棕色组',
  sky: '天蓝组',
  rose: '玫红组',
  orange: '橙色组',
  red: '红色组',
  yellow: '黄色组',
  green: '绿色组',
  navy: '藏青组',
}

/** Short label for a tile's set: colour group for cities, otherwise its kind. */
export function tileSetLabel(tile: TileDefinition): string {
  if (tile.kind === 'airport') return '机场'
  if (tile.kind === 'utility') return '公共事业'
  return (tile.group && GROUP_LABELS[tile.group]) ?? '地产'
}
