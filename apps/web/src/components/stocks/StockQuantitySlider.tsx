import { useId, type CSSProperties } from 'react'
import './StockQuantitySlider.css'

export function StockQuantitySlider({ stockName, value, max, disabled, onChange }: {
  stockName: string
  value: number | string
  max: number
  disabled: boolean
  onChange: (value: string) => void
}) {
  const inputId = useId()
  const quantity = Number(value)
  const maximum = Number.isSafeInteger(max) && max > 0 ? max : 0
  const sliderValue = Number.isFinite(quantity) ? Math.min(maximum, Math.max(0, Math.floor(quantity))) : 0
  const invalid = value !== '' && (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > maximum)
  const unavailable = disabled || maximum === 0
  return <div className="stock-quantity-slider" style={{ '--quantity-progress': `${maximum ? sliderValue / maximum * 100 : 0}%` } as CSSProperties}>
    <input className="stock-quantity-range" type="range" min={0} max={maximum} step={1} value={sliderValue} disabled={unavailable}
      aria-label={`滑动选择${stockName}卖出股数`} aria-valuetext={`卖出 ${sliderValue} 股，最多 ${maximum} 股`}
      onChange={event => onChange(event.target.value)} />
    <label className="stock-quantity-exact" htmlFor={inputId}>
      <input id={inputId} type="number" inputMode="numeric" min={0} max={maximum} step={1} value={value} placeholder="0" autoComplete="off" disabled={unavailable}
        aria-label={`卖出${stockName}股数`} aria-invalid={invalid || undefined} onChange={event => onChange(event.target.value)} />
      <span>股</span>
    </label>
  </div>
}
