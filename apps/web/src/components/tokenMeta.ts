import type { TokenId } from '@fortune/game'

// Keep wire IDs stable so existing rooms and saved sessions retain their pieces.
export const TOKEN_META: Record<TokenId, { name: string; city: string; image: string; fallback: string }> = {
  suitcase: { name: '京剧脸谱', city: '北京', image: '/assets/tokens/beijing-mask.svg', fallback: '京' },
  camera: { name: '招财猫', city: '东京', image: '/assets/tokens/tokyo-maneki.svg', fallback: '招' },
  compass: { name: '可颂', city: '巴黎', image: '/assets/tokens/paris-croissant.svg', fallback: '颂' },
  train: { name: '双层巴士', city: '伦敦', image: '/assets/tokens/london-bus.svg', fallback: '巴' },
  teapot: { name: '黄色出租车', city: '纽约', image: '/assets/tokens/new-york-taxi.svg', fallback: '车' },
  kite: { name: '贡多拉', city: '威尼斯', image: '/assets/tokens/venice-gondola.svg', fallback: '舟' },
}
