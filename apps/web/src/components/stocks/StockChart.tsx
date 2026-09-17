import type { StockPricePoint } from '@fortune/game'
import { useId, useState } from 'react'
import { stockPrice } from './format.js'

export function StockChart({ points, color, name, costCents }: { points: readonly StockPricePoint[]; color: string; name: string; costCents?: number | undefined }) {
  const id = useId().replace(/:/g, '')
  const [cursor, setCursor] = useState<number | null>(null)
  if (!points.length) return <p className="stock-chart-empty">等待首个报价</p>
  const width = 440, height = 184, left = 4, right = 66, top = 15, bottom = 26
  const plotWidth = width - left - right, plotHeight = height - top - bottom
  const prices = points.map(point => point.priceCents)
  const lowest = Math.min(...prices, costCents ?? Infinity), highest = Math.max(...prices, costCents ?? -Infinity)
  const padding = Math.max((highest - lowest) * .15, highest * .003, 1)
  const low = Math.max(0, lowest - padding), high = highest + padding
  const firstTurn = points[0]!.turn, turnSpan = points[points.length - 1]!.turn - firstTurn
  const x = (index: number) => left + (turnSpan === 0 ? .5 : (points[index]!.turn - firstTurn) / turnSpan) * plotWidth
  const y = (price: number) => top + (high - price) / (high - low) * plotHeight
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(2)},${y(point.priceCents).toFixed(2)}`).join(' ')
  const area = `${path} L${x(points.length - 1)},${top + plotHeight} L${x(0)},${top + plotHeight} Z`
  const selected = cursor === null ? points.length - 1 : Math.min(cursor, points.length - 1)
  const point = points[selected]!
  const ticks = [high, (high + low) / 2, low]
  return <figure className="stock-chart">
    <figcaption><span>第 {point.turn} 回合</span><strong>{stockPrice(point.priceCents)}</strong>{costCents !== undefined && <small>虚线为持仓成本</small>}</figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} role="slider" tabIndex={0} aria-label={`${name}价格走势，左右方向键查看历史报价`} aria-valuemin={0} aria-valuemax={points.length - 1} aria-valuenow={selected} aria-valuetext={`第 ${point.turn} 回合，${stockPrice(point.priceCents)}`}
      onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(); const turn = firstTurn + ((event.clientX - rect.left) / rect.width * width - left) / plotWidth * turnSpan; setCursor(points.reduce((best, point, index) => Math.abs(point.turn - turn) < Math.abs(points[best]!.turn - turn) ? index : best, 0)) }}
      onPointerLeave={() => setCursor(null)} onBlur={() => setCursor(null)}
      onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); setCursor(event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, selected + (event.key === 'ArrowLeft' ? -1 : 1)))) } }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {ticks.map((price, i) => <g key={i}><line x1={left} x2={left + plotWidth} y1={y(price)} y2={y(price)} stroke="#e3e8e0" strokeDasharray="3 4" /><text x={left + plotWidth + 9} y={y(price) + 4}>{(price / 100).toFixed(2)}</text></g>)}
      <path d={area} fill={`url(#${id})`} />
      {costCents !== undefined && <line x1={left} x2={left + plotWidth} y1={y(costCents)} y2={y(costCents)} stroke="#a08554" strokeDasharray="5 4" />}
      <path d={path} fill="none" stroke={color} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round" />
      {cursor !== null && <line x1={x(selected)} x2={x(selected)} y1={top} y2={top + plotHeight} stroke={color} strokeOpacity=".3" />}
      <circle cx={x(selected)} cy={y(point.priceCents)} r="3.5" fill={color} stroke="white" strokeWidth="1.5" />
      <text x={left} y={height - 4}>第 {points[0]!.turn} 回合</text>{points.length > 1 && <text x={left + plotWidth} y={height - 4} textAnchor="end">第 {points[points.length - 1]!.turn} 回合</text>}
    </svg>
  </figure>
}

export function StockSparkline({ points, color }: { points: readonly StockPricePoint[]; color: string }) {
  if (points.length < 2) return <svg viewBox="0 0 100 25" aria-hidden="true"><path d="M0,13 L100,13" stroke={color} fill="none" /></svg>
  const prices = points.map(point => point.priceCents), low = Math.min(...prices), range = Math.max(1, Math.max(...prices) - low)
  return <svg viewBox="0 0 100 25" aria-hidden="true"><path d={prices.map((price, index) => `${index ? 'L' : 'M'}${(points[index]!.turn - points[0]!.turn) / Math.max(1, points[points.length - 1]!.turn - points[0]!.turn) * 100},${23 - (price - low) / range * 21}`).join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" /></svg>
}
