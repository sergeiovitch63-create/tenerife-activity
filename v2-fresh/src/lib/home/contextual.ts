/**
 * Contextual "This week" picker — server-safe.
 *
 * Picks 3 diverse groups for the home-page hero section based on:
 *   - current hour (morning / midday / evening / night)
 *   - current month (season + calima awareness)
 *   - simple keyword matching on group name
 *
 * Returns one group per context slot with a reason *key* (i18n lookup is
 * done at render time). Keeps the picking pure string/number logic so the
 * function is trivially testable and adds no runtime deps.
 *
 * Intentionally NOT wired through the heavy personalize pipeline — the
 * home doesn't need per-activity signal extraction, just a broad "what's
 * worth doing right now" heuristic.
 */
import type { AtlanticoGroup } from '@/lib/atlantico/types'

export type ContextReasonKey =
  | 'reason_sunset_tonight'
  | 'reason_sunset_tomorrow'
  | 'reason_calm_morning'
  | 'reason_whales_orca'
  | 'reason_clear_skies'
  | 'reason_sea_warm'
  | 'reason_signature'
  | 'reason_indoor_calima'
  | 'reason_family_safe'
  | 'reason_teide_peak'

export type ContextualPick = {
  group: AtlanticoGroup
  reasonKey: ContextReasonKey
  /** Optional lucide icon name for the context chip. */
  iconName?: 'Sunset' | 'Fish' | 'Mountain' | 'Sparkles' | 'Waves' | 'Sun'
}

type TimeSlot = 'morning' | 'midday' | 'evening' | 'night'

function slotFor(hour: number): TimeSlot {
  if (hour < 10) return 'morning'
  if (hour < 15) return 'midday'
  if (hour < 21) return 'evening'
  return 'night'
}

