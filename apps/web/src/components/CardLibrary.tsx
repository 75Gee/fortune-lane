import { CHANCE_CARDS, FATE_CARDS, type CardDeckKind, type GameView } from '@fortune/game'
import { Banknote, Building2, ChevronDown, HeartPulse, Package, RotateCw, Route, ShieldCheck, Turtle } from 'lucide-react'
import { useState } from 'react'
import { CARD_DECK_ART, CardDeckSymbol } from './CardDeckArt.js'

export function CardLibrary({ game, initialDeck = 'chance' }: { game: GameView; initialDeck?: CardDeckKind }) {
  const [kind, setKind] = useState(initialDeck)
  const cards = kind === 'chance' ? CHANCE_CARDS : FATE_CARDS
  const deck = kind === 'chance' ? game.chanceDeck : game.fateDeck
  const held = game.players.flatMap((player) => player.heldCards).filter((card) => card.deck === kind)

  return <section className="card-library">
    <div className="segmented" role="group" aria-label="卡牌类别">
      {(['chance', 'fate'] as const).map((deckKind) => <button key={deckKind} className={`deck-${deckKind} ${kind === deckKind ? 'active' : ''}`} aria-pressed={kind === deckKind} onClick={() => setKind(deckKind)}><CardDeckSymbol deck={deckKind} size={16} />{CARD_DECK_ART[deckKind].name}</button>)}
    </div>
    <div className="deck-status"><span>牌堆 {deck.remaining} 张</span><span>弃牌 {deck.discarded} 张</span><span>玩家保留 {held.length} 张</span></div>
    <div className="library-list">{cards.map((card) => {
      const effect = card.effect.type
      const Icon = effect === 'wheel' ? RotateCw : ['money', 'relief', 'cash_relief', 'asset_income', 'assessment'].includes(effect) ? Banknote : ['renovate', 'repairs', 'downgrade'].includes(effect) ? Building2 : effect === 'get_out' || effect === 'jail' ? ShieldCheck : effect === 'item' ? Package : effect === 'hospital' ? HeartPulse : effect === 'turtle' ? Turtle : Route
      return <details className="library-card" key={card.id}>
        <summary><Icon size={17} /><strong>{card.title}</strong><ChevronDown size={15} /></summary>
        <p>{card.details}</p>
      </details>
    })}</div>
  </section>
}
