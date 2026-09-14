import { ITEMS, getCard, type GameEvent } from '@fortune/game'
import { History } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { CARD_DECK_ART, CardDeckSymbol } from './CardDeckArt.js'

const quietEvents = new Set(['DICE_ROLLED', 'TOKEN_MOVED', 'TURN_CHANGED', 'GAME_STARTED', 'AUCTION_BID', 'WHEEL_SPUN', 'EXTRA_MOVE_FINISHED'])
const labels: Record<string, string> = {
  ITEM_RECEIVED: '获得道具', ITEM_USED: '使用道具', HAZARD_TRIGGERED: '触发道具', EXTRA_MOVE_FINISHED: '额外行动完成', PLAYER_SENT_TO_HOSPITAL: '送往医院', PLAYER_LEFT_HOSPITAL: '离开医院',
  DICE_ROLLED: '掷骰结果', LANDING_RESOLVED: '到达地点', CARD_DRAWN: '抽卡', RENT_PAID: '游览费结算', MONEY_CHANGED: '现金变动', PASSED_START: '起点补助',
  PROPERTY_PURCHASED: '购买资产', PROPERTY_UPGRADED: '地产升级', ASSET_MORTGAGED: '抵押资产',
  ASSET_REDEEMED: '赎回资产', BUILDING_SOLD: '建筑变动', DEBT_CREATED: '等待筹款',
  PLAYER_BANKRUPT: '破产清算', PLAYER_SURRENDERED: '投降观战', PLAYER_SENT_TO_JAIL: '进入监狱',
  PLAYER_LEFT_JAIL: '离开监狱', AUCTION_RESOLVED: '竞拍结果', AUCTION_STARTED: '开始竞拍',
  WHEEL_RESOLVED: '转盘结果', AUTO_PLAY: '超时行动', DECISION_SKIPPED: '暂不加盖', GAME_FINISHED: '本局结束',
}

function amountLabel(event: GameEvent) {
  if (event.amount === undefined || event.amount === 0) return null
  if (event.type === 'DEBT_CREATED') return `待付 ¥${event.amount.toLocaleString('zh-CN')}`
  const expense = ['PROPERTY_PURCHASED', 'PROPERTY_UPGRADED', 'ASSET_REDEEMED', 'AUCTION_RESOLVED', 'PLAYER_LEFT_JAIL', 'PLAYER_LEFT_HOSPITAL'].includes(event.type)
  const amount = expense ? -event.amount : event.amount
  return `${amount > 0 ? '+' : '−'}¥${Math.abs(amount).toLocaleString('zh-CN')}`
}

export function EventEntry({ event, playerId }: { event: GameEvent; playerId: string }) {
  const card = event.cardId ? getCard(event.cardId) : null
  const amount = event.type === 'RENT_PAID' && event.targetPlayerId === playerId && event.amount !== undefined ? `你收到 +¥${Math.abs(event.amount).toLocaleString('zh-CN')}` : amountLabel(event)
  const involved = event.playerId === playerId || event.targetPlayerId === playerId
  return <article className={`activity-entry ${involved ? 'involves-me' : ''} ${card ? `deck-${card.deck}` : ''}`}>
    <div className="activity-entry-meta"><span>{labels[event.type] ?? '对局动态'}{involved ? ' · 与你有关' : ''}</span>{amount && <strong>{amount}</strong>}</div>
    <p>{event.message}</p>
    {event.itemKind && <div className="activity-item"><img src={ITEMS[event.itemKind].image} alt="" loading="lazy" /><small>{ITEMS[event.itemKind].name} · {ITEMS[event.itemKind].description}</small></div>}
    {card && <small className="activity-card-deck"><CardDeckSymbol deck={card.deck} size={14} /><span>{CARD_DECK_ART[card.deck].name}卡{event.cardIndex !== undefined ? ` · 选择了第 ${event.cardIndex + 1} 张` : ''}{card.effect.type === 'get_out' ? ' · 已收入手牌，服刑或住院时可使用' : ''}</span></small>}
  </article>
}

export function ActivityBroadcast({ events, playerId, onHistory }: { events: GameEvent[]; playerId: string; onHistory: () => void }) {
  const groups = useMemo(() => {
    const grouped = new Map<number, GameEvent[]>()
    for (const event of events) {
      if (quietEvents.has(event.type) || (event.sourceCardId && events.some((parent) => parent.revision === event.revision && parent.type === 'CARD_DRAWN' && parent.cardId === event.sourceCardId) && !['DEBT_CREATED', 'PLAYER_BANKRUPT', 'PLAYER_SURRENDERED', 'GAME_FINISHED'].includes(event.type))) continue
      grouped.set(event.revision, [...(grouped.get(event.revision) ?? []), event])
    }
    return [...grouped.entries()]
  }, [events])
  const current = groups.at(-1)
  if (!current) return null
  const assetChanges = current[1].filter(event => event.type === 'ASSET_MORTGAGED' || (event.type === 'BUILDING_SOLD' && (event.amount ?? 0) > 0))
  const summary = assetChanges.length > 1
    ? `处理 ${new Set(assetChanges.map(event => event.tileIndex)).size} 处资产，筹得 ¥${assetChanges.reduce((total, event) => total + (event.amount ?? 0), 0).toLocaleString('zh-CN')}。 ${current[1].filter(event => !assetChanges.includes(event)).map(event => event.message).join(' ')}`
    : current[1].map(event => event.message).join(' ')
  return <section className="activity-broadcast" aria-label="最近动态">
    <p className="activity-latest" role="status" title={summary}>{summary}</p>
    <button className="activity-history-link" onClick={onHistory}><History size={16} />动态</button>
  </section>
}

export function ActivityHistory({ events, playerId }: { events: GameEvent[]; playerId: string }) {
  const [filter, setFilter] = useState<'all' | 'mine' | 'cards'>('all')
  const [readingEvents, setReadingEvents] = useState(events)
  const latest = useRef(events); latest.current = events
  const newCount = events.filter(event => !readingEvents.some(shown => shown.id === event.id)).length
  const visible = [...readingEvents].reverse().filter((event) => filter === 'mine' ? event.playerId === playerId || event.targetPlayerId === playerId : filter === 'cards' ? !!event.cardId || !!event.sourceCardId || !!event.itemKind || event.type === 'WHEEL_RESOLVED' : true)
  return <section className="activity-history">
    {newCount > 0 && <button className="history-new" onClick={() => setReadingEvents(latest.current)}>查看 {newCount} 条新动态</button>}
    <div className="activity-filters" role="group" aria-label="筛选动态">{(['all', 'mine', 'cards'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? '全部' : value === 'mine' ? '与我有关' : '卡牌与道具'}</button>)}</div>
    {events.length >= 300 && <p className="history-hint">仅显示最近 300 条动态</p>}
    {!visible.length && <p className="empty-state">暂无符合条件的动态</p>}
    {visible.map((event, index) => <div key={event.id}>
      {(index === 0 || event.turnNumber !== visible[index - 1]?.turnNumber) && <h3>{event.turnNumber ? `第 ${event.turnNumber} 回合` : '此前动态'}</h3>}
      <EventEntry event={event} playerId={playerId} />
    </div>)}
  </section>
}
