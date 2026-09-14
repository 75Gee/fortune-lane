import { BOARD, MAX_PROPERTY_LEVEL, isOwnable } from './board.js'
import { buildingSaleValue, redeemCost } from './economy.js'
import { isDetained } from './items.js'
import type { GameState, LiquidationSelection } from './types.js'

type AssetState = Pick<GameState, 'phase' | 'currentPlayerId' | 'players' | 'tiles' | 'pendingDecision'>
export type AssetAction = 'BUY_PROPERTY' | 'UPGRADE_PROPERTY' | 'MORTGAGE_ASSET' | 'REDEEM_ASSET' | 'SELL_BUILDING'
export interface ActionQuote { allowed: boolean; reason: string | null; amount: number; balanceAfter: number }

export function canManageAssets(state: Pick<AssetState, 'phase' | 'currentPlayerId' | 'players'>, playerId: string): boolean {
  return state.currentPlayerId === playerId
    && !!state.players.find(player => player.id === playerId && !player.isBankrupt)
    && ['WAITING_FOR_ROLL', 'WAITING_FOR_END_TURN', 'WAITING_FOR_DEBT'].includes(state.phase)
}

/** Positive amount is a payment; negative amount is cash received. */
export function assetActionQuote(state: AssetState, playerId: string, tileIndex: number, action: AssetAction): ActionQuote {
  const player = state.players.find(entry => entry.id === playerId)
  const tile = BOARD[tileIndex], asset = state.tiles[tileIndex]
  const amount = !tile ? 0 : action === 'BUY_PROPERTY' ? tile.price ?? 0
    : action === 'UPGRADE_PROPERTY' ? tile.buildCost ?? 0
    : action === 'REDEEM_ASSET' ? redeemCost(tileIndex)
    : action === 'SELL_BUILDING' ? -buildingSaleValue(tileIndex) : -(tile.mortgage ?? 0)
  const result = (reason: string | null): ActionQuote => ({ allowed: reason === null, reason, amount, balanceAfter: (player?.cash ?? 0) - amount })
  if (!player || player.isBankrupt || state.phase === 'FINISHED') return result('观战时不能管理资产')
  if (state.currentPlayerId !== playerId) return result('轮到你时可以操作')
  if (!tile || !asset || !isOwnable(tile)) return result('此处不是可管理的资产')
  if (action === 'BUY_PROPERTY' || action === 'UPGRADE_PROPERTY') {
    const phase = action === 'BUY_PROPERTY' ? 'WAITING_FOR_PURCHASE' : 'WAITING_FOR_UPGRADE'
    if (state.phase !== phase || state.pendingDecision?.playerId !== playerId || state.pendingDecision.tileIndex !== tileIndex) return result('请先到达这处地产')
  } else if (!canManageAssets(state, playerId)) return result('完成当前决策后可以管理资产')
  if (action === 'BUY_PROPERTY') {
    if (asset.ownerId) return result('该资产已经被购买')
  } else {
    if (asset.ownerId !== playerId) return result('你不拥有该资产')
    if (action === 'MORTGAGE_ASSET') {
      if (asset.mortgaged) return result('该资产已经抵押')
      if (asset.level > 0) return result('请先出售建筑')
    }
    if (action === 'REDEEM_ASSET' && !asset.mortgaged) return result('该资产未被抵押')
    if (action === 'UPGRADE_PROPERTY' && (tile.kind !== 'property' || asset.level >= MAX_PROPERTY_LEVEL || asset.mortgaged)) return result('该地产不能继续升级')
    if (action === 'SELL_BUILDING' && (tile.kind !== 'property' || asset.level <= 0)) return result('没有可出售的建筑')
  }
  if (amount > player.cash) return result(`现金不足，还差 ¥${(amount - player.cash).toLocaleString('zh-CN')}`)
  return result(null)
}

export function canRollAgain(state: Pick<GameState, 'phase' | 'currentPlayerId' | 'lastRoll' | 'players'>, playerId: string): boolean {
  const player = state.players.find(entry => entry.id === playerId)
  return !!player && !player.isBankrupt && !isDetained(player) && state.currentPlayerId === playerId
    && state.phase === 'WAITING_FOR_END_TURN' && !!state.lastRoll?.isDouble
}

export function liquidationQuote(state: AssetState & Pick<GameState, 'pendingDebt'>, playerId: string, selections: readonly LiquidationSelection[]) {
  const player = state.players.find(entry => entry.id === playerId)
  const debt = state.pendingDebt
  let proceeds = 0, buildingLoss = 0
  const result = (reason: string | null) => ({ allowed: reason === null, reason, proceeds, buildingLoss,
    cashAfter: (player?.cash ?? 0) + proceeds - (debt?.amount ?? 0),
    remaining: Math.max(0, (debt?.amount ?? 0) - (player?.cash ?? 0) - proceeds) })
  if (!player || !canManageAssets(state, playerId) || state.phase !== 'WAITING_FOR_DEBT' || debt?.debtorId !== playerId) return result('当前没有需要筹款的欠款')
  if (!selections.length || selections.length > BOARD.length) return result('选择要出售或抵押的资产')
  const seen = new Set<number>()
  for (const selection of selections) {
    const { tileIndex, sellLevels, mortgage } = selection
    const tile = BOARD[tileIndex], asset = state.tiles[tileIndex]
    if (!Number.isInteger(tileIndex) || !tile || !asset || seen.has(tileIndex)) return result('资产选择无效或重复')
    seen.add(tileIndex)
    if (!isOwnable(tile) || asset.ownerId !== playerId || asset.mortgaged) return result(`${tile.name}当前不能出售或抵押`)
    if (!Number.isInteger(sellLevels) || sellLevels < 0 || sellLevels > asset.level || typeof mortgage !== 'boolean'
      || (sellLevels > 0 && tile.kind !== 'property') || (!sellLevels && !mortgage)) return result(`${tile.name}的出售数量无效`)
    if (mortgage && asset.level !== sellLevels) return result(`请先出售${tile.name}的全部建筑再抵押`)
    proceeds += sellLevels * buildingSaleValue(tileIndex) + (mortgage ? tile.mortgage ?? 0 : 0)
    buildingLoss += sellLevels * ((tile.buildCost ?? 0) - buildingSaleValue(tileIndex))
  }
  const remaining = Math.max(0, debt.amount - player.cash - proceeds)
  return result(remaining ? `还需筹集 ¥${remaining.toLocaleString('zh-CN')}` : null)
}
