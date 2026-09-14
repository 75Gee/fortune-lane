import { AIRPORT_RENTS, ITEMS, PASS_START_REWARD, RENT_GROWTH_START, UTILITY_MULTIPLIERS, getTile, rentMultiplier, scaleRent, type GameCommand, type GameView, type TileDefinition } from '@fortune/game'
import { X } from 'lucide-react'
import { BuildingIcons } from '../BuildingIcons.js'
import { CardLibrary } from '../CardLibrary.js'
import { ItemCatalog } from '../ItemInventory.js'
import { AssetActions } from './AssetActions.js'
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`
const ownable = (tile: TileDefinition) => ['property', 'airport', 'utility'].includes(tile.kind)
export function TileDetail({ game, tileIndex, playerId, onCommand, onClose }: {
  game: GameView
  tileIndex: number
  playerId: string
  onCommand: (command: GameCommand) => void
  onClose: () => void
}) {
  const tile = getTile(tileIndex)
  const state = game.tiles[tileIndex]
  const owner = game.players.find(player => player.id === state?.ownerId)

  return (
    <section className="tile-detail">
      <header>
        <div><span style={{ background: owner?.color ?? '#b8c5d0' }} /><div><small>{tile.kind === 'property' ? '地产' : tile.kind === 'airport' ? '机场' : tile.kind === 'utility' ? '公用事业' : '棋盘格'}</small><h3>{tile.name}</h3></div></div>
        <button className="icon-command" onClick={onClose} aria-label="关闭详情"><X size={17} /></button>
      </header>
      {game.hazards.filter((hazard) => hazard.tileIndex === tileIndex).map((hazard) => <p className="item-status" key={hazard.id}>{game.players.find((player) => player.id === hazard.ownerId)?.name} 放置了{ITEMS[hazard.kind].name}。{ITEMS[hazard.kind].description}</p>)}
      {ownable(tile) ? (
        <>
          {game.turnNumber > RENT_GROWTH_START && <p className="rent-notice">游览费加速 · 当前 ×{rentMultiplier(game.turnNumber).toFixed(2)}</p>}
          <div className="deed-summary">
            <div><span>购买价</span><strong>{money(tile.price ?? 0)}</strong></div>
            <div><span>抵押价</span><strong>{money(tile.mortgage ?? 0)}</strong></div>
            <div><span>当前主人</span><strong>{owner?.name ?? '银行'}</strong></div>
            <div><span>状态</span><strong>{state?.mortgaged ? '已抵押' : tile.kind === 'property' ? `${state?.level ?? 0}级` : '营业中'}</strong></div>
          </div>
          {tile.kind === 'property' && (
            <div className="rent-table">
              {tile.rents?.map((rent, index) => (
                <div className={state?.level === index ? 'current' : ''} key={index}>
                  <span className="rent-tier-label">
                    {index === 0 ? '空地' : <BuildingIcons level={index} size={17} />}
                  </span>
                  <strong>{money(scaleRent(rent, game.turnNumber))}</strong>
                </div>
              ))}
            </div>
          )}
          {tile.kind === 'airport' && <div className="rent-table">{AIRPORT_RENTS.slice(1).map((rent, index) => <div key={index}><span>持有 {index + 1} 座</span><strong>{money(scaleRent(rent, game.turnNumber))}</strong></div>)}</div>}
          {tile.kind === 'utility' && <div className="utility-rents">{UTILITY_MULTIPLIERS.slice(1).map((multiplier, index) => <p key={index}><span>持有 {index + 1} 家</span><strong>{money(scaleRent(1 * multiplier, game.turnNumber))}–{money(scaleRent(12 * multiplier, game.turnNumber))}</strong></p>)}<small>按本次到达的骰子点数计费</small></div>}
          <AssetActions game={game} tileIndex={tileIndex} playerId={playerId} onCommand={onCommand} />
        </>
      ) : tile.kind === 'item' ? <ItemCatalog /> : tile.kind === 'chance' || tile.kind === 'fate' ? <CardLibrary game={game} initialDeck={tile.kind} /> : (
        <p className="special-rule">{tile.kind === 'hospital' ? '正常到达只是探访；踩中炸弹或抽到住院卡会住院。出院规则同监狱：支付 ¥500、使用通行许可，或尝试掷对子。最多尝试三次，第三次失败需支付费用后按骰点行动。' : tile.kind === 'jail' ? '正常到达只是探访；被送入时才进入监狱。下回合可支付 ¥500、使用通行许可或尝试掷对子离开。' : tile.kind === 'go_to_jail' ? '到达后立即移动至监狱，并结束回合。' : tile.kind === 'go' ? `正向经过或到达时领取 ${money(PASS_START_REWARD)}，每圈一次。` : tile.kind === 'tax' ? `到达后向银行支付 ${money(tile.taxAmount ?? 0)}，不受游览费涨幅影响。` : '到达后立即执行该格效果。'}</p>
      )}
    </section>
  )
}
