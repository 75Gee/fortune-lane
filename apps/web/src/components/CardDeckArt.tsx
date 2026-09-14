import type { CardDeckKind } from '@fortune/game'

export const CARD_DECK_ART = {
  chance: { name: '机会', back: '/assets/cards/card-back-chance.webp' },
  fate: { name: '命运', back: '/assets/cards/card-back-fate.webp' },
} as const satisfies Record<CardDeckKind, { name: string; back: string }>

/** The same question/exclamation marks as the board and card artwork. */
export function CardDeckSymbol({ deck, size = 24 }: { deck: CardDeckKind; size?: number }) {
  return <svg className="card-deck-symbol" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
    {deck === 'chance' ? <path d="M6.5 7.5a5.5 5.5 0 0 1 11 0c0 4-5.5 4-5.5 8" /> : <path d="M12 3v12.5" />}
    <circle cx="12" cy="21" r="1.5" fill="currentColor" stroke="none" />
  </svg>
}

export function CardBack({ deck }: { deck: CardDeckKind }) {
  return <img className="travel-card-back" src={CARD_DECK_ART[deck].back} width={512} height={704} alt="" draggable={false} />
}
