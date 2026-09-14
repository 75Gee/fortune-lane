import { BOARD, ITEMS, rentForTile, type GameEvent, type GameView } from '@fortune/game'
import { ChevronRight } from 'lucide-react'
import { TokenImage } from '../TokenImage.js'
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`
export function RouteView({ game, displayPositions, displayHazards, activeEvent, onSelectTile }: { game: GameView; displayPositions: Record<string, number>; displayHazards: GameView['hazards']; activeEvent: GameEvent | null; onSelectTile: (index: number) => void }) {
  const current = game.players.find(player => player.id === game.currentPlayerId)
  return <div className="route-list">
            {Array.from({ length: BOARD.length }, (_, offset) => {
              const tile = BOARD[((displayPositions[game.currentPlayerId] ?? current?.position ?? 0) + offset) % BOARD.length]!
              const state = game.tiles[tile.index]
              const owner = game.players.find((player) => player.id === state?.ownerId)
              const hazard = displayHazards.find((entry) => entry.tileIndex === tile.index)
              const exploding = activeEvent?.type === 'HAZARD_TRIGGERED' && activeEvent.itemKind === 'bomb' && activeEvent.tileIndex === tile.index
              const occupants = game.players.filter((player) => !player.isBankrupt && displayPositions[player.id] === tile.index)
              return <button key={tile.index} onClick={() => onSelectTile(tile.index)} className={`route-stop${exploding ? ' is-exploding' : ''}`}>
                <span className="route-number" style={{ borderColor: owner?.color ?? '#c8d2df' }}>{String(tile.index).padStart(2, '0')}</span>
                <span><strong>{tile.name}</strong><small>{offset === 0 ? '当前位置 · ' : ''}{owner ? `${owner.name} · ${state?.mortgaged ? '已抵押' : tile.kind === 'utility' ? '按骰点付费' : `游览费 ${money(rentForTile(game, tile.index, 0))}`}` : tile.price ? `售价 ${money(tile.price)}` : tile.taxAmount ? `缴税 ${money(tile.taxAmount)}` : tile.kind === 'item' ? '随机获得一张道具' : '特殊地点'}</small>{hazard && <small className="route-hazard">{ITEMS[hazard.kind].name} · 经过即触发</small>}{exploding && <small className="route-hazard" role="status">炸弹触发 · 即将送医</small>}</span>
                <span className="route-occupants">{occupants.map((player) => <TokenImage key={player.id} token={player.token} />)}</span><ChevronRight size={16} />
              </button>
            })}
          </div>
}
