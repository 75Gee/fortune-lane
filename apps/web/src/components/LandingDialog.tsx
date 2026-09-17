import { MAX_PROPERTY_LEVEL, RENT_GROWTH_START, assetActionQuote, cardPropertyCandidates, getCard, getTile, rentForTile, rentMultiplier, scaleRent, type GameCommand, type GameView } from '@fortune/game'
import { Building2, Check, Hotel, Landmark, X } from 'lucide-react'
import { useContext } from 'react'
import { TurnClock } from '../board/GameBoard.js'
import { AuctionDialog } from './AuctionDialog.js'
import { BuildingIcons } from './BuildingIcons.js'
import { CARD_DECK_ART, CardBack, CardDeckSymbol } from './CardDeckArt.js'
import { needsDecision } from './decisionState.js'
import { CommandAvailabilityContext, Modal } from './Modal.js'
import { WheelDialog } from './WheelDialog.js'
import { StockPaymentHint } from './stocks/StockPaymentHint.js'

interface LandingDialogProps {
  game: GameView
  playerId: string
  decisionsReady: boolean
  clockOffset: number
  soundEnabled: boolean
  onCommand: (command: GameCommand) => void
  deadline: number | null
  watching: boolean
  onDismiss: () => void
}
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`

export function LandingDialog(props: LandingDialogProps) {
  const required = needsDecision(props.game, props.playerId)
  if (!required && !props.watching) return null
  if (!props.decisionsReady && !props.game.pendingAuction) return null
  return <LandingContent {...props} required={required} />
}

function LandingContent({ game, playerId, decisionsReady, onCommand, clockOffset, soundEnabled, deadline, onDismiss, required }: LandingDialogProps & { required: boolean }) {
  const available = useContext(CommandAvailabilityContext)
  const choice = game.pendingCardChoice
  const decision = game.pendingDecision
  const isMyTurn = game.currentPlayerId === playerId
  const close = required ? undefined : onDismiss
  if (game.pendingAuction) return <AuctionDialog key={game.pendingAuction.id} game={game} auction={game.pendingAuction} playerId={playerId} clockOffset={clockOffset} onCommand={onCommand} onClose={close} />
  if (game.pendingWheel) return <WheelDialog game={game} wheel={game.pendingWheel} playerId={playerId} onCommand={onCommand} clockOffset={clockOffset} soundEnabled={soundEnabled} deadline={deadline} onClose={close} />
  if (game.pendingCardProperty && decisionsReady) {
    const pending = game.pendingCardProperty
    const card = getCard(pending.cardId)
    const actor = game.players.find((player) => player.id === pending.playerId)
    return <Modal label="选择降级地产" onDismiss={close}><div className="landing-overlay"><section className={`landing-dialog card-property-dialog deck-${card.deck}`}>
      {!required && <button className="decision-close icon-command" aria-label="关闭查看" onClick={onDismiss}><X size={18} /></button>}<header className="landing-dialog-head"><span><CardDeckSymbol deck={card.deck} size={24} /></span><div><small>{actor?.name} · {CARD_DECK_ART[card.deck].name}卡</small><h2>{card.title}</h2></div><TurnClock deadline={deadline} offset={clockOffset} /></header>
      <p>{isMyTurn ? '选择一处城市降一级，不返还建造费。' : `等待 ${actor?.name} 选择一处城市降级。`}</p>
      <div className="wheel-properties">{cardPropertyCandidates(game, pending.playerId).map((tile) => <button key={tile.index} disabled={!isMyTurn || !available} onClick={() => onCommand({ type: 'CHOOSE_CARD_PROPERTY', choiceId: pending.id, tileIndex: tile.index })}><Landmark size={18} /><strong>{tile.name}</strong><span>{game.tiles[tile.index]!.level} → {game.tiles[tile.index]!.level - 1} 级<small>降级后游览费 {money(scaleRent(tile.rents?.[game.tiles[tile.index]!.level - 1] ?? 0, game.turnNumber))}</small></span></button>)}</div>
      {isMyTurn && deadline !== null && <p className="choice-hint">超时选择建造费最低的城市</p>}
    </section></div></Modal>
  }

  if (choice && decisionsReady) {
    const player = game.players.find((candidate) => candidate.id === choice.playerId)
    const deckName = CARD_DECK_ART[choice.deck].name
    return (
      <Modal label={`选择${deckName}卡`} onDismiss={close}><div className="landing-overlay">
        <section className={`landing-dialog card-choice-dialog deck-${choice.deck}`} role="dialog" aria-modal="true" aria-label={`选择${deckName}卡`}>
          {!required && <button className="decision-close icon-command" aria-label="关闭查看" onClick={onDismiss}><X size={18} /></button>}
          <header className="landing-dialog-head">
            <span><CardDeckSymbol deck={choice.deck} size={24} /></span>
            <div>
              <small>{deckName}卡</small>
              <h2>{isMyTurn ? '选择一张卡' : `${player?.name ?? '当前玩家'} 正在抽卡`}</h2>
            </div>
            <TurnClock deadline={deadline} offset={clockOffset} />
          </header>
          <div className="card-choice-grid">
            {Array.from({ length: choice.count }, (_, index) => (
              <button
                className="card-back-button"
                disabled={!isMyTurn || !available}
                key={index}
                onClick={() => onCommand({ type: 'CHOOSE_CARD', choiceId: choice.id, cardIndex: index as 0 | 1 | 2 })}
                aria-label={`选择第${index + 1}张${deckName}卡`}
              >
                <CardBack deck={choice.deck} />
                <span className="card-choice-caption">第 {index + 1} 张</span>
              </button>
            ))}
          </div>
          {isMyTurn && deadline !== null && <p className="card-choice-deadline">超时自动抽取第 1 张</p>}
        </section>
      </div></Modal>
    )
  }
  if (decision && decisionsReady) {
    const tile = getTile(decision.tileIndex)
    const tileState = game.tiles[decision.tileIndex]
    const player = game.players.find((candidate) => candidate.id === decision.playerId)
    const isPurchase = decision.type === 'purchase'
    const currentLevel = tileState?.level ?? 0
    const actionCost = isPurchase ? (tile.price ?? 0) : (tile.buildCost ?? 0)
    const quote = assetActionQuote(game, decision.playerId, tile.index, isPurchase ? 'BUY_PROPERTY' : 'UPGRADE_PROPERTY')
    const canAfford = quote.allowed
    const nextRent = scaleRent(tile.rents?.[isPurchase ? 0 : currentLevel + 1] ?? 0, game.turnNumber)
    const feeLabel = tile.kind === 'property'
      ? isPurchase ? '购入后游览费' : '升级后游览费'
      : '购入后游览费'
    const feeValue = tile.kind === 'airport'
      ? money(rentForTile(game, tile.index, 0, decision.playerId))
      : tile.kind === 'utility'
        ? `${money(rentForTile(game, tile.index, 1, decision.playerId))}–${money(rentForTile(game, tile.index, 12, decision.playerId))}`
        : money(nextRent)

    // The active player's decision lives with its controls in the command dock.
    if (required) return null

    return (
      <Modal label={`${tile.name}地产决策`} onDismiss={close}><div className="landing-overlay">
        <section className="landing-dialog property-landing-dialog" role="dialog" aria-modal="true" aria-label={`${tile.name}地产信息`}>
          {!required && <button className="decision-close icon-command" aria-label="关闭查看" onClick={onDismiss}><X size={18} /></button>}
          <header className="landing-dialog-head">
            <span><Landmark size={22} /></span>
            <div>
              <small>{isPurchase ? '这项资产还没有主人' : '回到自己的地产'}</small>
              <h2>{tile.name}</h2>
            </div>
            <strong className="landing-price">{money(actionCost)}</strong>
          </header>

          {game.turnNumber > RENT_GROWTH_START && <p className="rent-notice">游览费加速 · 当前 ×{rentMultiplier(game.turnNumber).toFixed(2)}，下回合再涨 1%</p>}

          <div className="decision-timing"><TurnClock deadline={deadline} offset={clockOffset} /><span>{isPurchase ? '超时放弃购买，交由其他玩家竞拍' : '超时暂不升级'}</span></div>
          <div className="landing-deed-summary">
            <div><span>地产等级</span><strong>{isPurchase ? '待购入' : `${currentLevel}级地产`}</strong></div>
            <div><span>{feeLabel}</span><strong>{feeValue}</strong></div>
            <div><span>抵押价值</span><strong>{money(tile.mortgage ?? 0)}</strong></div>
            <div><span>{canAfford ? '支付后余额' : '还差'}</span><strong>{money(canAfford ? quote.balanceAfter : quote.payment.remaining)}</strong></div>
          </div>
          <StockPaymentHint payment={quote.payment} />

          {tile.kind === 'property' && (
            <details className="deed-rates"><summary>查看各等级游览费</summary><div className="landing-rent-track">
              {tile.rents?.map((rent, level) => (
                <div className={level === currentLevel ? 'current' : level === currentLevel + 1 && !isPurchase ? 'next' : ''} key={level}>
                  <span className="rent-tier-label">
                    {level === 0 ? '空地' : <BuildingIcons level={level} size={18} />}
                  </span>
                  <strong>{money(scaleRent(rent, game.turnNumber))}</strong>
                </div>
              ))}
            </div></details>
          )}

          {isMyTurn ? (
            <div className="landing-actions">
              <button
                className="accept"
                disabled={!canAfford || !available}
                onClick={() => onCommand({ type: isPurchase ? 'BUY_PROPERTY' : 'UPGRADE_PROPERTY', stockFunding: quote.payment.stockFunding })}
              >
                {isPurchase ? <Check size={19} /> : currentLevel >= MAX_PROPERTY_LEVEL - 1 ? <Hotel size={19} /> : <Building2 size={19} />}
                {!canAfford ? '资金不足' : `${quote.payment.stockFunding ? '卖股并' : ''}${isPurchase ? '购买地产' : '升级一级'}`}
              </button>
              <button disabled={!available} onClick={() => onCommand({ type: isPurchase ? 'SKIP_PURCHASE' : 'SKIP_UPGRADE' })}>
                {isPurchase ? '让其他人竞拍' : '暂不升级'}
              </button>
            </div>
          ) : (
            <p className="choice-hint">等待 {player?.name ?? '当前玩家'} 作出决定。</p>
          )}
        </section>
      </div></Modal>
    )
  }

  return null
}
