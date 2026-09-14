import { DICE_ROLL_MS, type DiceValues, type GameEvent } from '@fortune/game'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'

const DiceScene = lazy(() => import('./DiceScene.js'))
const purposeLabels = { movement: '掷骰出发', jail: '尝试掷对子出狱', utility: '掷骰计算公用事业费用', hospital: '尝试掷对子出院', chosen: '自选骰子 · 额外行动' }

/** All rolls share this stage, regardless of the command, viewer, or board view. */
export function DicePresentation({ event, playerName, dice, startedAt }: {
  event: GameEvent | null
  playerName: string
  dice: DiceValues
  startedAt: number
}) {
  const host = useRef<HTMLDivElement>(null)
  const [settledRollId, setSettledRollId] = useState<string | null>(null)
  const roll = event?.type === 'DICE_ROLLED' && startedAt > 0 ? event : null
  const values = roll?.dice ?? dice
  const chosen = roll?.dicePurpose === 'chosen'
  const settled = chosen || settledRollId === roll?.id
  useEffect(() => {
    const stage = host.current
    if (!stage || !roll) return
    // A non-modal top layer keeps the same 3D tray visible over the route and open information panels.
    stage.showPopover?.()
    const timer = window.setTimeout(() => setSettledRollId(roll.id), Math.max(0, (chosen ? 0 : DICE_ROLL_MS) - (performance.now() - startedAt)))
    return () => {
      clearTimeout(timer)
      stage.hidePopover?.()
    }
  }, [roll?.id, startedAt, chosen])
  return <div ref={host} popover="manual" className={`dice-presentation ${roll ? 'is-rolling' : ''}`} aria-hidden={!roll}>
    <div className="dice-stage-caption" role="status"><strong>{playerName}</strong><span>{settled ? `${values.join(' + ')}${values.length === 2 ? ` = ${values[0] + values[1]}` : ''} 点${values.length === 2 && values[0] === values[1] ? ' · 对子' : ''}` : purposeLabels[roll?.dicePurpose ?? 'movement']}</span></div>
    <div className="dice-stage-scene"><Suspense fallback={null}><DiceScene dice={values} rollId={chosen ? null : roll?.id ?? null} rollStartedAt={startedAt} /></Suspense></div>
  </div>
}
