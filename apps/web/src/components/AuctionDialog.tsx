import { auctionMinimumBid, getTile, type GameCommand, type GameView, type PendingAuction } from '@fortune/game'
import { Check, Gavel, X } from 'lucide-react'
import { useContext, useEffect, useState } from 'react'
import { CommandAvailabilityContext, Modal } from './Modal.js'

export function AuctionDialog({ game, auction, playerId, clockOffset, onCommand, onClose }: { game: GameView; auction: PendingAuction; playerId: string; clockOffset: number; onCommand: (command: GameCommand) => void; onClose?: (() => void) | undefined }) {
  const available = useContext(CommandAvailabilityContext)
  const minimumBid = auctionMinimumBid(auction.tileIndex)
  const [amount, setAmount] = useState(() => String(minimumBid))
  const [sending, setSending] = useState(false)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer) }, [])
  useEffect(() => { if (!sending) return; const timer = window.setTimeout(() => setSending(false), 3000); return () => clearTimeout(timer) }, [sending])
  const me = game.players.find((player) => player.id === playerId)
  const mine = auction.participantIds.includes(playerId) && !me?.isBankrupt
  const submitted = Object.hasOwn(auction.bids, playerId)
  const bid = Number(amount), cash = me?.cash ?? 0
  const seconds = Math.max(0, Math.ceil((auction.deadline - now - clockOffset) / 1000))
  const valid = Number.isSafeInteger(bid) && bid >= minimumBid && bid <= cash
  const submit = (value: number) => { if (!available || sending || submitted || !seconds) return; setSending(true); onCommand({ type: 'BID_AUCTION', auctionId: auction.id, amount: value }) }
  return <Modal label="地产竞拍" onDismiss={onClose}><div className="landing-overlay"><section className="landing-dialog auction-dialog">
    {onClose && <button className="decision-close icon-command" aria-label="关闭竞拍查看" onClick={onClose}><X size={18} /></button>}
    <header className="landing-dialog-head"><span><Gavel size={23} /></span><div><small>{seconds ? `密封竞拍 · 剩余 ${seconds}秒` : '出价截止，正在揭晓'}</small><h2>{getTile(auction.tileIndex).name}</h2></div></header>
    <div className="auction-content">
      <div className="auction-summary"><span>起拍价<strong>¥{minimumBid.toLocaleString('zh-CN')}</strong></span><span>我的现金<strong>¥{cash.toLocaleString('zh-CN')}</strong></span></div>
      <p className="auction-rule">标价 ¥{getTile(auction.tileIndex).price?.toLocaleString('zh-CN')} · 抵押可得 ¥{getTile(auction.tileIndex).mortgage?.toLocaleString('zh-CN')}</p>
      <details className="auction-rules"><summary>竞拍规则</summary><p>报价保密，最高价成交，同价抽签；无人出价则流拍。</p><p>30 秒内提交，全部提交即揭晓。现金不足底价时自动放弃；成交后支付银行。</p></details>
      <section className="auction-players" aria-label="竞拍玩家现金与提交状态">
        <header><span>竞拍玩家</span><span>当前现金</span><span>出价状态</span></header>
        {auction.participantIds.map((id) => {
          const player = game.players.find((candidate) => candidate.id === id)
          return <div key={id} className={id === playerId ? 'is-me' : ''}><span className="auction-player-name">{player?.name ?? '玩家'}{id === playerId ? ' · 你' : ''}</span><strong className="auction-player-cash">{player ? `¥${player.cash.toLocaleString('zh-CN')}` : '—'}</strong><small>{Object.hasOwn(auction.bids, id) ? <><Check size={14} />已提交</> : '等待提交'}</small></div>
        })}
      </section>
      {mine && !submitted ? <form onSubmit={(event) => { event.preventDefault(); if (valid) submit(bid) }}>
        <label htmlFor="auction-amount">我的出价<input id="auction-amount" type="number" inputMode="numeric" min={minimumBid} max={cash} step="1" value={amount} disabled={!available || sending || !seconds || cash < minimumBid} onChange={(event) => setAmount(event.target.value)} /></label>
        {amount && !valid && cash >= minimumBid && <p className="auction-input-error" role="status">{bid > cash ? '出价超过了你的现金' : `出价至少 ¥${minimumBid.toLocaleString('zh-CN')}，须为整数`}</p>}
        <p className="auction-rule">{cash < minimumBid ? `现金不足，还差 ¥${(minimumBid - cash).toLocaleString('zh-CN')}` : '出价不可修改，超时放弃。'}</p>
        <div className="decision-buttons"><button className="accept" type="submit" disabled={!available || !valid || sending || !seconds}><Gavel size={17} />{sending ? '正在提交…' : '确认出价'}</button><button type="button" disabled={!available || sending || !seconds} onClick={() => submit(0)}>放弃竞拍</button></div>
      </form> : <p className="auction-wait">{submitted ? auction.bids[playerId] === 0 ? '你已放弃竞拍，等待揭晓' : auction.bids[playerId]! > 0 ? `你的报价：¥${auction.bids[playerId]!.toLocaleString('zh-CN')}，等待揭晓` : '你的选择已提交，等大家一起揭晓' : playerId === auction.initiatorId ? '你已放弃购买，本次由其他玩家竞拍' : '观战中，等待竞拍结果'}</p>}
    </div>
  </section></div></Modal>
}
