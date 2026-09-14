import { BOARD } from '@fortune/game'
import { Focus, LocateFixed, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createBoardScene } from './BoardSceneController.js'
import type { BoardSceneProps, CameraMode, ViewAction } from './boardSceneTypes.js'

export default function BoardScene(props: BoardSceneProps) {
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<ReturnType<typeof createBoardScene>>(null)
  const latest = useRef(props); latest.current = props
  const [failed, setFailed] = useState(false)
  const [mode, setMode] = useState<CameraMode>('follow')
  const focusPlayer = props.game.players.find((player) => player.id === (props.focusPlayerId ?? props.game.currentPlayerId))
  const focusIndex = focusPlayer ? props.displayPositions[focusPlayer.id] ?? focusPlayer.position : 0
  const navigate = (action: ViewAction) => { if (action !== 'in' && action !== 'out') setMode(action); controller.current?.setView(action) }

  useEffect(() => {
    const scene = createBoardScene(host.current!, () => latest.current, () => setFailed(true))
    controller.current = scene
    return () => { controller.current = null; scene?.dispose() }
  }, [])
  useEffect(() => { controller.current?.update() }, [props.game, props.selectedTile, props.displayPositions, props.activeEvent, props.eventStartedAt, props.focusPlayerId, props.teleportPlayerId])
  useEffect(() => { controller.current?.setEnabled(props.active ?? true) }, [props.active])
  return <div className="board-scene-wrap">
    <div className="board-scene" ref={host} aria-label="世界之旅三维场景">
      {failed && <p className="scene-fallback">3D 画面暂不可用，请切换路线查看地点。</p>}
    </div>
    {!failed && <>
      <div className="world-location"><strong>{mode === 'overview' ? '世界棋盘' : BOARD[focusIndex]?.name}</strong>{props.game.hazards.some((hazard) => hazard.tileIndex === focusIndex) && <small>此处有{props.game.hazards.find((hazard) => hazard.tileIndex === focusIndex)?.kind === 'bomb' ? '炸弹' : '路障'} · 再次经过将触发</small>}</div>
      <div className="scene-tools" role="group" aria-label="场景视角">
        <button title="跟随棋子" aria-label="跟随棋子" aria-pressed={mode === 'follow'} onClick={() => navigate('follow')}><LocateFixed size={18} /></button>
        <button title="查看全景" aria-label="查看全景" aria-pressed={mode === 'overview'} onClick={() => navigate('overview')}><Focus size={18} /></button>
        <button title="拉近" aria-label="拉近" onClick={() => navigate('in')}><Plus size={18} /></button>
        <button title="拉远" aria-label="拉远" onClick={() => navigate('out')}><Minus size={18} /></button>
      </div>
    </>}
  </div>
}
