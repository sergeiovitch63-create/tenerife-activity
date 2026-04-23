/**
 * Sunset-Time Adapter scorer — server-safe.
 *
 * Triggers on sunset-tagged activities where the event schedule actually
 * contains a late-afternoon/evening slot. Rejects activities with only
 * morning times to avoid surfacing a module with no valid recommendation.
 */

import type { ActivitySignals, ModuleScore } from '../types'

export function sunsetTimeAdapterScorer(signals: ActivitySignals): ModuleScore | null {
  // Gate 1: keyword/theme signal must be present
  const hasSunsetSignal =
    signals.setting.includes('sunset') ||
    signals.keywords.has('sunset') ||
    signals.themes.has('stargazing')

  if (!hasSunsetSignal) return null

  // Gate 2: the activity MUST have at least one late-afternoon/evening departure.
  // Tenerife sunset year-round: 18:00 (winter) to 21:10 (summer).
  // For activity to end at sunset with typical 1-3h duration, departure must be
  // at the earliest ~15:00 (3h before winter sunset).
  const availableTimes: string[] = []
  for (const ev of signals._events) {
    for (const t of ev.times ?? []) availableTimes.push(t)
  }

  const hasLateTime = availableTimes.some((t) => {
    const m = t.match(/^(\d{1,2}):(\d{2})/)
    if (!m) return false
    const hour = parseInt(m[1], 10)
    return hour >= 15
  })
  if (!hasLateTime) return null

  // Gate 3: sanity check — all-morning activity is almost certainly mislabeled
  const allMorning =
    availableTimes.length > 0 &&
    availableTimes.every((t) => {
      const m = t.match(/^(\d{1,2}):(\d{2})/)
      if (!m) return true
      return parseInt(m[1], 10) < 12
    })
  if (allMorning) return null

  // Base score depending on signal strength
  let s = 60
  if (signals.setting.includes('sunset')) s = 85
  if (signals.keywords.has('sunset') && signals.setting.includes('boat')) s = 95
  if (signals.keywords.has('sunset') && signals.setting.includes('paragliding')) s = 95
  if (signals.themes.has('stargazing')) s = 80

  return {
    id: 'sunset-time-adapter',
    score: s,
    slot: 'left-primary',
    reason: `sunset activity, ${availableTimes.length} time slots, latest ${availableTimes.slice().sort().pop()}`,
    props: {
      lat: signals.lat ?? 28.27,
      lng: signals.lng ?? -16.64,
      durationMinutes: signals.durationMinutes ?? 120,
      availableTimes,
      isParagliding: signals.setting.includes('paragliding'),
      isBoat: signals.setting.includes('boat') || signals.setting.includes('catamaran'),
    },
  }
}
