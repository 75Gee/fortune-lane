import { cardPropertyCandidates, getCard, getTile, type GameCommand, type GameView } from '@fortune/game'
import { useContext } from 'react'
import { AuctionDialog } from './AuctionDialog.js'
import { CARD_DECK_ART, CardBack, CardDeckSymbol } from './CardDeckArt.js'
import { DecisionSlip, LevelChoices, SlipNote } from './DecisionSlip.js'
import { needsDecision } from './decisionState.js'
import { PropertyDecision } from './game/PropertyDecision.js'
import styles from './LandingDialog.module.css'
import { CommandAvailabilityContext, Modal } from './Modal.js'
import { WheelDialog } from './WheelDialog.js'

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

export function LandingDialog(props: LandingDialogProps) {
  const required = needsDecision(props.game, props.playerId)
  if (!required && !props.watching) return null
  if (!props.decisionsReady && !props.game.pendingAuction) return null
  return <LandingContent {...props} required={required} />
}

function LandingContent({
  game,
  playerId,
  decisionsReady,
  onCommand,
  clockOffset,
  soundEnabled,
  deadline,
  onDismiss,
  required,
}: LandingDialogProps & { required: boolean }) {
  const available = useContext(CommandAvailabilityContext)
  const choice = game.pendingCardChoice
  const decision = game.pendingDecision
  const isMyTurn = game.currentPlayerId === playerId
  const close = required ? undefined : onDismiss
  if (game.pendingAuction)
    return (
      <AuctionDialog
        key={game.pendingAuction.id}
        game={game}
        auction={game.pendingAuction}
        playerId={playerId}
        clockOffset={clockOffset}
        onCommand={onCommand}
        onClose={close}
      />
    )
  if (game.pendingWheel)
    return (
      <WheelDialog
        game={game}
        wheel={game.pendingWheel}
        playerId={playerId}
        onCommand={onCommand}
        clockOffset={clockOffset}
        soundEnabled={soundEnabled}
        deadline={deadline}
        onClose={close}
      />
    )
  if (game.pendingCardProperty && decisionsReady) {
    const pending = game.pendingCardProperty
    const card = getCard(pending.cardId)
    const actor = game.players.find((player) => player.id === pending.playerId)
    return (
      <DecisionSlip
        label="选择降级地产"
        icon={<CardDeckSymbol deck={card.deck} size={22} />}
        kicker={`${actor?.name ?? '当前玩家'} · ${CARD_DECK_ART[card.deck].name}卡`}
        title={card.title}
        deadline={deadline}
        clockOffset={clockOffset}
        onClose={close}
      >
        <SlipNote>
          {isMyTurn ? '选择一处城市降一级，不返还建造费。' : `等待 ${actor?.name} 选择一处城市降级。`}
        </SlipNote>
        <LevelChoices
          game={game}
          tiles={cardPropertyCandidates(game, pending.playerId)}
          delta={-1}
          disabled={!isMyTurn || !available}
          onChoose={(tileIndex) => onCommand({ type: 'CHOOSE_CARD_PROPERTY', choiceId: pending.id, tileIndex })}
        />
        {isMyTurn && deadline !== null && <SlipNote>超时选择建造费最低的城市</SlipNote>}
      </DecisionSlip>
    )
  }

  if (choice && decisionsReady) {
    const player = game.players.find((candidate) => candidate.id === choice.playerId)
    const deckName = CARD_DECK_ART[choice.deck].name
    return (
      <DecisionSlip
        wide
        label={`选择${deckName}卡`}
        icon={<CardDeckSymbol deck={choice.deck} size={22} />}
        kicker={`${deckName}卡`}
        title={isMyTurn ? '选择一张卡' : `${player?.name ?? '当前玩家'} 正在抽卡`}
        deadline={deadline}
        clockOffset={clockOffset}
        onClose={close}
      >
        <div className={styles.cards}>
          {Array.from({ length: choice.count }, (_, index) => (
            <button
              disabled={!isMyTurn || !available}
              key={index}
              onClick={() => onCommand({ type: 'CHOOSE_CARD', choiceId: choice.id, cardIndex: index as 0 | 1 | 2 })}
              aria-label={`选择第${index + 1}张${deckName}卡`}
            >
              <CardBack deck={choice.deck} />
              <span>第 {index + 1} 张</span>
            </button>
          ))}
        </div>
        {isMyTurn && deadline !== null && <SlipNote>超时自动抽取第 1 张</SlipNote>}
      </DecisionSlip>
    )
  }

  // Watching someone else's purchase or upgrade: the same boarding pass, without commands.
  if (decision && decisionsReady && !required) {
    const player = game.players.find((candidate) => candidate.id === decision.playerId)
    const tile = getTile(decision.tileIndex)
    return (
      <Modal label={`${tile.name}地产信息`} onDismiss={close}>
        <div className={styles.passOverlay}>
          <div className={styles.pass}>
            <PropertyDecision
              game={game}
              playerId={decision.playerId}
              onCommand={onCommand}
              waitingFor={player?.name ?? '当前玩家'}
              onClose={close}
            />
          </div>
        </div>
      </Modal>
    )
  }

  return null
}
