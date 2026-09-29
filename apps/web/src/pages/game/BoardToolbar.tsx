import { ITEMS, rentGrowthStart, rentMultiplier, type GameView } from '@fortune/game'
import { Map, Route } from 'lucide-react'
import { TurnClock } from '../../board/GameBoard.js'
import { TokenImage } from '../../components/TokenImage.js'
import { actionDescription } from '../../components/decisionState.js'
import { formatMoney } from '../../lib/format.js'

export type BoardView = 'board' | 'route'

interface BoardToolbarProps {
  game: GameView
  playerId: string
  turnDeadline: number | null
  clockOffset: number
  boardView: BoardView
  onBoardViewChange: (view: BoardView) => void
  onOpenPlayer: (playerId: string) => void
}

export function BoardToolbar({
  game,
  playerId,
  turnDeadline,
  clockOffset,
  boardView,
  onBoardViewChange,
  onOpenPlayer,
}: BoardToolbarProps) {
  return (
    <div className="board-toolbar">
      <TurnSummary game={game} playerId={playerId} turnDeadline={turnDeadline} clockOffset={clockOffset} />
      <PlayerStrip game={game} playerId={playerId} onOpenPlayer={onOpenPlayer} />
      <div className="segmented board-view-switch" role="group" aria-label="棋盘视图">
        <button
          className={boardView === 'board' ? 'active' : ''}
          aria-pressed={boardView === 'board'}
          onClick={() => onBoardViewChange('board')}
        >
          <Map size={16} />
          实景
        </button>
        <button
          className={boardView === 'route' ? 'active' : ''}
          aria-pressed={boardView === 'route'}
          onClick={() => onBoardViewChange('route')}
        >
          <Route size={16} />
          路线
        </button>
      </div>
    </div>
  )
}

function TurnSummary({
  game,
  playerId,
  turnDeadline,
  clockOffset,
}: Pick<BoardToolbarProps, 'game' | 'playerId' | 'turnDeadline' | 'clockOffset'>) {
  const current = game.players.find((player) => player.id === game.currentPlayerId)
  const headline =
    game.phase === 'FINISHED'
      ? '本局结束'
      : game.pendingAuction
        ? '正在竞拍'
        : `${current?.id === playerId ? '轮到你' : (current?.name ?? '当前玩家')} · ${actionDescription(game)}`
  const rentGrowing = game.turnNumber >= rentGrowthStart(game.players.length)
  return (
    <div className="turn-summary">
      <div>
        <strong>{headline}</strong>
        <TurnClock deadline={game.pendingAuction?.deadline ?? turnDeadline} offset={clockOffset} />
      </div>
      <span>
        第 {game.turnNumber} 回合
        {rentGrowing ? ` · 游览费 ×${rentMultiplier(game.turnNumber, game.players.length).toFixed(2)}` : ''}
      </span>
    </div>
  )
}

function playerStatus(player: GameView['players'][number]) {
  if (player.isBankrupt) return '观战'
  const note = !player.connected ? ' · 离线' : player.isInHospital ? ' · 住院' : player.isInJail ? ' · 服刑' : ''
  return `${formatMoney(player.cash)}${note}`
}

function PlayerStrip({ game, playerId, onOpenPlayer }: Pick<BoardToolbarProps, 'game' | 'playerId' | 'onOpenPlayer'>) {
  return (
    <div className="game-player-strip" aria-label="玩家现金与当前回合">
      {game.players.map((player) => (
        <button
          key={player.id}
          className={`${player.id === game.currentPlayerId ? 'is-current' : ''} ${player.isBankrupt ? 'is-bankrupt' : ''}`}
          title={`${player.name} · ${player.isBankrupt ? '观战中' : formatMoney(player.cash)}`}
          aria-label={`查看${player.name}的资产`}
          onClick={() => onOpenPlayer(player.id)}
        >
          <span className="player-token-small" style={{ borderColor: player.color }}>
            <TokenImage token={player.token} />
            {player.turtleRollsRemaining > 0 && (
              <span className="turtle-status-badge" title={`乌龟效果：剩余 ${player.turtleRollsRemaining} 次常规掷骰`}>
                <img src={ITEMS.turtle.image} alt="乌龟效果" />
                <b>{player.turtleRollsRemaining}</b>
              </span>
            )}
          </span>
          <span>
            <strong>
              {player.name}
              {player.id === playerId ? ' · 你' : ''}
            </strong>
            <small>{playerStatus(player)}</small>
          </span>
        </button>
      ))}
    </div>
  )
}
