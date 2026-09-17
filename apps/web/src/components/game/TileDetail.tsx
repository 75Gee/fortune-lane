import { AIRPORT_RENTS, ITEMS, MAX_PROPERTY_LEVEL, PASS_START_REWARD, RENT_GROWTH_START, UTILITY_MULTIPLIERS, getTile, rentForTile, rentMultiplier, scaleRent, type GameCommand, type GameView, type TileDefinition } from '@fortune/game'
import { ChevronLeft, X } from 'lucide-react'
import { CardLibrary } from '../CardLibrary.js'
import { ItemCatalog } from '../ItemInventory.js'
import { AssetActions } from './AssetActions.js'
const money = (value: number) => `¥${value.toLocaleString('zh-CN')}`
const ownable = (tile: TileDefinition) => ['property', 'airport', 'utility'].includes(tile.kind)
export function TileDetail({ game, tileIndex, playerId, onCommand, onClose, onBack }: {
  game: GameView
  tileIndex: number
  playerId: string
  onCommand: (command: GameCommand) => void
  onClose: () => void
  onBack?: () => void
}) {
  const tile = getTile(tileIndex)
  const state = game.tiles[tileIndex]
  const owner = game.players.find(player => player.id === state?.ownerId)
  const rentOwner = owner?.id ?? playerId
  const rent = tile.kind === 'utility' ? `${money(rentForTile(game, tileIndex, 1, rentOwner))}–${money(rentForTile(game, tileIndex, 12, rentOwner))}` : money(rentForTile(game, tileIndex, 0, rentOwner))
  const subtitle = ownable(tile)
    ? `${owner?.name ?? '银行'} · ${state?.mortgaged ? '已抵押' : tile.kind === 'property' ? `${state?.level ?? 0} 级` : tile.kind === 'airport' ? '机场' : '公用事业'}`
    : '棋盘格'

  return (
    <section className="tile-detail">
      <header className="deed-header">
        {onBack && <button className="icon-command" onClick={onBack} aria-label="返回资产列表" autoFocus><ChevronLeft size={21} /></button>}
        <div className="deed-title"><h3>{tile.name}</h3><small>{subtitle}</small></div>
        <button className="icon-command" onClick={onClose} aria-label="关闭详情"><X size={17} /></button>
      </header>
      {game.hazards.filter((hazard) => hazard.tileIndex === tileIndex).map((hazard) => <p className="item-status" key={hazard.id}>{game.players.find((player) => player.id === hazard.ownerId)?.name} 放置了{ITEMS[hazard.kind].name}。{ITEMS[hazard.kind].description}</p>)}
      {ownable(tile) ? (
        <div className="deed-content">
          <dl className="deed-facts">
            <div className="deed-rent"><dt>{owner ? '游览费' : '购入后游览费'}</dt><dd>{state?.mortgaged ? '暂停收费' : rent}</dd></div>
            <div><dt>购买价</dt><dd>{money(tile.price ?? 0)}</dd></div>
            <div><dt>抵押价</dt><dd>{money(tile.mortgage ?? 0)}</dd></div>
          </dl>
          {tile.kind === 'utility' && !state?.mortgaged && <p className="deed-note">按到达时骰点计费</p>}
          <AssetActions game={game} tileIndex={tileIndex} playerId={playerId} onCommand={onCommand} />
          <details className="deed-all-rates"><summary>费用详情</summary>
          {tile.kind === 'property' && !state?.mortgaged && (state?.level ?? 0) < MAX_PROPERTY_LEVEL && <dl className="deed-facts deed-upgrade"><div><dt>升级费用<small>再次到达时可升级</small></dt><dd>{money(tile.buildCost ?? 0)}</dd></div></dl>}
          {game.turnNumber > RENT_GROWTH_START && <p className="rent-notice">游览费加速 · 当前 ×{rentMultiplier(game.turnNumber).toFixed(2)}</p>}
          {(tile.kind === 'property' || tile.kind === 'airport') && <table className="deed-rates-table">
            <thead><tr><th>{tile.kind === 'property' ? '等级' : '持有机场'}</th><th>游览费</th></tr></thead>
            <tbody>{(tile.kind === 'property' ? tile.rents : AIRPORT_RENTS.slice(1))?.map((rent, index) => <tr className={tile.kind === 'property' && state?.level === index ? 'current' : ''} key={index}><td>{tile.kind === 'airport' ? `${index + 1} 座` : index === 0 ? '空地' : `${index} 级`}</td><td>{money(scaleRent(rent, game.turnNumber))}</td></tr>)}</tbody>
          </table>}
          {tile.kind === 'utility' && <div className="utility-rents">{UTILITY_MULTIPLIERS.slice(1).map((multiplier, index) => <p key={index}><span>持有 {index + 1} 家</span><strong>{money(scaleRent(1 * multiplier, game.turnNumber))}–{money(scaleRent(12 * multiplier, game.turnNumber))}</strong></p>)}<small>按本次到达的骰子点数计费</small></div>}
          </details>
        </div>
      ) : tile.kind === 'item' ? <ItemCatalog /> : tile.kind === 'chance' || tile.kind === 'fate' ? <CardLibrary game={game} initialDeck={tile.kind} /> : (
        <p className="special-rule">{tile.kind === 'hospital' ? '正常到达只是探访；踩中炸弹或抽到住院卡会住院。出院规则同监狱：支付 ¥500、使用通行许可，或尝试掷对子。最多尝试三次，第三次失败需支付费用后按骰点行动。' : tile.kind === 'jail' ? '正常到达只是探访；被送入时才进入监狱。下回合可支付 ¥500、使用通行许可或尝试掷对子离开。' : tile.kind === 'go_to_jail' ? '到达后立即移动至监狱，并结束回合。' : tile.kind === 'go' ? `正向经过或到达时领取 ${money(PASS_START_REWARD)}，每圈一次。` : tile.kind === 'tax' ? `到达后向银行支付 ${money(tile.taxAmount ?? 0)}，不受游览费涨幅影响。` : '到达后立即执行该格效果。'}</p>
      )}
    </section>
  )
}
