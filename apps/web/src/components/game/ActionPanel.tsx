import {
  canRollAgain,
  getTile,
  isDetained,
  ITEMS,
  JAIL_FINE,
  stockPaymentQuote,
  type GameCommand,
  type GameView,
  type ItemKind,
} from '@fortune/game'
import { Banknote, Building2, ChevronRight, CircleDollarSign, Dice5, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatMoney } from '../../lib/format.js'
import { TokenImage } from '../TokenImage.js'
import { Button } from '../../ui/index.js'
import { actionDescription } from '../decisionState.js'
import { StockPaymentHint } from '../stocks/StockPaymentHint.js'
import styles from './ActionTicket.module.css'
import { PropertyDecision } from './PropertyDecision.js'

interface ActionPanelProps {
  game: GameView
  playerId: string
  onCommand: (command: GameCommand) => void
  busy?: boolean
  waitingLabel?: string
  onSkipToLive?: (() => void) | undefined
  onManageAssets: () => void
  onOpenItems: (item?: ItemKind) => void
  onWatch?: (() => void) | undefined
}

function WaitingSlip({
  title,
  detail,
  action,
  player,
}: {
  title: string
  detail?: string | undefined
  action?: ReactNode
  /** Whose turn it is, shown as their token so spectators see at a glance who is acting. */
  player?: GameView['players'][number] | undefined
}) {
  return (
    <div className={styles.waiting} role="status">
      {player ? (
        <span className={styles.actor} style={{ borderColor: player.color }}>
          <TokenImage token={player.token} alt="" />
          <span className={styles.pulse} />
        </span>
      ) : (
        <span className={styles.pulse} />
      )}
      <div>
        <strong>{title}</strong>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </div>
  )
}

function Ticket({ children, stub, compact }: { children: ReactNode; stub: ReactNode; compact?: boolean }) {
  return (
    <section className={`${styles.ticket} ${compact ? styles.compact : ''}`}>
      <div className={styles.body}>{children}</div>
      <div className={styles.stub}>{stub}</div>
    </section>
  )
}

