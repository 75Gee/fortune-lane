import { BOARD, getTileById } from './board.js'
import type { CardDeckKind, DeckState, GameState, ItemKind, RandomSource } from './types.js'

export type CardMood = 'good' | 'bad' | 'neutral'
export type CardEffect =
  | { type: 'wheel' }
  | { type: 'money'; amount: number }
  | { type: 'move_to'; tileIndex: number; collectStart: boolean }
  | { type: 'move_steps'; steps: number }
  | { type: 'nearest'; tileKind: 'airport' | 'utility' }
  | { type: 'jail' | 'hospital' | 'get_out' | 'downgrade' | 'turtle' }
  | { type: 'item'; kind: ItemKind }
  | { type: 'repairs'; perHouse: number; perHotel: number; cap: number }
  | { type: 'assessment'; perAsset: number; cap: number }
  | { type: 'asset_income'; perAsset: number; minimum: number; cap: number }
  | { type: 'relief' | 'cash_relief'; threshold: number; amount: number; otherwise: number }
  | { type: 'renovate'; fallback: number }

export interface GameCard {
  id: string
  deck: CardDeckKind
  mood: CardMood
  title: string
  reason: string
  description: string
  details: string
  effect: CardEffect
}

function card(deck: CardDeckKind, mood: CardMood, id: string, title: string, reason: string, result: string, effect: CardEffect): GameCard {
  const description = `${reason}，${result}。`
  return { id: `${deck}-${id}`, deck, mood, title, reason, description, details: description, effect }
}
const chance = (mood: CardMood, id: string, title: string, reason: string, result: string, effect: CardEffect) => card('chance', mood, id, title, reason, result, effect)
const fate = (mood: CardMood, id: string, title: string, reason: string, result: string, effect: CardEffect) => card('fate', mood, id, title, reason, result, effect)
const city = (name: string): CardEffect => ({ type: 'move_to', tileIndex: getTileById(name).index, collectStart: true })

