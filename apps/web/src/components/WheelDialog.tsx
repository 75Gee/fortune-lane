import { WHEEL_LABELS, scaleRent, wheelProperties, type GameCommand, type GameView, type PendingWheel } from '@fortune/game'
import { House, RotateCw, X } from 'lucide-react'
import { useContext } from 'react'
import { TurnClock } from '../board/GameBoard.js'
import { FlatWheel } from './FlatWheel.js'
import { CommandAvailabilityContext, Modal } from './Modal.js'

export function WheelDialog({ game, wheel, playerId, onCommand, clockOffset, soundEnabled, deadline = null, onClose }: {
  game: GameView; wheel: PendingWheel; playerId: string; onCommand: (command: GameCommand) => void; clockOffset: number; soundEnabled: boolean; deadline?: number | null; onClose?: (() => void) | undefined
}) {
  const mine = wheel.playerId === playerId
  const available = useContext(CommandAvailabilityContext)
  const current = game.players.find(player => player.id === wheel.playerId)
  const candidates = wheelProperties(game, wheel.playerId, wheel.outcome)
  const choosing = wheel.stage === 'choosing'
  return <Modal label="幸运转盘" onDismiss={onClose}><div className="landing-overlay wheel-overlay"><section className="landing-dialog wheel-dialog">
    {onClose && <button className="decision-close icon-command" aria-label="关闭转盘查看" onClick={onClose}><X size={18} /></button>}
    <header className="landing-dialog-head"><span><RotateCw size={22} /></span><div><small>{current?.name} · {wheel.deck === 'chance' ? '机会' : '命运'}</small><h2>幸运转盘</h2></div></header>
    {choosing ? <details className="wheel-previous"><summary>查看转盘结果</summary><FlatWheel wheel={wheel} clockOffset={clockOffset} soundEnabled={soundEnabled} disabled /></details>
      : <FlatWheel wheel={wheel} clockOffset={clockOffset} soundEnabled={soundEnabled} disabled={!available || !mine} onSpin={mine ? () => { if (available) onCommand({ type: 'SPIN_WHEEL', wheelId: wheel.id }) } : undefined} />}
    <div className="wheel-outcome" aria-live="polite"><strong>{wheel.stage === 'ready' ? mine ? '点一下，转出你的好运' : `等待 ${current?.name} 开始` : wheel.stage === 'spinning' ? '好运转动中…' : wheel.outcome ? WHEEL_LABELS[wheel.outcome] : ''}</strong>
      {choosing && <p>{mine ? wheel.outcome === 'gain_house' ? '选一块地产，免费升一级' : '选一块地产降一级，不返还建造费' : `等待 ${current?.name} 选择地产`}</p>}
    </div>
    {wheel.stage !== 'spinning' && <div className="decision-timing"><TurnClock deadline={deadline} offset={clockOffset} /><span>{wheel.stage === 'ready' ? '超时自动开始' : '超时自动选择地产'}</span></div>}
    {choosing && <div className="wheel-properties">{candidates.map(tile => <button key={tile.index} disabled={!available || !mine} onClick={() => onCommand({ type: 'CHOOSE_WHEEL_PROPERTY', wheelId: wheel.id, tileIndex: tile.index })}><House size={18} /><strong>{tile.name}</strong><span>{game.tiles[tile.index]!.level} → {game.tiles[tile.index]!.level + (wheel.outcome === 'gain_house' ? 1 : -1)} 级<small>调整后游览费 ¥{scaleRent(tile.rents?.[game.tiles[tile.index]!.level + (wheel.outcome === 'gain_house' ? 1 : -1)] ?? 0, game.turnNumber).toLocaleString('zh-CN')}</small></span></button>)}</div>}
  </section></div></Modal>
}
