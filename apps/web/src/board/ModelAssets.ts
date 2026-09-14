import { hazardModel, itemLandmark } from './ItemModels.js'
import { cairoLandmark, hongKongLandmark } from './ExpansionLandmarks.js'
import { cornerLandmark } from './CornerLandmarks.js'

/** Exports and previews use the actual board factories, so the delivered models stay in sync. */
export const MODEL_ASSETS = [
  { id: 'item-supply', tileId: 'item-south', title: '旅途道具补给站', detail: '薄荷绿棚亭 · 四种道具陈列 · 礼盒屋顶', create: itemLandmark, angle: .62 },
  { id: 'cairo', tileId: '开罗', title: '开罗 · 金字塔庭院', detail: '砂岩金字塔 · 狮身人面像 · 棕榈庭院', create: cairoLandmark, angle: .62 },
  { id: 'hong-kong', tileId: '香港', title: '香港 · 维港建筑群', detail: '玻璃塔楼 · 海滨步道 · 绿色渡轮', create: hongKongLandmark, angle: .62 },
  { id: 'hospital', tileId: 'hospital', title: '医院 · 旅途医疗中心', detail: '绿色医疗标识 · 门诊入口 · 救护车', create: () => cornerLandmark('hospital'), angle: Math.PI * 1.25 },
  { id: 'roadblock', tileId: 'roadblock', title: '路障 · 道路拦截', detail: '橙白警示条 · 双侧警示灯 · 落点标记', create: () => hazardModel('roadblock'), angle: .62 },
  { id: 'bomb', tileId: 'bomb', title: '炸弹 · 小心绕行', detail: '圆形弹体 · 弯曲引线 · 暖色火星', create: () => hazardModel('bomb'), angle: .62 },
] as const
