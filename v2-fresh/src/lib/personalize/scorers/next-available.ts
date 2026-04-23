/**
 * Next-Available scorer — server-safe.
 *
 * Walks the activity's event schedule (`days[]` × `times[]`) to find the
 * earliest bookable slot starting from today. Atlantico's day array is
 * Monday-first (index 0 = Monday, ..., index 6 = Sunday); a value of 0
 * means "not available", any other value means available. Times are
 * "HH:MM" when available and "-" otherwise.
 *
 * Why it's useful: activities with sparse schedules (Teide sunset,
 * Friday-only experiences) surface a "next Friday at 18:00" hint that a
 * generic date picker wouldn't. For daily-available tours we still
 * surface "today at 09:00" / "tomorrow at 10:00" — the urgency is real.
 *
 * Renders in `right-inline` as a compact slot card next to the booking
 * sidebar. Skipped when no event has a valid schedule (placeholder-only
 * entries like #97's "Dîner pique-nique + bus de la zone nord" variants).
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type NextAvailableProps = {
  /** 0 = today, 1 = tomorrow, 2+ = further out. */
  offset: number
  /** YYYY-MM-DD in the server's locale — client formats for display. */
  isoDate: string
  /** HH:MM start time. */
  time: string
  /** Weekday index 0=Mon..6=Sun for the target date. */
  weekdayIdx: number
  /** Distinct days/week across all events (scarcity signal). */
  daysPerWeek: number
  /** Name of the event/variant that matched — informational. */
  eventName: string
}

function isAvailable(dayFlag: number | undefined, time: string | undefined): boolean {
  if (!dayFlag || dayFlag === 0) return false
  if (!time) return false
  const t = time.trim()
  if (!t || t === '-') return false
  // "HH:MM" or "H:MM" or "HH:MM:SS"
  return /^\d{1,2}:\d{2}/.test(t)
}

export function nextAvailableScorer(signals: ActivitySignals): ModuleScore | null {
  const events = signals._events ?? []
  if (events.length === 0) return null

  const now = new Date()
  // Atlantico uses Monday=0; JS Date.getDay() uses Sunday=0. Convert.
  const todayMonIdx = (now.getDay() + 6) % 7

  // Count distinct weekly slots across all variants — this is the
  // "rarity" signal we use for scoring and surfacing copy.
  const weeklySlots = new Set<number>()
  for (const e of events) {
    for (let i = 0; i < 7; i++) {
      if (isAvailable(e.days?.[i], e.times?.[i])) weeklySlots.add(i)
    }
  }
  if (weeklySlots.size === 0) return null

  // Walk forward up to 14 days, find the earliest variant × day match.
  let best: {
    offset: number
    weekdayIdx: number
    time: string
    eventName: string
  } | null = null

  outer: for (let offset = 0; offset < 14; offset++) {
    const idx = (todayMonIdx + offset) % 7
    for (const e of events) {
      if (!isAvailable(e.days?.[idx], e.times?.[idx])) continue
      // Keep whichever start-time is earliest on the day for cleaner display.
      const t = (e.times?.[idx] ?? '').trim()
      if (!best || offset < best.offset || (offset === best.offset && t < best.time)) {
        best = { offset, weekdayIdx: idx, time: t, eventName: e.name }
      }
    }
    if (best && best.offset === offset) break outer
  }

  if (!best) return null

  // Build ISO date for the matched day.
  const date = new Date(now)
  date.setDate(date.getDate() + best.offset)
  // Use UTC-neutral formatting for the date string.
  const iso =
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')

  // Scoring — a readable "when can I book" is always worth showing, but
  // scarce schedules and near-term availability are the strongest cases.
  let s = 55
  if (best.offset === 0) s = 72      // today — urgency
  else if (best.offset === 1) s = 68 // tomorrow — easy
  else if (best.offset <= 3) s = 64  // this week

  const scarce = weeklySlots.size <= 2
  if (scarce) s += 10                 // 1-2 days/week → rarity is the point
  if (weeklySlots.size >= 6) s -= 4  // daily — less informative

  s = Math.min(85, s)

  return {
    id: 'next-available',
    score: s,
    slot: 'right-inline',
    reason: `in ${best.offset}d, ${weeklySlots.size}d/week`,
    props: {
      offset: best.offset,
      isoDate: iso,
      time: best.time,
      weekdayIdx: best.weekdayIdx,
      daysPerWeek: weeklySlots.size,
      eventName: best.eventName,
    } satisfies NextAvailableProps,
  }
}
