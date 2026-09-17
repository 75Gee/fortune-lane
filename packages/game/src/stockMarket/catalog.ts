import type { StockDefinition } from './types.js'

export const STOCKS: readonly StockDefinition[] = [
  { id: 'civic', name: '城市公用', symbol: 'CITY', style: '稳健', description: '经营价值缓慢变化，短期情绪轻微起伏，不保本。', color: '#297e79' },
  { id: 'transit', name: '环球交通', symbol: 'MOVE', style: '周期', description: '景气随随机冲击起伏，波段长度和方向并不固定。', color: '#3878bc' },
  { id: 'travel', name: '海岛文旅', symbol: 'TRIP', style: '成长', description: '经营变化叠加短期趋势，涨跌可能延续，也可能随时反转。', color: '#b07b25' },
  { id: 'tech', name: '奇趣科技', symbol: 'IDEA', style: '事件', description: '项目线索即时计入价格，揭晓带来更大的收益与亏损风险。', color: '#8060b7' },
]
