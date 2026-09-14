import { useEffect, useState } from 'react'
import { WHEEL_LABELS, WHEEL_SECTORS, WHEEL_SPIN_MS, type PendingWheel } from '@fortune/game'
import { Modal } from './Modal.js'

import { FlatWheel } from './FlatWheel.js'
// Preview seeds only need to vary between throws; LAN HTTP has no randomUUID API.
let previewSequence = 0
const readyWheel = (): PendingWheel => ({ id: `preview-${Date.now()}-${++previewSequence}`, playerId: 'debug', deck: 'chance', stage: 'ready', outcome: null, startedAt: null, ballAngle: 22.5 })

export default function DebugPanel({ onClose }: { onClose: () => void }) {
  const [testing, setTesting] = useState(false)
  const [sector, setSector] = useState('random')
  const [wheel, setWheel] = useState(readyWheel)
  useEffect(() => {
    if (wheel.stage !== 'spinning' || wheel.startedAt === null) return
    const timer = window.setTimeout(() => setWheel(current => ({ ...current, stage: 'choosing' })), Math.max(0, wheel.startedAt + WHEEL_SPIN_MS - Date.now()))
    return () => window.clearTimeout(timer)
  }, [wheel.stage, wheel.startedAt])
  const spin = () => {
    const index = sector === 'random' ? Math.floor(Math.random() * WHEEL_SECTORS.length) : Number(sector)
    setWheel(current => ({ ...current, stage: 'spinning', startedAt: Date.now(), ballAngle: index * 45 + 22.5, outcome: WHEEL_SECTORS[index]! }))
  }
  return <Modal label="调试面板" onDismiss={onClose}><div className="landing-overlay wheel-overlay"><section className="landing-dialog wheel-dialog debug-panel">
    <header className="debug-panel-head"><h2>{testing ? '转盘预览' : '调试面板'}</h2><button type="button" onClick={onClose}>关闭</button></header>
    {!testing ? <button className="primary-command" onClick={() => setTesting(true)}>转盘预览</button> : <>
      <p>本地预览，不影响对局资产。</p>
      <FlatWheel wheel={wheel} clockOffset={0} soundEnabled={false} onSpin={spin} />
      <div className="wheel-outcome" role="status"><strong>{wheel.stage === 'ready' ? '准备开始' : wheel.stage === 'spinning' ? '指针转动中…' : WHEEL_LABELS[wheel.outcome!]}</strong></div>
      <label className="field"><span>落点（从正上方顺时针）</span><select value={sector} disabled={wheel.stage !== 'ready'} onChange={event => setSector(event.target.value)}><option value="random">随机结果</option>{WHEEL_SECTORS.map((outcome, index) => <option key={index} value={index}>区域 {index + 1} · {WHEEL_LABELS[outcome]}</option>)}</select></label>
      <button className="primary-command" disabled={wheel.stage === 'spinning'} onClick={() => wheel.stage === 'choosing' ? setWheel(readyWheel()) : spin()}>{wheel.stage === 'ready' ? '开始转盘' : wheel.stage === 'spinning' ? '正在转动…' : '再来一次'}</button>
      <button className="debug-back" onClick={() => { setTesting(false); setWheel(readyWheel()) }}>返回调试面板</button>
    </>}
  </section></div></Modal>
}
