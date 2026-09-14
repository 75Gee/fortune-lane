import { assetActionQuote, canRollAgain, getTile, isDetained, JAIL_FINE, type GameCommand, type GameView } from '@fortune/game'
import { Banknote, Building2, ChevronRight, CircleDollarSign, Dice5, DoorOpen, HandCoins, Info, ShieldCheck } from 'lucide-react'
import { actionDescription } from '../decisionState.js'
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`

export function ActionPanel({ game, playerId, onCommand, busy = false, waitingLabel = '行动进行中…', onSkipToLive, onManageAssets, onWatch }: { game: GameView; playerId: string; onCommand: (command: GameCommand) => void } & { busy?: boolean; waitingLabel?: string; onSkipToLive?: (() => void) | undefined; onManageAssets: () => void; onWatch?: (() => void) | undefined }) {
  const me = game.players.find((player) => player.id === playerId)
  const isMyTurn = game.currentPlayerId === playerId
  if (busy) return <div className="turn-action waiting-action"><span className="waiting-pulse" /><strong>{waitingLabel}</strong>{onSkipToLive && <button className="return-live" onClick={onSkipToLive}>返回当前操作</button>}</div>

  if (!me || me.isBankrupt || !isMyTurn) {
    const current = game.players.find(player => player.id === game.currentPlayerId)
    return <div className="turn-action waiting-action"><span className="waiting-pulse" /><div><strong>{current?.name} · {actionDescription(game)}</strong>{(me?.isBankrupt || !current?.connected) && <p>{me?.isBankrupt ? '你正在观战' : '已离线，超时自动行动'}</p>}</div>{onWatch && <button className="return-live" onClick={onWatch}>查看</button>}</div>
  }
  if (game.pendingDecision) {
    const decision = game.pendingDecision
    const purchase = decision.type === 'purchase'
    const tile = getTile(decision.tileIndex)
    const action = purchase ? 'BUY_PROPERTY' : 'UPGRADE_PROPERTY'
    const quote = assetActionQuote(game, playerId, tile.index, action)
    return <div className="turn-action property-action"><div><strong>{tile.name}</strong><span>{purchase ? '购入地产' : `升级至 ${game.tiles[tile.index]!.level + 1} 级`}</span></div>
      <div className="property-commands"><button onClick={() => onCommand({ type: purchase ? 'SKIP_PURCHASE' : 'SKIP_UPGRADE' })}>{purchase ? '交给其他人竞拍' : '暂不升级'}</button>
        <button className="primary-command" disabled={!quote.allowed} title={quote.reason ?? undefined} onClick={() => onCommand({ type: action })}>{purchase ? '购买' : '升级'} {money(quote.amount)}</button></div>
    </div>
  }
  if (!['WAITING_FOR_ROLL', 'WAITING_FOR_END_TURN', 'WAITING_FOR_DEBT'].includes(game.phase)) {
    return <div className="turn-action waiting-action"><Info size={20} /><strong>{actionDescription(game)}</strong>{onWatch && <button className="return-live" onClick={onWatch}>查看</button>}</div>
  }

  if (game.phase === 'WAITING_FOR_ROLL') {
    if (isDetained(me)) {
      return (
        <div className="turn-action">
          <div className="action-heading"><DoorOpen size={20} /><div><strong>准备{me.isInHospital ? '出院' : '出狱'}</strong><span>{me.jailTurns >= 2 ? `第3次未掷出对子，将支付 ${money(JAIL_FINE)}` : `掷骰机会：第 ${me.jailTurns + 1}/3 次`}</span></div></div>
          <div className="action-grid">
            <button onClick={() => onCommand({ type: 'TRY_JAIL_ROLL' })}><Dice5 size={18} /> 掷对子</button>
            <button disabled={me.cash < JAIL_FINE} onClick={() => onCommand({ type: 'PAY_JAIL_FINE' })}><Banknote size={18} /> 支付 {money(JAIL_FINE)}</button>
            <button disabled={!me.heldCards.length} onClick={() => onCommand({ type: 'USE_JAIL_CARD' })}><ShieldCheck size={18} />{me.heldCards.length ? `通行许可 · ${me.heldCards.length}张` : '暂无通行许可'}</button>
          </div>
        </div>
      )
    }
    return (
      <div className="turn-action roll-action">
        <div><strong>轮到你了</strong>{me.turtleRollsRemaining > 0 && <span>乌龟效果 · 剩余 {me.turtleRollsRemaining} 次</span>}</div>
        <button className="roll-command" onClick={() => onCommand({ type: 'ROLL_DICE' })}>
          <Dice5 size={25} /> {me.turtleRollsRemaining > 0 ? '掷单骰' : '掷骰子'}
        </button>
      </div>
    )
  }

  if (game.phase === 'WAITING_FOR_DEBT' && game.pendingDebt) {
    const difference = Math.max(0, game.pendingDebt.amount - me.cash)
    return (
      <div className="turn-action debt-action">
        <div className="action-heading"><HandCoins size={20} /><div><strong>需要支付 {money(game.pendingDebt.amount)}</strong><span>{game.pendingDebt.reason} · 收款：{game.players.find((player) => player.id === game.pendingDebt?.creditorId)?.name ?? '银行'}</span></div></div>
        <p>{difference > 0 ? `还差 ${money(difference)}，可卖房或抵押筹款；超时未筹齐将破产` : '钱已凑齐，可以付款了'}</p>
        <div className="decision-buttons">
          <button className="accept" disabled={difference > 0} onClick={() => onCommand({ type: 'SETTLE_DEBT' })}><CircleDollarSign size={18} /> 支付欠款</button>
          <button onClick={onManageAssets}><Building2 size={18} />卖房 / 抵押</button>
          <button className="danger" onClick={() => onCommand({ type: 'DECLARE_BANKRUPTCY' })}>放弃筹款</button>
        </div>
      </div>
    )
  }

  if (game.phase === 'WAITING_FOR_END_TURN') {
    const extra = canRollAgain(game, playerId)
    return (
      <div className="turn-action end-action">
        <div><span>{extra ? `已连续 ${game.consecutiveDoubles} 次对子` : '本回合已完成'}</span><strong>{extra ? game.consecutiveDoubles >= 2 ? '再掷出对子将入狱' : '你还可以再行动一次' : '确认后轮到下一位'}</strong></div>
        <button className="primary-command" onClick={() => onCommand({ type: extra ? 'ROLL_AGAIN' : 'END_TURN' })}>
          {extra ? <Dice5 size={19} /> : <ChevronRight size={19} />}{extra ? '再掷一次' : '结束回合'}
        </button>
      </div>
    )
  }

  return null
}
