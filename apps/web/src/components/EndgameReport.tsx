import { getTile, stockPortfolioSummary, type GameView, type PlayerStatistics } from '@fortune/game'
import { Award, ChevronDown, Clock3, Crown, Flag, LogOut, MapPinned, RotateCcw, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import '../styles/endgame.css'
import { Modal } from './Modal.js'
import { TokenImage } from './TokenImage.js'
import { stockProfit } from './stocks/format.js'

const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`
const number = (value: number) => value.toLocaleString('zh-CN')
type AwardMetric = 'rentReceived' | 'rentPaid' | 'steps' | 'doubles' | 'bestAuctionSaving' | 'trapHits'
const awards: { metric: AwardMetric; title: string; describe: (value: number) => string }[] = [
  { metric: 'trapHits', title: '整活大师', describe: (n) => `路障和炸弹让旅伴中招 ${n} 次` },
  { metric: 'bestAuctionSaving', title: '捡漏高手', describe: (n) => `最划算的一次竞拍，省下 ${money(n)}` },
  { metric: 'doubles', title: '对子达人', describe: (n) => `常规掷骰出现了 ${n} 次对子` },
  { metric: 'rentReceived', title: '人气城主', describe: (n) => `旅行版图累计带来 ${money(n)} 收入` },
  { metric: 'steps', title: '旅行达人', describe: (n) => `一路走过 ${number(n)} 格风景` },
  { metric: 'rentPaid', title: '豪爽游客', describe: (n) => `沿途游览累计花费 ${money(n)}` },
]

function representativeAwards(game: GameView) {
  return Object.fromEntries(game.players.map((player) => {
    const stats = game.statistics.players[player.id]!
    // A shared record is explicitly labelled. Prefer a player's less common achievement.
    const candidates = awards.flatMap((award, priority) => {
      const values = game.players.map((entry) => game.statistics.players[entry.id]![award.metric])
      const value = stats[award.metric]
      const tied = values.filter((entry) => entry === value).length
      return value > 0 && value === Math.max(...values) ? [{ ...award, value, tied, priority }] : []
    }).sort((a, b) => a.tied - b.tied || a.priority - b.priority)
    return [player.id, candidates[0] ?? null]
  }))
}

function personalMoment(game: GameView, stats: PlayerStatistics): string {
  const cities = Object.entries(stats.earnedByTile).filter(([index, amount]) => getTile(Number(index)).kind === 'property' && amount > 0).sort((a, b) => b[1] - a[1])
  if (cities[0]) return `${getTile(Number(cities[0][0])).name}带来 ${money(cities[0][1])} 游览收入，是你的${cities[1]?.[1] === cities[0][1] ? '人气城市之一' : '人气城市'}。`
  const travelers = Object.entries(stats.receivedFrom).filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1])
  if (travelers[0]) return `${game.players.find((player) => player.id === travelers[0]![0])?.name ?? '旅伴'}在你的旅行版图累计消费 ${money(travelers[0][1])}。`
  if (stats.assetsAcquired) return `这一程，将 ${stats.assetsAcquired} 项资产收入了旅行版图。`
  if (stats.steps) return `这一程走过 ${number(stats.steps)} 格，沿途都是你的足迹。`
  return '下一程，换个方向看看风景。'
}

function tripHighlights(game: GameView) {
  const result: { title: string; text: string }[] = []
  const name = (id: string) => game.players.find((player) => player.id === id)?.name ?? '旅伴'
  const payment = game.statistics.largestPayment
  if (payment && payment.amount > 0) result.push({ title: '最难忘的一站', text: `${name(payment.payerId)} 到访${getTile(payment.tileIndex).name}，一次支付 ${money(payment.amount)} 给 ${name(payment.receiverId)}。` })
  const auction = game.statistics.bestAuction
  if (auction && auction.saving > 0) result.push({ title: '好价不等人', text: `${name(auction.playerId)} 用 ${money(auction.amount)} 竞得${getTile(auction.tileIndex).name}，比原价省了 ${money(auction.saving)}。` })
  const totals = new Map<number, number>()
  for (const player of game.players) for (const [index, amount] of Object.entries(game.statistics.players[player.id]!.earnedByTile)) {
    const tile = Number(index)
    if (getTile(tile).kind === 'property' && amount > 0) totals.set(tile, (totals.get(tile) ?? 0) + amount)
  }
  const cities = [...totals].sort((a, b) => b[1] - a[1])
  const city = cities[0]
  if (city) result.push({ title: cities[1]?.[1] === city[1] ? '并列人气城市' : '人气城市', text: `${getTile(city[0]).name}在本局累计带来 ${money(city[1])} 游览收入。` })
  return result.slice(0, 3)
}

export function EndgameReport({ game, playerId, isHost, available, onClose, onHistory, onRestart, onLeave }: {
  game: GameView; playerId: string; isHost: boolean; available: boolean
  onClose: () => void; onHistory: () => void; onRestart: () => void; onLeave: () => void
}) {
  const winner = game.players.find((player) => player.id === game.winnerPlayerId)
  const order = [game.winnerPlayerId, ...[...game.statistics.eliminations].reverse().map((entry) => entry.playerId)]
  const ranked = [...game.players].sort((a, b) => {
    const aRank = order.indexOf(a.id), bRank = order.indexOf(b.id)
    return (aRank < 0 ? game.players.length : aRank) - (bRank < 0 ? game.players.length : bRank)
  })
  const titles = representativeAwards(game)
  const highlights = tripHighlights(game)
  const duration = Math.max(0, Math.floor(((game.statistics.finishedAt ?? game.statistics.startedAt) - game.statistics.startedAt) / 1000))
  const durationLabel = duration < 60 ? `${duration} 秒` : duration < 3600 ? `${Math.floor(duration / 60)} 分钟` : `${Math.floor(duration / 3600)} 小时 ${Math.floor(duration % 3600 / 60)} 分钟`
  return <Modal label="本局结果" onDismiss={onClose}><div className="trip-report-overlay"><section className="trip-report">
    <header className="trip-report-header"><span><MapPinned size={18} />本局结果</span><button className="icon-command" onClick={onClose} aria-label="关闭本局结果"><X size={19} /></button></header>
    <div className="trip-winner">
      <div className="trip-winner-token">{winner && <TokenImage token={winner.token} alt="" />}<Crown size={24} /></div>
      <div><small>本局赢家</small><h2>{winner?.name ?? '旅途结束'}</h2></div>
      <span className="trip-duration"><Clock3 size={14} />{durationLabel}<span>第 {game.turnNumber} 回合</span></span>
    </div>
    <div className="trip-rankings">{ranked.map((player, index) => {
      const stats = game.statistics.players[player.id]!
      const award = titles[player.id]
      const elimination = game.statistics.eliminations.find((entry) => entry.playerId === player.id)
      const stocks = stockPortfolioSummary(game.stockMarket, player.id)
      const measures = [
        ['最高身家', money(stats.peakNetWorth)], ['游览收入', money(stats.rentReceived)], ['游览支出', money(stats.rentPaid)],
        ['累计购入', `${stats.assetsAcquired} 项`], ['旅途步数', `${number(stats.steps)} 格`], ['使用道具', `${stats.itemUses} 次`],
        ...(game.stockMarket ? [['股票累计盈亏', stockProfit(stocks.totalProfit)], ['期末股票市值', money(stocks.marketValue)]] : []),
      ]
      return <details className={`trip-player ${player.id === playerId ? 'is-me' : ''}`} key={player.id} style={{ '--traveler-color': player.color } as CSSProperties}>
        <summary><span className="trip-rank">{String(index + 1).padStart(2, '0')}</span><TokenImage className="trip-player-token" token={player.token} alt="" /><div className="trip-player-summary"><div><strong>{player.name}</strong>{player.id === playerId && <small>你</small>}{award && <span className="trip-award"><Award size={13} />{award.tied > 1 ? '并列·' : ''}{award.title}</span>}</div><p>{award ? award.describe(award.value) : personalMoment(game, stats)}</p></div><ChevronDown className="trip-expand" size={16} /></summary>
        <div className="trip-player-detail"><dl>{measures.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {award && <p className="trip-personal-moment">{personalMoment(game, stats)}</p>}
          {Object.keys(stats.receivedFrom).length > 0 && <p className="trip-travelers">游览费来源：{Object.entries(stats.receivedFrom).sort((a, b) => b[1] - a[1]).map(([id, amount]) => `${game.players.find((entry) => entry.id === id)?.name ?? '旅伴'} ${money(amount)}`).join(' · ')}</p>}
          {elimination && <small className="trip-elimination"><Flag size={12} />第 {elimination.turnNumber} 回合{elimination.reason === 'surrender' ? '投降' : '破产'}，转为观战</small>}
        </div>
      </details>
    })}</div>
    {highlights.length > 0 && <details className="trip-highlights"><summary><span>本局亮点</span><small>{highlights.length} 项记录</small><ChevronDown size={16} /></summary><div>{highlights.map((highlight) => <article key={highlight.title}><h3>{highlight.title}</h3><p>{highlight.text}</p></article>)}</div></details>}
    <footer className="trip-report-actions"><button onClick={onHistory}>回看本局</button>{isHost && <button className="primary-command" disabled={!available} onClick={onRestart}><RotateCcw size={17} />再开一局</button>}<button disabled={!available} onClick={onLeave}><LogOut size={16} />返回首页</button></footer>
  </section></div></Modal>
}