export function ActionPanel({
  game,
  playerId,
  onCommand,
  busy = false,
  waitingLabel = '行动进行中…',
  onSkipToLive,
  onManageAssets,
  onOpenItems,
  onWatch,
}: ActionPanelProps) {
  const me = game.players.find((player) => player.id === playerId)
  const isMyTurn = game.currentPlayerId === playerId
  const watchButton = onWatch && (
    <Button size="sm" variant="outline" onClick={onWatch}>
      查看
    </Button>
  )

  if (busy)
    return (
      <WaitingSlip
        title={waitingLabel}
        action={
          onSkipToLive && (
            <Button size="sm" variant="outline" onClick={onSkipToLive}>
              返回当前操作
            </Button>
          )
        }
      />
    )

  if (!me || me.isBankrupt || !isMyTurn) {
    const current = game.players.find((player) => player.id === game.currentPlayerId)
    return (
      <WaitingSlip
        title={
          game.pendingAuction
            ? `${actionDescription(game)} · 等待揭晓`
            : `${current?.name ?? '当前玩家'} · ${actionDescription(game)}`
        }
        detail={me?.isBankrupt ? '你正在观战' : !current?.connected ? '已离线，超时自动行动' : undefined}
        action={watchButton}
        player={game.pendingAuction ? undefined : current}
      />
    )
  }

  if (game.pendingDecision?.playerId === playerId)
    return (
      <PropertyDecision
        key={`${game.turnNumber}:${game.pendingDecision.tileIndex}:${game.pendingDecision.type}`}
        game={game}
        playerId={playerId}
        onCommand={onCommand}
      />
    )

  if (!['WAITING_FOR_ROLL', 'WAITING_FOR_END_TURN', 'WAITING_FOR_DEBT'].includes(game.phase))
    return <WaitingSlip title={actionDescription(game)} action={watchButton} />

  if (game.phase === 'WAITING_FOR_ROLL' && isDetained(me)) {
    const payment = stockPaymentQuote(game, playerId, JAIL_FINE)
    const place = me.isInHospital ? '出院' : '出狱'
    return (
      <Ticket
        stub={
          <div className={styles.commands}>
            <Button
              variant="primary"
              size="lg"
              icon={<Dice5 size={18} />}
              onClick={() => onCommand({ type: 'TRY_JAIL_ROLL' })}
            >
              掷对子
            </Button>
            <span className={styles.hint}>掷出对子即可{place}</span>
          </div>
        }
      >
        <span className={styles.eyebrow}>
          {me.isInHospital ? '住院中' : '服刑中'} · 第 {Math.min(me.jailTurns + 1, 3)}/3 次掷骰
        </span>
        <h2 className={styles.title}>准备{place}</h2>
        <p className={styles.note}>
          {me.jailTurns >= 2
            ? `第 3 次仍未掷出对子，将支付 ${formatMoney(JAIL_FINE)}`
            : '也可以直接付款或使用通行许可。'}
        </p>
        <div className={styles.actionsGrid}>
          <Button
            variant="outline"
            icon={<Banknote size={17} />}
            disabled={!payment.allowed}
            title={payment.reason ?? undefined}
            onClick={() => onCommand({ type: 'PAY_JAIL_FINE', stockFunding: payment.stockFunding })}
          >
            {payment.stockFunding && payment.allowed ? '卖股并支付' : '支付'} {formatMoney(JAIL_FINE)}
          </Button>
          <Button
            variant="outline"
            icon={<ShieldCheck size={17} />}
            disabled={!me.heldCards.length}
            onClick={() => onCommand({ type: 'USE_JAIL_CARD' })}
          >
            {me.heldCards.length ? `通行许可 · ${me.heldCards.length}张` : '暂无通行许可'}
          </Button>
        </div>
        <StockPaymentHint payment={payment} />
      </Ticket>
    )
  }

  if (game.phase === 'WAITING_FOR_ROLL') {
    const turtle = me.turtleRollsRemaining > 0
    const canUseItem = me.items.length > 0 && !game.itemUsedThisTurn
    return (
      <Ticket
        compact
        stub={
          <Button
            variant="primary"
            className={styles.rollButton}
            icon={<Dice5 size={40} strokeWidth={1.8} />}
            onClick={() => onCommand({ type: 'ROLL_DICE' })}
          >
            {turtle ? '掷单骰' : '掷骰子'}
          </Button>
        }
      >
        <span className={styles.eyebrow}>当前位置 · {getTile(me.position).name}</span>
        <h2 className={styles.title}>轮到你了</h2>
        {turtle && <p className={styles.note}>乌龟效果：本次只掷一颗骰子，剩余 {me.turtleRollsRemaining} 次</p>}
        {canUseItem && (
          <div>
            <span className={styles.label}>出发前可使用 1 张道具</span>
            <div className={styles.items}>
              {me.items.slice(0, 3).map((item, index) => (
                <button key={`${item}-${index}`} onClick={() => onOpenItems(item)}>
                  <img src={ITEMS[item].image} alt="" />
                  {ITEMS[item].name}
                </button>
              ))}
            </div>
          </div>
        )}
      </Ticket>
    )
  }

  if (game.phase === 'WAITING_FOR_DEBT' && game.pendingDebt) {
    const debt = game.pendingDebt
    const difference = Math.max(0, debt.amount - me.cash)
    const payment = stockPaymentQuote(game, playerId, debt.amount)
    const creditor = game.players.find((player) => player.id === debt.creditorId)?.name ?? '银行'
    return (
      <Ticket
        stub={
          <div className={styles.commands}>
            <Button
              variant="primary"
              size="lg"
              icon={<CircleDollarSign size={18} />}
              disabled={!payment.allowed}
              onClick={() =>
                onCommand(
                  payment.stockFunding
                    ? { type: 'LIQUIDATE_ASSETS', selections: [], ...payment.stockFunding }
                    : { type: 'SETTLE_DEBT' },
                )
              }
            >
              {payment.stockFunding && payment.allowed ? '卖股并付款' : '支付欠款'}
            </Button>
            <Button variant="outline" icon={<Building2 size={17} />} onClick={onManageAssets}>
              筹款 / 管理资产
            </Button>
            <button className={styles.giveUp} onClick={() => onCommand({ type: 'DECLARE_BANKRUPTCY' })}>
              放弃筹款，宣告破产
            </button>
          </div>
        }
      >
        <span className={styles.eyebrow}>待付款 · 收款方 {creditor}</span>
        <h2 className={styles.title}>需要支付 {formatMoney(debt.amount)}</h2>
        <p className={styles.note}>{debt.reason}</p>
        {payment.allowed && payment.stockFunding ? (
          <StockPaymentHint payment={payment} />
        ) : (
          <p className={difference > 0 ? styles.warn : styles.note}>
            {difference > 0 ? `还差 ${formatMoney(difference)}，可卖股、卖房或抵押筹款` : '钱已凑齐，可以付款了'}
          </p>
        )}
      </Ticket>
    )
  }

  if (game.phase === 'WAITING_FOR_END_TURN') {
    const extra = canRollAgain(game, playerId)
    return (
      <Ticket
        compact
        stub={
          <Button
            variant="primary"
            size="lg"
            block
            icon={extra ? <Dice5 size={19} /> : <ChevronRight size={19} />}
            onClick={() => onCommand({ type: extra ? 'ROLL_AGAIN' : 'END_TURN' })}
          >
            {extra ? '再掷一次' : '结束回合'}
          </Button>
        }
      >
        <span className={styles.eyebrow}>{extra ? `掷出对子 · 已连续 ${game.consecutiveDoubles} 次` : '回合完成'}</span>
        <h2 className={styles.title}>
          {extra ? (game.consecutiveDoubles >= 2 ? '再掷出对子将入狱' : '你还可以再行动一次') : '本回合已完成'}
        </h2>
        {!extra && <p className={styles.note}>确认后轮到下一位玩家。</p>}
      </Ticket>
    )
  }

  return null
}
