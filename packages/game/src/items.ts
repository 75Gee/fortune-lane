import { BOARD } from './board.js'
import type { GameState, ItemKind, PlayerState } from './types.js'

type ItemUseState = Pick<GameState, 'players' | 'currentPlayerId' | 'phase' | 'itemUsedThisTurn' | 'extraMove'>

export const TURTLE_ROLLS = 2

export const ITEMS: Record<ItemKind, { name: string; description: string; image: string }> = {
  turtle: { name: '乌龟卡', description: `指定一名玩家，接下来的${TURTLE_ROLLS}次常规掷骰只能掷一颗骰子，不叠加、不刷新。出狱、出院、计费骰和自选骰子不消耗次数。`, image: '/assets/items/turtle.png' },
  'chosen-die': { name: '自选骰子', description: '指定 1–6 点，额外前进并结算落点。保留原本的行动机会；入狱或住院仍会结束回合。', image: '/assets/items/chosen-die.png' },
  roadblock: { name: '路障卡', description: '在脚下或前后两格内选择一格放置路障。下一位经过或到达的玩家停在这里，路障消耗后照常结算落点。自己也会被拦截，放置时不触发。', image: '/assets/items/roadblock.png' },
  bomb: { name: '炸弹卡', description: '在脚下或前后两格内选择一格放置炸弹。下一位经过或到达的玩家立即住院，炸弹消失。自己也可能踩中，放置时不触发。', image: '/assets/items/bomb.png' },
}
export const ITEM_KINDS = Object.keys(ITEMS) as ItemKind[]

export function isDetained(player: PlayerState): boolean {
  return player.isInJail || player.isInHospital
}

export function canUseItems(state: ItemUseState, playerId: string): boolean {
  return itemUseBlockReason(state, playerId) === null
}

export function itemUseBlockReason(state: ItemUseState, playerId: string): string | null {
  const player = state.players.find((entry) => entry.id === playerId)
  if (!player || player.isBankrupt || state.phase === 'FINISHED') return '当前可以查看道具规则，不能使用道具。'
  if (state.currentPlayerId !== playerId) return '道具已保存，轮到你时可以使用。'
  if (isDetained(player)) return '住院或服刑期间不能使用道具，离开后即可使用。'
  if (state.itemUsedThisTurn) return '本回合已使用一张道具，下一回合可再次使用；对子追加行动不重置额度。'
  if (state.extraMove || (state.phase !== 'WAITING_FOR_ROLL' && state.phase !== 'WAITING_FOR_END_TURN')) return '请先完成当前行动和落点结算，再使用道具。'
  return null
}

export function itemPlacementOptions(position: number) {
  return [-2, -1, 0, 1, 2].map(offset => ({
    tileIndex: (position + offset + BOARD.length) % BOARD.length,
    label: offset === 0 ? '脚下' : `${offset > 0 ? '前' : '后'} ${Math.abs(offset)} 格`,
  }))
}

export function itemPlacementBlockReason(state: Pick<GameState, 'hazards' | 'players'>, playerId: string, tileIndex: number): string | null {
  const player = state.players.find(entry => entry.id === playerId)
  if (!player || !Number.isInteger(tileIndex) || !itemPlacementOptions(player.position).some(option => option.tileIndex === tileIndex)) return '只能放在脚下或前后两格内。'
  const ownHazard = state.hazards.find((hazard) => hazard.ownerId === playerId)
  if (ownHazard) return `你在${BOARD[ownHazard.tileIndex]!.name}的${ITEMS[ownHazard.kind].name}尚未触发，消耗后才能再放置路障或炸弹。`
  if (state.hazards.some((hazard) => hazard.tileIndex === tileIndex)) return '此格已有路障或炸弹，不能重复放置。'
  return null
}

/** The preview and the server use the same path, including the first hazard encountered. */
export function movementPreview(state: Pick<GameState, 'hazards'>, from: number, steps: number) {
  const path: number[] = []
  let hazard: GameState['hazards'][number] | undefined
  for (let count = 1; count <= Math.abs(steps); count += 1) {
    const index = ((from + Math.sign(steps) * count) % BOARD.length + BOARD.length) % BOARD.length
    path.push(index)
    hazard = state.hazards.find((entry) => entry.tileIndex === index)
    if (hazard) break
  }
  return { path, hazard, destination: path.at(-1) ?? from }
}
