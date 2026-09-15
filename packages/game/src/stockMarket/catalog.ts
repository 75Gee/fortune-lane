import type { StockDefinition } from './types.js'

export const STOCKS: readonly StockDefinition[] = [
  { id: 'civic', name: '城市公用', symbol: 'CITY', style: '稳健', description: '小幅慢变，偶尔回撤。', color: '#297e79' },
  { id: 'transit', name: '环球交通', symbol: 'MOVE', style: '均衡', description: '波段起伏，偶有跳涨跳跌。', color: '#3878bc' },
  { id: 'travel', name: '海岛文旅', symbol: 'TRIP', style: '活跃', description: '拉升和回撤频繁，走势容易反复。', color: '#b07b25' },
  { id: 'tech', name: '奇趣科技', symbol: 'IDEA', style: '投机', description: '平静时也可能突然大幅跳价。', color: '#8060b7' },
]
