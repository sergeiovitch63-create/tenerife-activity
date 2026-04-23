/**
 * First-Timer-Tips scorer — server-safe.
 *
 * Surfaces 2–3 practical warnings / meta-advice that a first-time
 * Tenerife visitor wouldn't know but would regret not knowing for
 * THIS specific activity. Not packing-list (that's covered), not
 * weather (that's on-the-day). This is "the thing you wish someone
 * had told you before you booked".
 *
 * Tips are drawn from a fixed catalogue and filtered by signals.
 * We return the top 2–3 matches, ranked by how badly they'd bite a
 * naïve visitor.
 *
 * Distinct from:
 *  - dynamic-packing-list : what physical items to bring
 *  - weather-advisory     : today's weather vs. sensitivity
 *  - suitability-profile  : demographic compatibility
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type TipKey =
  | 'altitude-hydrate'
  | 'altitude-cold-at-summit'
  | 'sun-protection-south'
  | 'rental-car-needed'
  | 'teide-cable-car-reserve'
  | 'seasickness-band'
  | 'wetsuit-included'
  | 'calima-reschedule'
  | 'long-day-snacks'
  | 'zone-transit-time'
  | 'early-arrival-buffer'
  | 'offline-map-download'
  | 'small-group-sold-out'

export type TimerTip = {
  key: TipKey
  /** Priority inside the module (higher = shown first). 1..5 */
  priority: number
}

export type FirstTimerTipsProps = {
  tips: TimerTip[]
}

/**
 * Build the candidate tip list for an activity. Each tip carries a
 * priority that drives ordering + culling.
 */
function buildTipCandidates(s: ActivitySignals): TimerTip[] {
  const tips: TimerTip[] = []

  // Altitude-related — Teide is 2 000–3 700 m, real effects
  if (s.altitude === 'high') {
    tips.push({ key: 'altitude-hydrate', priority: 5 })
    tips.push({ key: 'altitude-cold-at-summit', priority: 5 })
  } else if (s.altitude === 'mid') {
    tips.push({ key: 'altitude-cold-at-summit', priority: 3 })
  }

  // Teide cable-car — specific bottleneck
  if (
    s.setting.includes('volcano') &&
    s.altitude === 'high' &&
    (s.setting.includes('hiking') || s.themes.has('mountain'))
  ) {
    tips.push({ key: 'teide-cable-car-reserve', priority: 4 })
  }

  // Sun exposure — underestimated latitude + altitude combo
  const strongSun =
    s.zone === 'south' ||
    s.setting.includes('beach') ||
    s.setting.includes('boat') ||
    s.setting.includes('catamaran') ||
    s.setting.includes('jetski') ||
    s.altitude === 'high'
  if (strongSun) {
    tips.push({ key: 'sun-protection-south', priority: 4 })
  }

  // Rental car needed (no pickup, or activity in hard-to-reach spot)
  const noPickup = !s._group.pickup || Number(s._group.pickup) < 1
  const farFromHotels =
    s.zone === 'center' ||
    s.zone === 'west' ||
    s.zone === 'east'
  if (noPickup && farFromHotels) {
    tips.push({ key: 'rental-car-needed', priority: 4 })
  }

  // Seasickness — boats get people, but catamarans less
  if (s.setting.includes('boat') && !s.setting.includes('catamaran')) {
    tips.push({ key: 'seasickness-band', priority: 4 })
  } else if (s.setting.includes('yacht') || s.setting.includes('fishing')) {
    tips.push({ key: 'seasickness-band', priority: 3 })
  }

  // Wetsuit is included on diving/snorkel/surf — remove the worry
  if (
    s.setting.includes('diving') ||
    s.setting.includes('snorkel') ||
    s.setting.includes('surf')
  ) {
    tips.push({ key: 'wetsuit-included', priority: 2 })
  }

  // Calima reschedule — visibility-sensitive
  if (
    s.calimaSensitive ||
    s.visibilitySensitive ||
    (s.setting.includes('paragliding') || s.setting.includes('helicopter'))
  ) {
    tips.push({ key: 'calima-reschedule', priority: 4 })
  }

  // Long-day snacks — hiking full-day, safaris
  if (
    (s.durationMinutes ?? 0) >= 360 &&
    !s.setting.includes('restaurant') &&
    !s.themes.has('gastro')
  ) {
    tips.push({ key: 'long-day-snacks', priority: 3 })
  }

  // Zone transit time — south-to-north or south-to-west day trips
  if (
    noPickup &&
    (s.zone === 'north' || s.zone === 'west' || s.zone === 'center') &&
    (s.durationMinutes ?? 0) >= 180
  ) {
    tips.push({ key: 'zone-transit-time', priority: 3 })
  }

  // Early-arrival buffer — group tours depart on time
  if (
    s._events.length === 1 &&
    (s.durationMinutes ?? 0) >= 180 &&
    !s.setting.includes('park') &&
    !s.setting.includes('waterpark')
  ) {
    tips.push({ key: 'early-arrival-buffer', priority: 2 })
  }

  // Offline map — hiking without guide coverage
  if (
    (s.setting.includes('hiking') || s.setting.includes('mirador')) &&
    !s.hasDetailedRoute
  ) {
    tips.push({ key: 'offline-map-download', priority: 3 })
  }

  // Small-group scarcity — rare departures
  if (s._events.length === 1 && (s._events[0]?.days?.filter(Boolean).length ?? 0) <= 3) {
    tips.push({ key: 'small-group-sold-out', priority: 4 })
  }

  return tips
}

export function firstTimerTipsScorer(signals: ActivitySignals): ModuleScore | null {
  const candidates = buildTipCandidates(signals)

  // Need at least 2 tips to feel useful — otherwise the card reads thin.
  if (candidates.length < 2) return null

  // Sort by priority desc, deduplicate (safety), keep top 3
  const seen = new Set<TipKey>()
  const deduped = candidates.filter((t) => {
    if (seen.has(t.key)) return false
    seen.add(t.key)
    return true
  })
  deduped.sort((a, b) => b.priority - a.priority)
  const top = deduped.slice(0, 3)

  // --- Scoring -----------------------------------------------------
  // Base just above threshold — this is helpful but not critical info.
  let s = 44

  // Bump per high-priority tip
  for (const t of top) {
    if (t.priority >= 5) s += 8
    else if (t.priority >= 4) s += 5
    else if (t.priority >= 3) s += 3
    else s += 1
  }

  // Three distinct tips = richer card
  if (top.length === 3) s += 3

  // Damp when the activity has a thorough in-house FAQ already
  if (signals.hasFaq) s -= 4

  s = Math.max(0, Math.min(78, s))

  return {
    id: 'first-timer-tips',
    score: s,
    slot: 'left-tertiary',
    reason: `tips=${top.map((t) => t.key).join('|')}`,
    props: {
      tips: top,
    } satisfies FirstTimerTipsProps,
  }
}
