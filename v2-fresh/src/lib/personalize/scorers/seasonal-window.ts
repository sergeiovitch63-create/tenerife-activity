/**
 * Seasonal-Window scorer — server-safe.
 *
 * Tenerife runs year-round, but each activity has real seasonal variance:
 *  - Whales + dolphins: resident all year, but calm-sea peak May–Oct; orca
 *    migration window Jan–Mar.
 *  - Teide / high-altitude: snow & winds Dec–Mar (road closures possible),
 *    stargazing crisp all year but Milky Way peak Apr–Sep.
 *  - Hiking: south coastal trails brutal Jul–Aug; Anaga/north best
 *    Oct–May; Teide best Apr–Jun & Sep–Nov.
 *  - Beach / snorkel: water warmest Aug–Nov, coldest Feb–Apr.
 *  - Culture / museums: indifferent — skip the module.
 *
 * The scorer emits a 12-month rating array (peak/good/fair/avoid) plus
 * the driving reason codes, letting the card surface a "come between X
 * and Y" recommendation and a "skip during Z" warning.
 *
 * Distinct from `weather-advisory` (today's forecast vs. activity
 * sensitivity) and `calima` banners (the-day-of dust alert). Seasonal-
 * window is long-horizon booking guidance, not an on-the-day decision.
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type SeasonalRating = 'peak' | 'good' | 'fair' | 'avoid'

/** Jan=0 … Dec=11 — keeps parity with JS Date#getMonth(). */
export type MonthRatings = [
  SeasonalRating, SeasonalRating, SeasonalRating, SeasonalRating,
  SeasonalRating, SeasonalRating, SeasonalRating, SeasonalRating,
  SeasonalRating, SeasonalRating, SeasonalRating, SeasonalRating,
]

export type SeasonalWindowProps = {
  months: MonthRatings
  /** One-line reason bucket explaining the shape (driver of the recommendation). */
  primaryReasonKey: string
  /** Secondary warnings (calima, snow, heat, jellyfish windows). */
  warningKeys: string[]
  /** Best continuous stretch (inclusive month indices). */
  bestWindow: { startMonth: number; endMonth: number } | null
  /** Worst continuous stretch, if any. */
  avoidWindow: { startMonth: number; endMonth: number } | null
}

const RATING_WEIGHT: Record<SeasonalRating, number> = {
  peak: 3,
  good: 2,
  fair: 1,
  avoid: 0,
}

function fill(r: SeasonalRating): MonthRatings {
  return [r, r, r, r, r, r, r, r, r, r, r, r]
}

function apply(months: MonthRatings, idxs: number[], r: SeasonalRating): void {
  for (const i of idxs) {
    // 'avoid' latches — once a month is marked avoid (safety signal),
    // no later rule can soften it.
    if (months[i] === 'avoid') continue
    months[i] = r
  }
}

/** Find the longest run of months meeting a predicate, wrapping Dec→Jan. */
function longestRun(
  months: MonthRatings,
  pred: (r: SeasonalRating) => boolean,
): { startMonth: number; endMonth: number } | null {
  // Walk twice to handle the year boundary.
  let best: { start: number; length: number } | null = null
  let curStart = -1
  let curLen = 0
  for (let i = 0; i < 24; i++) {
    const m = i % 12
    if (pred(months[m])) {
      if (curStart === -1) curStart = i
      curLen++
      if (!best || curLen > best.length) best = { start: curStart, length: curLen }
    } else {
      curStart = -1
      curLen = 0
    }
    if (curLen > 12) curLen = 12 // cap
  }
  if (!best || best.length === 0) return null
  const start = best.start % 12
  const end = (best.start + Math.min(best.length, 12) - 1) % 12
  return { startMonth: start, endMonth: end }
}

