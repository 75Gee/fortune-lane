import { BOARD, MAX_PROPERTY_LEVEL } from './board.js'
import type { GameState, WheelOutcome } from './types.js'

export const WHEEL_SPIN_MS = 3000
export const DICE_ROLL_MS = 1850
export const WHEEL_OUTCOMES: readonly WheelOutcome[] = ['gain_cash', 'gain_house', 'lose_cash', 'lose_house']
export const WHEEL_SECTORS: readonly WheelOutcome[] = [...WHEEL_OUTCOMES, ...WHEEL_OUTCOMES]
export const WHEEL_LABELS: Record<WheelOutcome, string> = {
  gain_cash: '获得 2000 元', lose_cash: '支付 2000 元', gain_house: '城市升一级', lose_house: '城市降一级',
}

export function wheelProperties(game: Pick<GameState, 'tiles'>, playerId: string, outcome: WheelOutcome | null) {
  return BOARD.filter((tile) => {
    const asset = game.tiles[tile.index]
    if (tile.kind !== 'property' || asset?.ownerId !== playerId || asset.mortgaged) return false
    return outcome === 'gain_house' ? asset.level < MAX_PROPERTY_LEVEL : outcome === 'lose_house' && asset.level > 0
  })
}
