import { CHANCE_CARDS, FATE_CARDS, ITEMS, MAX_PROPERTY_LEVEL, getTile, type CardDeckKind, type CardEffect, type GameView } from '@fortune/game'
import { Banknote, Building2, ChevronDown, HeartPulse, Package, RotateCw, Route, ShieldCheck, Turtle } from 'lucide-react'
import { useState } from 'react'
import { CARD_DECK_ART, CardDeckSymbol } from './CardDeckArt.js'

function effectLabel(effect: CardEffect): string {
  switch (effect.type) {
    case 'money': return `${effect.amount > 0 ? '+' : '−'}¥${Math.abs(effect.amount).toLocaleString('zh-CN')}`
    case 'move_steps': return `${effect.steps > 0 ? '前进' : '后退'} ${Math.abs(effect.steps)} 格`
    case 'move_to': return `前往${getTile(effect.tileIndex).name}`
    case 'nearest': return effect.tileKind === 'airport' ? '前往机场' : '前往公用事业'
    case 'wheel': return '幸运转盘'
    case 'get_out': return '免费出狱 / 出院'
    case 'jail': return '进入监狱'
    case 'hospital': return '进入医院'
    case 'turtle': return '两次单骰行动'
    case 'item': return `获得${ITEMS[effect.kind].name}`
    case 'downgrade': return '地产降一级'
    case 'renovate': return '免费升级 / 补助'
    case 'repairs': return '按建筑缴费'
    case 'assessment': return '按资产缴费'
    case 'asset_income': return '按资产获收入'
    case 'relief': case 'cash_relief': return '按条件领补助'
  }
}

function effectDetails(effect: CardEffect): string | null {
  const money = (amount: number) => `¥${amount.toLocaleString('zh-CN')}`
  switch (effect.type) {
    case 'cash_relief': return `现金不超过 ${money(effect.threshold)} 时领取 ${money(effect.amount)}，否则领取 ${money(effect.otherwise)}。`
    case 'relief': return `持有不超过 ${effect.threshold} 处地产时领取 ${money(effect.amount)}，否则领取 ${money(effect.otherwise)}；已抵押地产也计入。`
    case 'asset_income': return `每处地产收入 ${money(effect.perAsset)}，至少 ${money(effect.minimum)}、最多 ${money(effect.cap)}；已抵押地产也计入。`
    case 'assessment': return `每处地产缴纳 ${money(effect.perAsset)}，最多 ${money(effect.cap)}；已抵押地产也计入。`
    case 'repairs': return `未抵押地产的 1–${MAX_PROPERTY_LEVEL - 1} 级建筑每级缴纳 ${money(effect.perHouse)}；${MAX_PROPERTY_LEVEL} 级地产每处缴纳 ${money((MAX_PROPERTY_LEVEL - 1) * effect.perHouse + effect.perHotel)}。合计最多 ${money(effect.cap)}。`
    case 'renovate': return `自动升级名下未抵押、未满级且等级最低的地产；同级时优先购买价较低的地产。没有可升级地产时领取 ${money(effect.fallback)}。`
    case 'downgrade': return '选择名下一处有建筑且未抵押的地产降一级，不返还建造费；没有符合条件的地产时不发生变化。'
    default: return null
  }
}

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
        <summary><Icon size={17} /><strong>{card.title}</strong><span className="card-effect-label">{effectLabel(card.effect)}</span><ChevronDown size={15} /></summary>
        <p>{effectDetails(card.effect) ?? card.details}</p>
      </details>
    })}</div>
  </section>
}
