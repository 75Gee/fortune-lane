import { getTile, type GameView } from '@fortune/game'

export function decisionId(game: GameView): string | null {
  return game.pendingAuction?.id ?? game.pendingWheel?.id ?? game.pendingCardProperty?.id
    ?? game.pendingCardChoice?.id ?? (game.pendingDecision ? `${game.turnNumber}-${game.pendingDecision.type}-${game.pendingDecision.tileIndex}` : null)
}

export function needsDecision(game: GameView, playerId: string): boolean {
  if (!game.players.some(player => player.id === playerId && !player.isBankrupt)) return false
  if (game.pendingAuction) return game.pendingAuction.participantIds.includes(playerId) && !Object.hasOwn(game.pendingAuction.bids, playerId)
  return game.pendingDecision?.playerId === playerId || game.pendingCardChoice?.playerId === playerId
    || game.pendingCardProperty?.playerId === playerId || game.pendingWheel?.playerId === playerId
}

export function actionDescription(game: GameView): string {
  if (game.pendingAuction) return `竞拍${getTile(game.pendingAuction.tileIndex).name}`
  if (game.pendingDecision) return `${game.pendingDecision.type === 'purchase' ? '考虑购买' : '考虑升级'}${getTile(game.pendingDecision.tileIndex).name}`
  if (game.pendingWheel) return game.pendingWheel.stage === 'spinning' ? '幸运转盘转动中' : game.pendingWheel.stage === 'choosing' ? '选择地产' : '准备启动转盘'
  if (game.pendingCardChoice) return '正在抽卡'
  if (game.pendingCardProperty) return '选择降级地产'
  if (game.pendingDebt) return '正在筹款'
  return game.phase === 'WAITING_FOR_ROLL' ? '准备掷骰' : game.phase === 'FINISHED' ? '对局结束' : '准备结束回合'
}
