import { BOARD, createGame, getTileById, MAX_PROPERTY_LEVEL } from '@fortune/game'
import { publicGameState } from '@fortune/protocol'
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import BoardScene from './BoardScene.js'

const previewLocations: Record<string, string> = {
  cairo: '开罗', 'hong-kong': '香港', hospital: 'hospital', items: 'item-south', go: 'go', jail: 'jail', parking: 'hospital', police: 'go_to_jail',
  bangkok: '曼谷', singapore: '新加坡', income: 'income', tokyo: '东京', seoul: '首尔', sydney: '悉尼',
  melbourne: '墨尔本', dubai: '迪拜', istanbul: '伊斯坦布尔', athens: '雅典', rome: '罗马', vienna: '维也纳',
  berlin: '柏林', amsterdam: '阿姆斯特丹', barcelona: '巴塞罗那', paris: '巴黎', london: '伦敦', toronto: '多伦多',
  'new-york': '纽约', 'los-angeles': '洛杉矶', 'san-francisco': '旧金山', shanghai: '上海', maintenance: 'maintenance', beijing: '北京',
}
const initialPosition = getTileById(previewLocations[new URLSearchParams(location.search).get('scene') ?? ''] ?? '曼谷').index

export default function ScenePreview() {
  const [game, setGame] = useState(() => {
    const state = createGame([{ id: 'preview', name: '旅行者', token: 'train' }, { id: 'companion', name: '同行者', token: 'camera' }])
    state.currentPlayerId = 'preview'
    state.players.forEach((player) => { player.position = player.id === 'preview' ? initialPosition : 7 })
    return state
  })
  const setBuildingLevel = (level: number) => setGame((current) => ({
    ...current,
    tiles: current.tiles.map((tile, index) => index === position ? { ...tile, level, ownerId: level ? 'preview' : null } : tile),
  }))
  const [position, setPosition] = useState(initialPosition)
  const currentTile = BOARD[position]!
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setPosition((value) => (value + 1) % BOARD.length), 1100)
    return () => window.clearInterval(timer)
  }, [playing])
  return <main className="world-preview">
    <header><a href="/" aria-label="返回游戏"><ArrowLeft size={20} /></a><strong>世界之旅 <span>· 场景预览</span></strong><select className="world-preview-level" aria-label={`${currentTile.name}建筑等级`} disabled={currentTile.kind !== 'property'} value={game.tiles[position]?.level ?? 0} onChange={(event) => setBuildingLevel(Number(event.target.value))}>{Array.from({ length: MAX_PROPERTY_LEVEL + 1 }, (_, level) => <option value={level} key={level}>{level === 0 ? currentTile.name : `${level}级城市设施`}</option>)}</select></header>
    <BoardScene game={publicGameState(game)} displayPositions={{ preview: position, companion: 7 }} selectedTile={selectedTile} focusPlayerId="preview" onSelectTile={setSelectedTile} />
    <footer><select className="world-preview-destination" aria-label="前往地点" value={position} onChange={(event) => { setPlaying(false); setSelectedTile(null); setPosition(Number(event.target.value)) }}>
      {BOARD.map((tile) => <option value={tile.index} key={tile.index}>{String(tile.index + 1).padStart(2, '0')} · {tile.name}</option>)}
    </select><div>
      <button title="上一站" aria-label="上一站" onClick={() => { setPlaying(false); setPosition((value) => (value + BOARD.length - 1) % BOARD.length) }}><ChevronLeft size={18} /></button>
      <button title={playing ? '暂停漫游' : '开始漫游'} aria-label={playing ? '暂停漫游' : '开始漫游'} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
      <button title="下一站" aria-label="下一站" onClick={() => { setPlaying(false); setPosition((value) => (value + 1) % BOARD.length) }}><ChevronRight size={18} /></button>
    </div><span>{String(position + 1).padStart(2, '0')} / {BOARD.length}</span></footer>
  </main>
}
