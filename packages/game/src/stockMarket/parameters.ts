export const STOCK_UPDATE_INTERVAL = 5

// Per quote update. Fundamental growth is intentionally small; temporary
// signals are weaker than company noise so timing is useful but uncertain.
export const STOCK_MODEL_PARAMETERS = {
  civic: { growth: .0003, beta: .15, noise: .006, sentimentMemory: .6, sentimentNoise: .0025 },
  transit: { growth: .0004, beta: .35, noise: .018, sentimentMemory: .55, sentimentNoise: .005, cycleMemory: .94, cycleNoise: .007 },
  travel: { growth: .0005, beta: .65, noise: .029, sentimentMemory: .92, sentimentNoise: .010, trendMemory: .60, trendNoise: .006, trendImpact: .6 },
  tech: { growth: .0006, beta: .9, noise: .028 },
} as const
export const MARKET_NOISE = .008