/** Lower-case keyword matcher that ignores diacritics. */
function nameHas(group: AtlanticoGroup, needles: string[]): boolean {
  const hay = (group.name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return needles.some((n) => hay.includes(n))
}

const SUNSET_WORDS = ['sunset', 'coucher', 'ocaso', 'sonnenuntergang', 'tramonto', 'zakat']
const WHALE_WORDS = ['whale', 'baleine', 'ballena', 'wal', 'balena', 'delfin', 'dolphin', 'dauphin']
const TEIDE_WORDS = ['teide', 'volcan', 'stargaz', 'star ', 'observ', 'etoil', 'astro']
const SEA_WORDS = ['catamar', 'boat', 'yacht', 'jet', 'snorkel', 'diving', 'bateau', 'barco']
const FAMILY_WORDS = ['siam', 'loro', 'aqua', 'park', 'parc', 'jungle']
const SIGNATURE_WORDS = ['teide', 'loro', 'siam']

/** Score a group for a given context slot; higher = better fit. */
function scoreForSlot(
  group: AtlanticoGroup,
  slot: 'evening-sunset' | 'morning-calm' | 'season-peak' | 'family-safe',
  month: number,
): number {
  const recom = Number(group.recom ?? 0)
  const base = Math.min(recom, 5) // 0..5

  switch (slot) {
    case 'evening-sunset':
      if (nameHas(group, SUNSET_WORDS)) return base + 20
      if (nameHas(group, SEA_WORDS)) return base + 10
      if (nameHas(group, TEIDE_WORDS)) return base + 8
      return base

    case 'morning-calm':
      if (nameHas(group, WHALE_WORDS)) return base + 20
      if (nameHas(group, SEA_WORDS)) return base + 12
      return base

    case 'season-peak':
      // Jul-Aug: sea warm, favor water
      if (month >= 6 && month <= 9) {
        if (nameHas(group, SEA_WORDS)) return base + 15
        if (nameHas(group, SUNSET_WORDS)) return base + 10
      }
      // Jan-Mar: orca migration
      if (month >= 1 && month <= 3) {
        if (nameHas(group, WHALE_WORDS)) return base + 20
      }
      // Apr-Jun / Sep-Nov: Teide clear skies
      if ((month >= 4 && month <= 5) || (month >= 9 && month <= 10)) {
        if (nameHas(group, TEIDE_WORDS)) return base + 15
      }
      // Default fallback: signature must-do
      if (nameHas(group, SIGNATURE_WORDS)) return base + 5
      return base

    case 'family-safe':
      if (nameHas(group, FAMILY_WORDS)) return base + 15
      return base
  }
}

/**
 * Pick 3 diverse groups for "This week" with contextual reasons.
 *
 * @param groups Full pool of displayable groups (already filtered to those with images).
 * @param now    Injected for testability; defaults to new Date().
 */
export function pickThisWeek(
  groups: AtlanticoGroup[],
  now: Date = new Date(),
): ContextualPick[] {
  const hour = now.getHours()
  const month = now.getMonth() + 1 // 1..12
  const slot = slotFor(hour)

  // ---- Slot A: time-of-day pick ---------------------------------
  const picks: ContextualPick[] = []
  const used = new Set<string>()

  const pickFor = (
    scorerKind: 'evening-sunset' | 'morning-calm' | 'season-peak' | 'family-safe',
    reasonKey: ContextReasonKey,
    iconName: ContextualPick['iconName'],
  ) => {
    const ranked = groups
      .filter((g) => !used.has(g.code))
      .map((g) => ({ g, s: scoreForSlot(g, scorerKind, month) }))
      .sort((a, b) => b.s - a.s)
    const best = ranked[0]
    if (!best || best.s <= Math.min(Number(best.g.recom ?? 0), 5)) return // no real match
    used.add(best.g.code)
    picks.push({ group: best.g, reasonKey, iconName })
  }

  // Slot 1: time-of-day
  if (slot === 'evening' || slot === 'midday') {
    pickFor('evening-sunset', 'reason_sunset_tonight', 'Sunset')
  } else if (slot === 'night') {
    pickFor('evening-sunset', 'reason_sunset_tomorrow', 'Sunset')
  } else {
    // morning
    pickFor('morning-calm', 'reason_calm_morning', 'Waves')
  }

  // Slot 2: seasonal
  const isOrcaSeason = month >= 1 && month <= 3
  const isCalima = month === 7 || month === 8 || month === 2 || month === 3
  const isTeidePeak = (month >= 4 && month <= 5) || (month >= 9 && month <= 10)
  const isSeaWarm = month >= 6 && month <= 10

  let seasonalKey: ContextReasonKey = 'reason_signature'
  let seasonalIcon: ContextualPick['iconName'] = 'Sparkles'
  if (isOrcaSeason) {
    seasonalKey = 'reason_whales_orca'
    seasonalIcon = 'Fish'
  } else if (isTeidePeak) {
    seasonalKey = 'reason_teide_peak'
    seasonalIcon = 'Mountain'
  } else if (isSeaWarm) {
    seasonalKey = 'reason_sea_warm'
    seasonalIcon = 'Waves'
  }
  pickFor('season-peak', seasonalKey, seasonalIcon)

  // Slot 3: calima-aware fallback
  if (isCalima) {
    pickFor('family-safe', 'reason_indoor_calima', 'Sun')
  } else {
    pickFor('season-peak', 'reason_clear_skies', 'Mountain')
  }

  // If a slot came up empty (no keyword match in the pool), backfill with
  // top `recom` so the section always shows 3 cards.
  if (picks.length < 3) {
    const fallback = [...groups]
      .filter((g) => !used.has(g.code))
      .sort((a, b) => Number(b.recom ?? 0) - Number(a.recom ?? 0))
    for (const g of fallback) {
      if (picks.length >= 3) break
      used.add(g.code)
      picks.push({ group: g, reasonKey: 'reason_signature', iconName: 'Sparkles' })
    }
  }

  return picks.slice(0, 3)
}

/** True iff we're inside a calima window that warrants a home-page banner. */
export function isCalimaWindow(now: Date = new Date()): boolean {
  const m = now.getMonth() + 1
  return m === 7 || m === 8 || m === 2 || m === 3
}
