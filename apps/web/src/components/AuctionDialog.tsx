import {
  auctionMinimumBid,
  getTile,
  stockPaymentCapacity,
  stockPaymentQuote,
  type GameCommand,
  type GameView,
  type PendingAuction,
} from '@fortune/game'
import { Clock3, Gavel, X } from 'lucide-react'
import { useContext, useEffect, useState } from 'react'
import { formatMoney } from '../lib/format.js'
import { tileSetLabel } from '../lib/tiles.js'
import { Button, IconButton } from '../ui/index.js'
import styles from './AuctionDialog.module.css'
import { CityImage } from './CityImage.js'
import { CommandAvailabilityContext, Modal } from './Modal.js'
import { StockPaymentHint } from './stocks/StockPaymentHint.js'
import { TokenImage } from './TokenImage.js'

/** Sealed-bid auction slip. Other players' amounts arrive redacted (-1) until the reveal. */
export function AuctionDialog({
  game,
  auction,
  playerId,
  clockOffset,
  onCommand,
  onClose,
}: {
  game: GameView
  auction: PendingAuction
  playerId: string
  clockOffset: number
  onCommand: (command: GameCommand) => void
  onClose?: (() => void) | undefined
}) {
  const available = useContext(CommandAvailabilityContext)
  const tile = getTile(auction.tileIndex)
  const minimumBid = auctionMinimumBid(auction.tileIndex)
  const [amount, setAmount] = useState(() => String(minimumBid))
  const [sending, setSending] = useState(false)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!sending) return
    const timer = window.setTimeout(() => setSending(false), 3000)
    return () => clearTimeout(timer)
  }, [sending])

  const me = game.players.find((player) => player.id === playerId)
  const initiator = game.players.find((player) => player.id === auction.initiatorId)
  const mine = auction.participantIds.includes(playerId) && !me?.isBankrupt
  const submitted = Object.hasOwn(auction.bids, playerId)
  const myBid = auction.bids[playerId]
  const bid = Number(amount)
  const cash = me?.cash ?? 0
  const funds = stockPaymentCapacity(game, playerId)
  const payment = stockPaymentQuote(game, playerId, bid)
  const seconds = Math.max(0, Math.ceil((auction.deadline - now - clockOffset) / 1000))
  const valid = Number.isSafeInteger(bid) && bid >= minimumBid && payment.allowed
  const locked = !available || sending || !seconds
  const submit = (value: number) => {
    if (!available || sending || submitted || !seconds) return
    setSending(true)
    onCommand({ type: 'BID_AUCTION', auctionId: auction.id, amount: value })
  }
  const quickBids = [
    { label: '起拍价', value: minimumBid },
    { label: '标价', value: tile.price ?? 0 },
  ].filter((entry) => entry.value >= minimumBid)

  const waitingNote = submitted
    ? myBid === 0
      ? '你已放弃竞拍，等待揭晓'
      : myBid! > 0
        ? `你的报价 ${formatMoney(myBid!)} 已密封，等待揭晓`
        : '你的选择已提交，等大家一起揭晓'
    : playerId === auction.initiatorId
      ? '你已放弃购买，本次由其他旅行者竞拍'
      : '观战中，等待竞拍结果'

  return (
    <Modal label="地产竞拍" onDismiss={onClose}>
      <div className={styles.overlay}>
        <section className={styles.slip} aria-label={`密封竞拍：${tile.name}`}>
          <div className={styles.cover}>
            <CityImage city={tile.name} className={styles.coverImage} />
            <div className={styles.stamp} aria-hidden="true">
              <small>SEALED BID</small>
              <strong>密封竞拍</strong>
            </div>
          </div>

          <div className={styles.content}>
            <header className={styles.header}>
              <div>
                <p className={styles.kicker}>
                  {initiator ? `${initiator.name}放弃购买，由其他旅行者竞拍` : '地产竞拍'}
                </p>
                <div className={styles.titleRow}>
                  <h2>{tile.name}</h2>
                  <span className={styles.chip}>
                    {tile.color && <i style={{ background: tile.color }} />}
                    {tileSetLabel(tile)}
                  </span>
                </div>
              </div>
              <span className={`${styles.clock} ${seconds <= 10 ? styles.urgent : ''}`} role="timer">
                <Clock3 size={16} />
                {seconds ? `${seconds}s` : '揭晓中'}
              </span>
              {onClose && <IconButton label="关闭竞拍查看" icon={<X size={18} />} onClick={onClose} />}
            </header>

            <dl className={styles.facts}>
              <div>
                <dt>起拍价</dt>
                <dd>{formatMoney(minimumBid)}</dd>
                <dd className={styles.factNote}>标价 {formatMoney(tile.price ?? 0)} · 底价即抵押价值</dd>
              </div>
              <div>
                <dt>我的可用资金</dt>
                <dd>{formatMoney(funds)}</dd>
                <dd className={styles.factNote}>
                  现金 {formatMoney(cash)} ＋ 持股 {formatMoney(Math.max(0, funds - cash))}
                </dd>
              </div>
            </dl>

            {mine && !submitted ? (
              <form
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault()
                  if (valid) submit(bid)
                }}
              >
                <label htmlFor="auction-amount">我的出价</label>
                <div className={styles.bidRow}>
                  <div className={styles.bidField}>
                    <span aria-hidden="true">¥</span>
                    <input
                      id="auction-amount"
                      type="number"
                      inputMode="numeric"
                      min={minimumBid}
                      max={funds}
                      step="1"
                      value={amount}
                      disabled={locked || funds < minimumBid}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>
                  {quickBids.map((entry) => (
                    <button
                      key={entry.label}
                      type="button"
                      className={styles.quick}
                      disabled={locked || entry.value > funds}
                      onClick={() => setAmount(String(entry.value))}
                    >
                      {entry.label}
                      <strong>{formatMoney(entry.value)}</strong>
                    </button>
                  ))}
                </div>
                {amount && !valid && funds >= minimumBid && (
                  <p className={styles.error} role="status">
                    {bid > funds ? '出价超过了现金与持股可变现额' : `出价至少 ${formatMoney(minimumBid)}，须为整数`}
                  </p>
                )}
                {valid && <StockPaymentHint payment={payment} onWin />}
                <p className={styles.rule}>
                  {funds < minimumBid
                    ? `现金与持股不足，还差 ${formatMoney(minimumBid - funds)}`
                    : '出价提交后不可修改；超时视为放弃。'}
                </p>
                <div className={styles.commands}>
                  <Button variant="outline" size="lg" disabled={locked} onClick={() => submit(0)}>
                    放弃竞拍
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    icon={<Gavel size={17} />}
                    disabled={locked || !valid}
                  >
                    {sending ? '正在提交…' : valid ? `确认出价 ${formatMoney(bid)}` : '确认出价'}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <p className={styles.waiting}>{waitingNote}</p>
                {mine && submitted && myBid! > 0 && (
                  <StockPaymentHint payment={stockPaymentQuote(game, playerId, myBid!)} onWin />
                )}
              </>
            )}

            <table className={styles.ledger} aria-label="竞拍旅行者可用资金与出价状态">
              <thead>
                <tr>
                  <th scope="col">竞拍旅行者</th>
                  <th scope="col">现金＋持股</th>
                  <th scope="col">状态</th>
                </tr>
              </thead>
              <tbody>
                {auction.participantIds.map((id) => {
                  const player = game.players.find((candidate) => candidate.id === id)
                  const capacity = stockPaymentCapacity(game, id)
                  const hasBid = Object.hasOwn(auction.bids, id)
                  return (
                    <tr key={id} className={id === playerId ? styles.me : undefined}>
                      <td>
                        <span className={styles.who}>
                          {player && <TokenImage token={player.token} alt="" />}
                          {player?.name ?? '玩家'}
                          {id === playerId ? ' · 你' : ''}
                        </span>
                      </td>
                      <td className={styles.money}>{player ? formatMoney(capacity) : '—'}</td>
                      <td>
                        {hasBid ? (
                          <span className={styles.sealed}>已密封出价</span>
                        ) : capacity < minimumBid ? (
                          <span className={styles.short}>资金不足</span>
                        ) : (
                          <span className={styles.thinking}>思考中…</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <details className={styles.rules}>
              <summary>竞拍规则</summary>
              <p>报价保密，最高价成交，同价抽签；无人出价则流拍。</p>
              <p>
                30
                秒内提交，全部提交即揭晓。现金与持股合计不足底价时自动放弃；中标后支付银行，现金不足时按需卖股，未中标不卖股。
              </p>
              <p>优先使用现金，再从市值最大的持仓开始补足缺口。出价后预留付款资金，交易不能使可用资金低于报价。</p>
            </details>
          </div>
        </section>
      </div>
    </Modal>
  )
}
