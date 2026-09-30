import {
  ITEMS,
  ITEM_KINDS,
  canUseItems,
  getTile,
  itemPlacementBlockReason,
  itemPlacementOptions,
  itemUseBlockReason,
  movementPreview,
  type GameCommand,
  type GameView,
  type ItemKind,
} from '@fortune/game'
import { Backpack, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from './Modal.js'
import { TokenImage } from './TokenImage.js'
import { Button, IconButton } from '../ui/index.js'
import styles from './ItemInventory.module.css'

export function ItemCatalog() {
  return (
    <section className={styles.catalog}>
      <h3>道具补给</h3>
      <p>
        停在道具格可随机获得一张道具。每 25
        个总回合，还会向未出局玩家各随机发一张；租金开始加速时最后发放一次。四种道具机会相同。每个自己的回合最多使用一张，对子追加行动不重置；每人场上最多保留一个路障或炸弹。
      </p>
      {ITEM_KINDS.map((kind) => (
        <article key={kind}>
          <img src={ITEMS[kind].image} alt="" loading="lazy" />
          <div>
            <strong>{ITEMS[kind].name}</strong>
            <p>{ITEMS[kind].description}</p>
          </div>
        </article>
      ))}
    </section>
  )
}

export function ItemInventory({
  game,
  playerId,
  available,
  onCommand,
  onClose,
  initialItem,
}: {
  game: GameView
  playerId: string
  available: boolean
  /** Preselect this item, e.g. when opened from a shortcut on the roll ticket. */
  initialItem?: ItemKind | undefined
  onCommand: (command: GameCommand) => void
  onClose: () => void
}) {
  const me = game.players.find((player) => player.id === playerId)!
  const [selected, setSelected] = useState<ItemKind | null>(() =>
    initialItem && me.items.includes(initialItem) ? initialItem : (me.items[0] ?? null),
  )
  useEffect(() => {
    if (selected && !me.items.includes(selected)) {
      setSelected(me.items[0] ?? null)
      setTargetId('')
      setValue(null)
    }
  }, [me.items, selected])
  const [targetId, setTargetId] = useState('')
  const [value, setValue] = useState<number | null>(null)
  const usable = canUseItems(game, playerId) && available
  const item = selected ? ITEMS[selected] : null
  const target = game.players.find((player) => player.id === targetId && !player.isBankrupt)
  const [placement, setPlacement] = useState(me.position)
  useEffect(() => setPlacement(me.position), [me.position])
  const placements = itemPlacementOptions(me.position)
  const placementBlocked = itemPlacementBlockReason(game, playerId, placement)
  const preview = value ? movementPreview(game, me.position, value) : null
  const count = selected ? me.items.filter((kind) => kind === selected).length : 0
  const valid =
    usable &&
    count > 0 &&
    (selected === 'turtle'
      ? !!target && target.turtleRollsRemaining === 0
      : selected === 'chosen-die'
        ? !!value
        : !placementBlocked)
  const use = () => {
    if (!selected || !valid) return
    const command: GameCommand =
      selected === 'turtle'
        ? { type: 'USE_TURTLE', targetPlayerId: targetId }
        : selected === 'chosen-die'
          ? { type: 'USE_CHOSEN_DIE', value: value! }
          : { type: selected === 'roadblock' ? 'PLACE_ROADBLOCK' : 'PLACE_BOMB', tileIndex: placement }
    onCommand(command)
    onClose()
  }
  const hint = itemUseBlockReason(game, playerId) ?? (!available ? '当前行动结束后可使用' : null)

  return (
    <Modal label="我的道具包" onDismiss={onClose}>
      <div className={styles.overlay}>
        <section className={styles.pouch} aria-label="我的道具">
          <header className={styles.header}>
            <Backpack size={22} />
            <div>
              <h2>我的道具</h2>
              <small>共 {me.items.length} 张 · 每回合限用 1 张</small>
            </div>
            <IconButton variant="ghost" label="关闭道具包" icon={<X size={19} />} onClick={onClose} />
          </header>
          <div className={styles.body}>
            {hint && (
              <p className={styles.hint} role="status">
                {hint}
              </p>
            )}
            {me.turtleRollsRemaining > 0 && (
              <p className={styles.status}>乌龟效果剩余 {me.turtleRollsRemaining} 次：常规行动只掷一颗骰子。</p>
            )}
            <div className={styles.items} role="group" aria-label="选择道具">
              {ITEM_KINDS.filter((kind) => me.items.includes(kind)).map((kind) => {
                const amount = me.items.filter((held) => held === kind).length
                return (
                  <button
                    key={kind}
                    aria-label={`${ITEMS[kind].name}，持有 ${amount} 张`}
                    aria-pressed={selected === kind}
                    onClick={() => setSelected(kind)}
                  >
                    <img src={ITEMS[kind].image} alt="" />
                    <strong>{ITEMS[kind].name}</strong>
                    <small>×{amount}</small>
                  </button>
                )
              })}
            </div>
            {!item && (
              <p className={styles.empty}>
                停在道具格可获得随机道具；每25总回合领取自选骰子，租金加速开始时最后发放一次。
              </p>
            )}
            {item && (
              <div className={styles.selection}>
                <p className={styles.effect}>
                  {selected === 'turtle'
                    ? '使目标接下来两次常规行动只掷一颗骰子。'
                    : selected === 'chosen-die'
                      ? '选择点数，额外前进一次。'
                      : selected === 'roadblock'
                        ? '选择位置，拦停下一位经过的玩家。'
                        : '选择位置，踩中的玩家将住院并结束回合。'}
                </p>
                {selected === 'turtle' && count > 0 && (
                  <div className={styles.targets} role="group" aria-label="指定乌龟卡目标">
                    {game.players
                      .filter((player) => !player.isBankrupt)
                      .map((player) => (
                        <button
                          key={player.id}
                          disabled={!usable || player.turtleRollsRemaining > 0}
                          aria-pressed={targetId === player.id}
                          onClick={() => setTargetId(player.id)}
                        >
                          <TokenImage token={player.token} />
                          <span>
                            <strong>
                              {player.name}
                              {player.id === playerId ? ' · 你' : ''}
                            </strong>
                            {(player.turtleRollsRemaining > 0 || player.isInHospital || player.isInJail) && (
                              <small>
                                {player.turtleRollsRemaining > 0
                                  ? `乌龟剩余 ${player.turtleRollsRemaining} 次`
                                  : player.isInHospital
                                    ? '出院后生效'
                                    : '出狱后生效'}
                              </small>
                            )}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
                {selected === 'chosen-die' && count > 0 && (
                  <>
                    <div className={styles.dice} role="group" aria-label="指定骰子点数">
                      {[1, 2, 3, 4, 5, 6].map((number) => (
                        <button
                          key={number}
                          aria-label={`${number}点`}
                          disabled={!usable}
                          aria-pressed={value === number}
                          onClick={() => setValue(number)}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                    {preview && (
                      <p className={`${styles.preview} ${preview.hazard ? styles.warning : ''}`} role="status">
                        {preview.hazard?.kind === 'bomb'
                          ? `途中会踩中 ${getTile(preview.hazard.tileIndex).name} 的炸弹，送医并结束回合。`
                          : preview.hazard
                            ? `将被 ${getTile(preview.destination).name} 的路障拦停，结算该格。`
                            : `将前进到 ${getTile(preview.destination).name}，执行该格效果。`}
                      </p>
                    )}
                  </>
                )}
                {(selected === 'roadblock' || selected === 'bomb') && (
                  <>
                    <div className={styles.placements} role="group" aria-label="选择放置位置">
                      {placements.map(({ tileIndex, label }) => {
                        const blocked = itemPlacementBlockReason(game, playerId, tileIndex)
                        const hazard = game.hazards.find((entry) => entry.tileIndex === tileIndex)
                        return (
                          <button
                            key={tileIndex}
                            disabled={!usable || !!blocked}
                            title={blocked ?? undefined}
                            aria-pressed={placement === tileIndex}
                            onClick={() => setPlacement(tileIndex)}
                          >
                            <small>{label}</small>
                            <strong>{getTile(tileIndex).name}</strong>
                            {(hazard || blocked) && (
                              <span>{hazard ? `已有${ITEMS[hazard.kind].name}` : '不可放置'}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <p className={`${styles.preview} ${placementBlocked ? styles.warning : ''}`} role="status">
                      {placementBlocked ?? '放置时不触发；自己再次经过也会触发。'}
                    </p>
                  </>
                )}
                <div className={styles.confirm}>
                  <Button variant="primary" size="lg" block disabled={!valid} onClick={use}>
                    {!count
                      ? '停在道具格有机会获得'
                      : selected === 'turtle'
                        ? target
                          ? `对 ${target.name} 使用${item.name}`
                          : '先选择一名玩家'
                        : selected === 'chosen-die'
                          ? value
                            ? `使用并前进 ${value} 点`
                            : '先选择骰子点数'
                          : `在${getTile(placement).name}放置${item.name}`}
                  </Button>
                </div>
                <details className={styles.rules}>
                  <summary>使用规则</summary>
                  <p>{item.description}</p>
                  <p>每个自己的回合最多使用一张道具，对子追加行动不重置。</p>
                </details>
              </div>
            )}
          </div>
        </section>
      </div>
    </Modal>
  )
}
