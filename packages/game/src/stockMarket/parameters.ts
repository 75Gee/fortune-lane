import type { StockId } from './types.js'

interface StockModelParameters {
  trendPersistence: number
  trendStrength: number
  reversionStrength: number
  referenceRate: number
  mediumFrequency: number
  largeFrequency: number
  directionBias: number
  magnitudeRanges: readonly [readonly [number, number], readonly [number, number], readonly [number, number]]
  calmMultiplier: number
  activeMultiplier: number
  initialActiveProbability: number
}

const ordinaryVolatility = { calmMultiplier: .4, activeMultiplier: 2.8, initialActiveProbability: .25 }

// Preserve the explicitly approved original-formula simulation (0.546).
// Its mean multiplier is ~0.91072555. Changing this to the normalized 0.496
// variant also requires recalibrating b; see docs/stock-market.md.
const techLow = .4 / (.546 + Math.sqrt(.546 ** 2 + 4 * .028 * .20))
const techCalmJump = .005 * techLow
const techActiveBeforeJump = (.05 + .8 * techCalmJump) / (.20 + .8 * techCalmJump)
const techVolatility = {
  calmMultiplier: techLow,
  activeMultiplier: 7 * techLow,
  initialActiveProbability: techActiveBeforeJump + (1 - techActiveBeforeJump) * techCalmJump,
}

// Percentages are decimal fractions. b offsets the up probability; it is not
// a return added to each tick. Calibrated offline for a 300-update mean
// buy-and-hold return of +4% per stock; no target correction runs in a game.
export const STOCK_MODEL_PARAMETERS = {
  civic: { ...ordinaryVolatility, trendPersistence: .72, trendStrength: .04, reversionStrength: .06, referenceRate: .015,
    mediumFrequency: .018, largeFrequency: .002, directionBias: .029831542968749996,
    magnitudeRanges: [[.00075, .00375], [.0075, .015], [.0225, .03]] },
  transit: { ...ordinaryVolatility, trendPersistence: .86, trendStrength: .12, reversionStrength: .035, referenceRate: .010,
    mediumFrequency: .027, largeFrequency: .003, directionBias: .017321777343749997,
    magnitudeRanges: [[.0015, .006], [.012, .03], [.0375, .06]] },
  travel: { ...ordinaryVolatility, trendPersistence: .72, trendStrength: .055, reversionStrength: .13, referenceRate: .020,
    mediumFrequency: .024, largeFrequency: .001, directionBias: .01686279296875,
    magnitudeRanges: [[.0015, .009], [.0225, .045], [.06, .09]] },
  tech: { ...techVolatility, trendPersistence: .75, trendStrength: .06, reversionStrength: .045, referenceRate: .008,
    mediumFrequency: .025, largeFrequency: .005, directionBias: .011496582031249997,
    magnitudeRanges: [[.0015, .012], [.03, .06], [.105, .18]] },
} as const satisfies Readonly<Record<StockId, StockModelParameters>>