export const CHANCE_CARDS: readonly GameCard[] = [
  chance('good', 'photo', '镜头里的风景', '旅行照片入选城市明信片', '获得200元稿酬', { type: 'money', amount: 200 }),
  chance('good', 'refund', '机票差额', '航空公司退回票价差额', '获得300元', { type: 'money', amount: 300 }),
  chance('good', 'guide', '顺路带个团', '热心带路收获旅行团好评', '获得400元酬谢', { type: 'money', amount: 400 }),
  chance('good', 'dividend', '旅行专栏', '你的城市攻略登上杂志', '获得600元稿酬', { type: 'money', amount: 600 }),
  chance('good', 'award', '城市创意奖', '你设计的游览路线获奖', '获得800元奖金', { type: 'money', amount: 800 }),
  chance('good', 'travel-fund', '旅途加油站', '旅行基金送来一份补助', '领取旅费', { type: 'cash_relief', threshold: 3000, amount: 800, otherwise: 200 }),
  chance('good', 'festival', '城市嘉年华', '名下旅行项目迎来节日客流', '获得活动收入', { type: 'asset_income', perAsset: 50, minimum: 200, cap: 500 }),
  chance('good', 'go', '新的旅程', '下一段旅程即将启程', '前往起点领取1500元', { type: 'move_to', tileIndex: 0, collectStart: true }),
  chance('good', 'relief', '小小旅行梦想', '城市计划支持你的旅行事业', '领取发展补助', { type: 'relief', threshold: 2, amount: 800, otherwise: 200 }),
  chance('good', 'free', '通行许可', '旅行服务站替你备好手续', '获得一次免费出狱或出院的许可', { type: 'get_out' }),
  chance('good', 'renovate', '城市焕新', '城市志愿者帮忙改善游览设施', '一处城市免费升一级', { type: 'renovate', fallback: 200 }),
  chance('good', 'roadblock', '施工小帮手', '朋友寄来一份旅行补给', '获得一张路障卡', { type: 'item', kind: 'roadblock' }),
  chance('good', 'bomb', '恶作剧包裹', '纪念品店送来神秘赠品', '获得一张炸弹卡', { type: 'item', kind: 'bomb' }),
  chance('good', 'street-star', '街头明星', '即兴表演意外赢得满堂彩', '获得500元打赏', { type: 'money', amount: 500 }),
  chance('good', 'lucky-tourist', '幸运游客', '你成为景区第10000位游客', '获得800元奖金', { type: 'money', amount: 800 }),
  chance('bad', 'luggage', '行李超重', '纪念品塞满了行李箱', '支付300元托运费', { type: 'money', amount: -300 }),
  chance('bad', 'ticket', '错过末班车', '拍夜景忘了看时间', '支付400元打车费', { type: 'money', amount: -400 }),
  chance('bad', 'repair', '相机小意外', '相机在旅途中摔坏了', '支付500元维修费', { type: 'money', amount: -500 }),
  chance('bad', 'rebook', '临时改签', '看错了航班日期', '支付600元改签费', { type: 'money', amount: -600 }),
  chance('bad', 'maintenance', '景点保养', '游览设施到了保养时间', '支付本次维护费', { type: 'repairs', perHouse: 60, perHotel: 250, cap: 800 }),
  chance('bad', 'jail', '手续有误', '旅行证件需要进一步核查', '进入监狱', { type: 'jail' }),
  chance('neutral', 'forward-one', '街角风景', '发现一条漂亮的小巷', '前进1格', { type: 'move_steps', steps: 1 }),
  chance('neutral', 'forward-two', '搭上便车', '顺路搭上观光接驳车', '前进2格', { type: 'move_steps', steps: 2 }),
  chance('neutral', 'forward', '城市快线', '赶上刚发车的城市快线', '前进3格', { type: 'move_steps', steps: 3 }),
  chance('neutral', 'back-one', '再看一眼', '街角的风景值得回头', '后退1格', { type: 'move_steps', steps: -1 }),
  chance('neutral', 'back-two', '落下帽子', '发现帽子忘在休息处', '后退2格', { type: 'move_steps', steps: -2 }),
  chance('neutral', 'back', '临时改道', '游览路线临时调整', '后退3格', { type: 'move_steps', steps: -3 }),
  chance('neutral', 'vienna', '音乐之都', '收到一场音乐会的邀请', '前往维也纳', city('维也纳')),
  chance('neutral', 'paris', '塞纳河畔', '想去河畔写生留下纪念', '前往巴黎', city('巴黎')),
  chance('neutral', 'airport', '赶上航班', '下一程航班即将登机', '前往下一座机场', { type: 'nearest', tileKind: 'airport' }),
  chance('neutral', 'utility', '城市探访', '报名参观城市能源设施', '前往下一家水电公司', { type: 'nearest', tileKind: 'utility' }),
  chance('neutral', 'wheel-one', '幸运转盘', '路过热闹的城市游园会', '转动幸运转盘', { type: 'wheel' }),
]

