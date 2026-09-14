import { WHEEL_LABELS, WHEEL_SECTORS, WHEEL_SPIN_MS, type PendingWheel } from '@fortune/game'
import { useEffect, useId, useRef, useState } from 'react'
import { playWheelTick } from '../audio/sound.js'
import { sceneRenderLoop } from '../board/SceneRenderLoop.js'

const prizes = {
  gain_cash: ['+2,000', '获得现金'], gain_house: ['升 1 级', '城市升级'],
  lose_cash: ['−2,000', '支付现金'], lose_house: ['降 1 级', '城市降级'],
} as const
function point(radius: number, angle: number) {
  const radians = angle * Math.PI / 180
  return [220 + Math.sin(radians) * radius, 220 - Math.cos(radians) * radius] as const
}
function wedge(from: number, to: number) {
  const a = point(181, from), b = point(181, to)
  return `M220 220L${a[0]} ${a[1]}A181 181 0 0 1 ${b[0]} ${b[1]}Z`
}

export function FlatWheel({ wheel, clockOffset, soundEnabled, onSpin, disabled = false }: {
  wheel: PendingWheel; clockOffset: number; soundEnabled: boolean; onSpin?: (() => void) | undefined; disabled?: boolean
}) {
  const host = useRef<SVGSVGElement>(null)
  const pointer = useRef<SVGGElement>(null)
  const id = useId().replaceAll(':', '')
  const latest = useRef({ wheel, clockOffset, soundEnabled })
  latest.current = { wheel, clockOffset, soundEnabled }
  const [stoppedId, setStoppedId] = useState<string | null>(null)
  const stopped = wheel.stage === 'choosing' || (wheel.stage === 'spinning' && stoppedId === `${wheel.id}:${wheel.startedAt}`)
  const selected = stopped ? Math.floor(((wheel.ballAngle % 360) + 360) % 360 / 45) : -1

  useEffect(() => {
    let lastSector = -1
    const loop = sceneRenderLoop(host.current!, 'foreground', ({ reducedMotion }) => {
      const { wheel: current, clockOffset: offset, soundEnabled: sound } = latest.current
      const progress = current.stage === 'ready' ? 0 : current.stage === 'choosing' ? 1
        : Math.min(1, Math.max(0, (Date.now() + offset - (current.startedAt ?? Date.now())) / WHEEL_SPIN_MS))
      const eased = 1 - (1 - progress) ** 3
      const angle = reducedMotion ? (progress >= 1 ? current.ballAngle : 0) : (1800 + current.ballAngle) * eased
      pointer.current?.setAttribute('transform', `rotate(${angle} 220 220)`)
      const sector = Math.floor(angle / 45)
      if (current.stage === 'spinning' && !reducedMotion && progress > 0 && progress < 1 && sector !== lastSector) playWheelTick(sound)
      lastSector = sector
      if (progress >= 1) setStoppedId(`${current.id}:${current.startedAt}`)
      return current.stage === 'spinning' && progress < 1
    })
    return loop.dispose
  }, [wheel.id, wheel.stage, wheel.startedAt, wheel.ballAngle, clockOffset])

  return <div className={`flat-wheel ${wheel.stage === 'spinning' && !stopped ? 'is-spinning' : ''}`}>
    <svg ref={host} viewBox="0 0 440 490" role="img" aria-label={stopped && wheel.outcome ? `幸运转盘：${WHEEL_LABELS[wheel.outcome]}` : '八格幸运转盘，每种结果占两格'}>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ed4035" /><stop offset="1" stopColor="#b81e27" /></linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff7b5" /><stop offset="1" stopColor="#ffc857" /></linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#843719" floodOpacity=".22" /></filter>
      </defs>
      <path d="M165 389h110l14 74H151Z" fill="#b7222a" />
      <path d="M165 389h110l5 31c-39 17-74 18-121 0Z" fill="#941c25" />
      <rect x="122" y="460" width="196" height="18" rx="7" fill="#cb2830" />
      <circle cx="220" cy="224" r="208" fill="#a91b23" opacity=".15" />
      <circle cx="220" cy="220" r="207" fill={`url(#${id}-rim)`} />
      <circle cx="220" cy="220" r="184" fill="#f4bd51" stroke="#9d2924" strokeWidth="3" />
      {WHEEL_SECTORS.map((outcome, index) => {
        const [x, y] = point(123, index * 45 + 22.5)
        return <g key={index} className={selected === index ? 'wheel-prize is-selected' : 'wheel-prize'}>
          <path d={wedge(index * 45, (index + 1) * 45)} fill={index % 2 ? '#ffe799' : '#ffc267'} stroke="#fff0b3" strokeWidth="1.5" />
          <text x={x} y={y - 3} textAnchor="middle" fill="#77381f" fontSize="18" fontWeight="850">{prizes[outcome][0]}</text>
          <text x={x} y={y + 17} textAnchor="middle" fill="#975432" fontSize="11" fontWeight="650">{prizes[outcome][1]}</text>
        </g>
      })}
      <circle cx="220" cy="220" r="181" fill="none" stroke="#e8ae47" strokeWidth="3" />
      {Array.from({ length: 32 }, (_, index) => {
        const [x, y] = point(195, index * 360 / 32)
        return <circle key={index} className={`wheel-bulb bulb-${index % 2}`} cx={x} cy={y} r="5" fill="#fff9d9" />
      })}
      <g ref={pointer} filter={`url(#${id}-shadow)`}>
        <path d="M205 205L220 53L235 205Z" fill={`url(#${id}-gold)`} stroke="#fffbed" strokeWidth="4" strokeLinejoin="round" />
        <path d="M220 68v122" stroke="#eab63e" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="220" cy="220" r="47" fill="#a84127" opacity=".18" />
    </svg>
    <button className="wheel-start" type="button" disabled={disabled || wheel.stage !== 'ready' || !onSpin} onClick={onSpin} aria-label={wheel.stage === 'ready' ? '开始转盘' : wheel.stage === 'spinning' ? '转盘转动中' : '转盘已揭晓'}>
      <strong>{wheel.stage === 'ready' ? 'GO' : stopped ? '好运' : '•••'}</strong><span>{wheel.stage === 'ready' ? '开始' : stopped ? '已揭晓' : '转动中'}</span>
    </button>
  </div>
}