export function seasonalWindowScorer(signals: ActivitySignals): ModuleScore | null {
  const { setting, themes, zone } = signals
  const warningKeys: string[] = []
  let primaryReasonKey = 'seasonal_general'

  // --- Indoor / year-round activities: skip ------------------------
  // Parks, aquariums, museums, wineries, spa — operator-controlled,
  // no seasonal variance worth surfacing.
  const indoor =
    setting.includes('park') ||
    setting.includes('zoo') ||
    setting.includes('aquarium') ||
    setting.includes('waterpark') ||
    setting.includes('museum') ||
    setting.includes('winery') ||
    setting.includes('tasting')
  if (indoor) return null

  const months: MonthRatings = fill('good')

  // --- Whale / dolphin watching ------------------------------------
  // Residents year-round; calm sea May–Oct; orca migration peak Feb–Mar.
  if (setting.includes('whale') || setting.includes('dolphin')) {
    apply(months, [4, 5, 6, 7, 8, 9], 'peak') // May–Oct flat sea
    apply(months, [1, 2], 'peak') // orca window
    apply(months, [0, 11], 'good')
    primaryReasonKey = 'seasonal_whales'
  }

  // --- Sea activities (boat / yacht / jetski / snorkel / diving) ---
  if (
    setting.includes('boat') ||
    setting.includes('catamaran') ||
    setting.includes('yacht') ||
    setting.includes('jetski') ||
    setting.includes('snorkel') ||
    setting.includes('diving') ||
    setting.includes('surf') ||
    setting.includes('fishing')
  ) {
    // Warm-water window
    apply(months, [6, 7, 8, 9, 10], 'peak') // Jul–Nov warm
    apply(months, [4, 5], 'good')            // May–Jun good
    // Winter Atlantic swells = choppier + cold water
    apply(months, [1, 2, 3], 'fair')         // Feb–Apr cooler
    if (signals.waveSensitive) {
      apply(months, [0, 11], 'fair')
      warningKeys.push('winter_swell')
    }
    if (setting.includes('surf')) {
      // Surfing flips — big swell is the point
      apply(months, [10, 11, 0, 1, 2], 'peak')
      apply(months, [6, 7, 8], 'fair')
      primaryReasonKey = 'seasonal_surf'
    } else if (primaryReasonKey === 'seasonal_general') {
      primaryReasonKey = 'seasonal_sea'
    }
  }

  // --- Hiking / trekking / walking tours ---------------------------
  if (setting.includes('hiking') || setting.includes('climbing')) {
    if (zone === 'south' || zone === 'east') {
      // Coastal trails scorch in summer
      apply(months, [6, 7], 'avoid')
      apply(months, [5, 8], 'fair')
      apply(months, [9, 10, 11, 0, 1, 2, 3, 4], 'peak')
      warningKeys.push('summer_heat_coastal')
      primaryReasonKey = 'seasonal_hiking_coastal'
    } else if (zone === 'center' && signals.altitude !== 'low') {
      // Teide / Cañadas: winter snow + road closures
      apply(months, [11, 0, 1, 2], 'fair')
      apply(months, [4, 5, 8, 9], 'peak')
      apply(months, [6, 7], 'good')
      warningKeys.push('winter_snow_teide')
      primaryReasonKey = 'seasonal_hiking_teide'
    } else {
      // North / Anaga mid-altitude — indifferent, slight winter rain risk
      apply(months, [3, 4, 5, 8, 9, 10], 'peak')
      apply(months, [11, 0, 1], 'fair')
      primaryReasonKey = 'seasonal_hiking_north'
    }
  }

  // --- Stargazing --------------------------------------------------
  if (themes.has('stargazing') || setting.includes('night')) {
    // Milky Way core visible Apr–Sep; winter has longer dark nights but colder
    apply(months, [3, 4, 5, 6, 7, 8], 'peak')
    apply(months, [2, 9], 'good')
    apply(months, [0, 1, 10, 11], 'fair')
    warningKeys.push('winter_cold_summit')
    if (primaryReasonKey === 'seasonal_general') primaryReasonKey = 'seasonal_stargazing'
  }

  // --- Paragliding / aerial ----------------------------------------
  if (setting.includes('paragliding') || setting.includes('helicopter')) {
    // Wind reliability: best Apr–Oct for thermals, winter is calmer but gustier fronts
    apply(months, [3, 4, 5, 6, 7, 8, 9], 'peak')
    apply(months, [0, 1, 2], 'fair')
    if (signals.windSensitive) warningKeys.push('winter_wind_fronts')
    if (primaryReasonKey === 'seasonal_general') primaryReasonKey = 'seasonal_paragliding'
  }

  // --- Beach / sunset / generic outdoor ---------------------------
  if (setting.includes('beach') && !setting.includes('surf')) {
    apply(months, [5, 6, 7, 8, 9, 10], 'peak')
    apply(months, [1, 2, 3], 'fair')
    if (primaryReasonKey === 'seasonal_general') primaryReasonKey = 'seasonal_beach'
  }

  // --- Volcano / Teide visits (non-hike) ---------------------------
  if (setting.includes('volcano') && !setting.includes('hiking')) {
    // Road access + road closures in winter; summer clearest skies
    apply(months, [3, 4, 8, 9], 'peak')
    apply(months, [5, 6, 7, 10], 'good')
    apply(months, [11, 0, 1, 2], 'fair')
    warningKeys.push('winter_road_closures')
    if (primaryReasonKey === 'seasonal_general') primaryReasonKey = 'seasonal_teide_road'
  }

  // --- Calima overlay (Saharan dust) -------------------------------
  // Peak Jun–Aug and occasional Feb–Mar. Downgrade if activity is
  // visibility-sensitive (flights, stargazing, mirador photography).
  if (signals.calimaSensitive || signals.visibilitySensitive) {
    // Nudge down July/August a notch (don't nuke — calima episodes are
    // transient, lasts ~1–3 days each).
    for (const i of [6, 7]) {
      if (months[i] === 'peak') months[i] = 'good'
    }
    warningKeys.push('summer_calima')
  }

  // --- Analyze shape -----------------------------------------------
  const ratings = months.slice() as MonthRatings
  const weights = ratings.map((r) => RATING_WEIGHT[r])
  const maxW = Math.max(...weights)
  const minW = Math.min(...weights)
  const spread = maxW - minW

  // Hard skip: completely flat (spread = 0). Nothing seasonal to say.
  if (spread === 0) return null

  const bestWindow = longestRun(
    ratings,
    (r) => r === 'peak' || (maxW < RATING_WEIGHT.peak && r === 'good'),
  )
  const avoidWindow = longestRun(ratings, (r) => r === 'avoid')

  // --- Scoring -----------------------------------------------------
  let s = 44 // just above threshold

  // Bigger variance = more useful guidance
  s += spread * 4 // 0..12

  // Explicit avoid windows earn extra weight (safety / expectation mgmt)
  if (avoidWindow) s += 8

  // Strong seasonal signatures (whales/surf/stargazing) deserve a bump
  if (
    primaryReasonKey === 'seasonal_whales' ||
    primaryReasonKey === 'seasonal_surf' ||
    primaryReasonKey === 'seasonal_stargazing' ||
    primaryReasonKey === 'seasonal_hiking_teide'
  ) s += 6

  // Multiple warnings = complex picture, worth the tertiary card
  s += Math.min(4, warningKeys.length * 2)

  // Damp generic/ambiguous: no concrete setting match
  if (primaryReasonKey === 'seasonal_general') s -= 10

  s = Math.max(0, Math.min(78, s))

  return {
    id: 'seasonal-window',
    score: s,
    slot: 'left-tertiary',
    reason: `primary=${primaryReasonKey}, spread=${spread}, warnings=${warningKeys.length}`,
    props: {
      months: ratings,
      primaryReasonKey,
      warningKeys,
      bestWindow,
      avoidWindow,
    } satisfies SeasonalWindowProps,
  }
}