export const FATE_CARDS: readonly GameCard[] = [
  fate('good', 'gift', '旅途礼金', '朋友送来下一站的旅费', '获得300元', { type: 'money', amount: 300 }),
  fate('good', 'refund', '行程退款', '预订的游览项目退回差额', '获得400元', { type: 'money', amount: 400 }),
  fate('good', 'bonus', '摄影获奖', '旅途中的随手一拍获奖', '获得600元奖金', { type: 'money', amount: 600 }),
  fate('good', 'relief', '旅行新计划', '城市计划支持你的旅行事业', '领取发展补助', { type: 'relief', threshold: 2, amount: 800, otherwise: 200 }),
  fate('good', 'free', '特别许可', '旅行服务站替你备好手续', '获得一次免费出狱或出院的许可', { type: 'get_out' }),
  fate('good', 'renovate', '景点新气象', '社区协助改善游览设施', '一处城市免费升一级', { type: 'renovate', fallback: 200 }),
  fate('bad', 'umbrella', '突如其来的雨', '出门忘了带伞', '支付100元买伞', { type: 'money', amount: -100 }),
  fate('bad', 'souvenir', '纪念品诱惑', '没忍住买了限定冰箱贴', '支付200元', { type: 'money', amount: -200 }),
  fate('bad', 'luggage', '行李托运', '行李超过托运限额', '支付300元', { type: 'money', amount: -300 }),
  fate('bad', 'checkup', '旅途体检', '长途旅行后做个身体检查', '支付400元检查费', { type: 'money', amount: -400 }),
  fate('bad', 'insurance', '旅行保险', '为接下来的旅程补办保险', '支付500元', { type: 'money', amount: -500 }),
  fate('bad', 'lost-ticket', '门票去哪了', '找不到已经买好的景区门票', '支付600元重新购票', { type: 'money', amount: -600 }),
  fate('bad', 'missed-flight', '误了航班', '在候机厅睡过了登机时间', '支付700元改签费', { type: 'money', amount: -700 }),
  fate('bad', 'assessment', '城市服务费', '名下游览项目办理年度登记', '支付本次服务费', { type: 'assessment', perAsset: 50, cap: 500 }),
  fate('bad', 'maintenance', '雨后检修', '一场大雨过后检修游览设施', '支付本次维护费', { type: 'repairs', perHouse: 60, perHotel: 250, cap: 800 }),
  fate('bad', 'downgrade', '设施暂停开放', '一处游览设施需要拆除整改', '选择一处城市降一级', { type: 'downgrade' }),
  fate('bad', 'jail', '接受调查', '误入限制区域需要配合调查', '进入监狱', { type: 'jail' }),
  fate('bad', 'hospital', '脚下一滑', '旅途中不慎扭伤脚踝', '进入医院', { type: 'hospital' }),
  fate('bad', 'turtle', '慢行路段', '前方道路施工', '接下来两次常规掷骰只能掷一颗', { type: 'turtle' }),
  fate('bad', 'pigeons', '鸽子突袭', '午餐被鸽子抢走', '重新点餐支付300元', { type: 'money', amount: -300 }),
  fate('bad', 'extra-order', '手滑加购', '不小心把单人餐订成了聚会套餐', '支付500元', { type: 'money', amount: -500 }),
  fate('neutral', 'forward-one', '跟着路标', '发现通往下一站的指示牌', '前进1格', { type: 'move_steps', steps: 1 }),
  fate('neutral', 'forward-two', '沿河散步', '顺着河边步道悠闲漫步', '前进2格', { type: 'move_steps', steps: 2 }),
  fate('neutral', 'forward', '顺风而行', '顺利搭上观光巴士', '前进4格', { type: 'move_steps', steps: 4 }),
  fate('neutral', 'back-one', '买杯咖啡', '想起刚才路过的咖啡香', '后退1格', { type: 'move_steps', steps: -1 }),
  fate('neutral', 'back-two', '重拍合影', '发现合影里有人闭了眼', '后退2格', { type: 'move_steps', steps: -2 }),
  fate('neutral', 'back-four', '拿反地图', '走了一段才发现方向反了', '后退4格', { type: 'move_steps', steps: -4 }),
  fate('neutral', 'seoul', '首尔夜游', '想去夜市尝尝当地小吃', '前往首尔', city('首尔')),
  fate('neutral', 'shanghai', '外滩晚风', '约好去江边看城市夜景', '前往上海', city('上海')),
  fate('neutral', 'airport', '下一站见', '新的目的地已经选好', '前往下一座机场', { type: 'nearest', tileKind: 'airport' }),
  fate('neutral', 'utility', '城市参访', '报名参观城市供水与能源设施', '前往下一家水电公司', { type: 'nearest', tileKind: 'utility' }),
  fate('neutral', 'wheel-one', '命运转盘', '广场上的转盘摊位向你招手', '转动幸运转盘', { type: 'wheel' }),
]

/** Cheapest building first also gives the timeout a predictable, modest loss. */
export function cardPropertyCandidates(game: Pick<GameState, 'tiles'>, playerId: string) {
  return BOARD.filter((tile) => tile.kind === 'property' && game.tiles[tile.index]?.ownerId === playerId && game.tiles[tile.index]!.level > 0 && !game.tiles[tile.index]!.mortgaged)
    .sort((a, b) => (a.buildCost ?? 0) - (b.buildCost ?? 0) || a.index - b.index)
}

const cardsById = new Map([...CHANCE_CARDS, ...FATE_CARDS].map((entry) => [entry.id, entry]))

export function getCard(cardId: string): GameCard {
  const entry = cardsById.get(cardId)
  if (!entry) throw new Error(`Unknown card: ${cardId}`)
  return entry
}

export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = next[index]
    const swap = next[swapIndex]
    if (current === undefined || swap === undefined) continue
    next[index] = swap
    next[swapIndex] = current
  }
  return next
}

export function createDeck(kind: CardDeckKind, random: RandomSource): DeckState {
  const source = kind === 'chance' ? CHANCE_CARDS : FATE_CARDS
  return { order: shuffle(source.map((entry) => entry.id), random), discard: [] }
}
