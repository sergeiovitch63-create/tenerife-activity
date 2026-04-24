/**
 * Hidden-Gem Badge scorer — server-safe.
 *
 * Flags activities that are rich, niche, or off-the-beaten-path relative
 * to mass-market Tenerife offerings (big zoos, water parks, south-coast
 * catamaran day-trips). Uses zone, themes, setting and content-richness
 * signals to build a badge reason list.
 *
 * The threshold (55) is intentionally strict — we'd rather show the badge
 * on fewer activities than on every second page. Mass-market settings
 * (park, waterpark) and bargain-tier prices are hard disqualifiers;
 * crowded-south catamaran day-trips are penalized heavily unless they
 * carry another gem signal (stargazing sailing, yacht, etc.).
 *
 * Renders as a small card in left-tertiary next to the weather advisory.
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type HiddenGemReasonKey =
  | 'off-beaten-path'
  | 'stargazing-experience'
  | 'gastro-deep'
  | 'cultural-depth'
  | 'rich-content'
  | 'niche-experience'

export type HiddenGemReason = {
  key: HiddenGemReasonKey
  /** Translation key resolved by the client card. */
  textKey: string
}

const MASS_MARKET_SETTINGS = new Set(['park', 'waterpark'])
const OFF_BEAT_ZONES = new Set(['north', 'west', 'center', 'east'])

function buildReasons(signals: ActivitySignals): HiddenGemReason[] {
  const reasons: HiddenGemReason[] = []

  if (signals.zone && OFF_BEAT_ZONES.has(signals.zone)) {
    reasons.push({ key: 'off-beaten-path', textKey: 'offBeatenPath' })
  }

  if (signals.themes.has('stargazing')) {
    reasons.push({ key: 'stargazing-experience', textKey: 'stargazingExperience' })
  }

  if (signals.setting.includes('winery') || signals.setting.includes('tasting')) {
    reasons.push({ key: 'gastro-deep', textKey: 'gastroDeep' })
  }

  if (
    signals.setting.includes('museum') ||
    signals.setting.includes('monument') ||
    signals.setting.includes('village')
  ) {
    reasons.push({ key: 'cultural-depth', textKey: 'culturalDepth' })
  }

  const richContent =
    signals.hasDetailedRoute &&
    (signals.hasFaq || signals.hasVideo) &&
    signals.imageCount >= 5
  if (richContent) {
    reasons.push({ key: 'rich-content', textKey: 'richContent' })
  }

  // Fallback — only when we otherwise have no reason at all, to avoid
  // padding an already-strong case with a generic line.
  if (reasons.length === 0) {
    const niche =
      signals.themes.has('wellness') ||
      (signals.themes.has('culture') && !signals.themes.has('family')) ||
      signals.setting.includes('mirador') ||
      signals.setting.includes('caving') ||
      signals.setting.includes('climbing')
    if (niche) {
      reasons.push({ key: 'niche-experience', textKey: 'nicheExperience' })
    }
  }

  return reasons
}

export function hiddenGemBadgeScorer(signals: ActivitySignals): ModuleScore | null {
  // Hard disqualifiers
  if (signals.setting.some(s => MASS_MARKET_SETTINGS.has(s))) return null
  if (signals.priceTier === 'low') return null

  const reasons = buildReasons(signals)
  if (reasons.length === 0) return null

  let s = 30
  for (const r of reasons) {
    if (r.key === 'stargazing-experience') s += 25
    else if (r.key === 'gastro-deep') s += 20
    else if (r.key === 'cultural-depth') s += 18
    else if (r.key === 'off-beaten-path') s += 15
    else if (r.key === 'rich-content') s += 12
    else if (r.key === 'niche-experience') s += 10
  }

  // Content-richness booster (small, applies on top of the reasons)
  if (signals.hasDetailedRoute) s += 5
  if (signals.hasFaq) s += 3
  if (signals.imageCount >= 8) s += 3
  if (signals.hasVideo) s += 3

  // Catamaran day-trips in the crowded south are the antonym of "hidden
  // gem" unless another signal already qualifies them (stargazing sailing,
  // yacht, etc.).
  const isCommonSouthBoat =
    signals.zone === 'south' &&
    signals.setting.includes('catamaran') &&
    !signals.themes.has('stargazing') &&
    !signals.setting.includes('yacht')
  if (isCommonSouthBoat) s -= 25

  // Single-reason activities in the crowded south need a stronger case.
  if (signals.zone === 'south' && reasons.length < 2) s -= 10

  s = Math.max(0, Math.min(90, s))

  if (s < 55) return null

  return {
    id: 'hidden-gem-badge',
    score: s,
    slot: 'left-tertiary',
    reason: `${reasons.length} gem signal(s), zone=${signals.zone}`,
    props: {
      reasons,
    },
  }
}
