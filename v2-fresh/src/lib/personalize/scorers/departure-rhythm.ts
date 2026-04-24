/**
 * Departure-Rhythm scorer — server-safe.
 *
 * Answers the traveller's "can I fit this into my week?" question.
 * The booking flow exposes a calendar, but the calendar doesn't show
 * at a glance whether this activity runs every day (low-friction,
 * pick any slot), only on weekends (plan around it), or once a week
 * (book fast, limited windows).
 *
 * Signal source: `events[].days` is a length-7 Monday-first array
 * where a non-zero entry means "runs that day" and the value is the
 * day number (1..7). `events[].times` is the parallel time array;
 * a "-" or empty string means "closed".
 *
 * We emit a single rhythm summary across the group (union of all
 * events' availability), plus per-day flags + the dominant departure
 * window (early / morning / noon / afternoon / evening / night).
 *
 * Skipped when:
 *  - no event has any live day (fully closed / legacy listing)
 *  - only 1 event AND 1 day (suitability-profile and event-highlights
 *    already carry enough signal — avoid crowding)
 *  - park/waterpark: the "open every day" rhythm is implicit in the
 *    type, so our module would feel like padding
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type DaysMap = [boolean, boolean, boolean, boolean, boolean, boolean, boolean]
// Mon, Tue, Wed, Thu, Fri, Sat, Sun

export type DepartureWindow =
  | 'dawn'      // 05:00-07:00
  | 'morning'   // 07:00-11:00
  | 'midday'    // 11:00-14:00
  | 'afternoon' // 14:00-17:00
  | 'evening'   // 17:00-20:00
  | 'night'     // 20:00-04:00

export type RhythmPattern =
  | 'daily'            // 7/7
  | 'weekdays'         // Mon-Fri only
  | 'weekends'         // Sat-Sun only
  | 'most-days'        // 5-6/7
  | 'half-week'        // 3-4/7
  | 'twice-weekly'     // 2/7
  | 'weekly'           // 1/7
  | 'on-demand'        // 0/7 with events still listed

export type DepartureRhythmProps = {
  pattern: RhythmPattern
  daysMap: DaysMap
  activeDayCount: number
  windows: DepartureWindow[] // dominant windows across the week, ordered by frequency
  earliestTime: string | null // "HH:MM" of earliest across all events
  latestTime: string | null   // "HH:MM" of latest across all events
  eventCount: number
  /** Human-readable summary key for the caption, e.g. "dailyMorning". */
  summaryKey: string
}

function classifyWindow(time: string): DepartureWindow | null {
  const m = time.match(/^(\d{1,2}):?(\d{2})?/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  if (!Number.isFinite(h) || h < 0 || h > 23) return null
  if (h >= 5 && h < 7) return 'dawn'
  if (h >= 7 && h < 11) return 'morning'
  if (h >= 11 && h < 14) return 'midday'
  if (h >= 14 && h < 17) return 'afternoon'
  if (h >= 17 && h < 20) return 'evening'
  return 'night' // 20-04
}

function classifyPattern(days: DaysMap): RhythmPattern {
  const active = days.filter(Boolean).length
  if (active === 0) return 'on-demand'
  if (active === 7) return 'daily'

  const weekdays = days.slice(0, 5).filter(Boolean).length
  const weekend = days.slice(5).filter(Boolean).length

  if (weekdays === 5 && weekend === 0) return 'weekdays'
  if (weekdays === 0 && weekend === 2) return 'weekends'
  if (active >= 5) return 'most-days'
  if (active >= 3) return 'half-week'
  if (active === 2) return 'twice-weekly'
  return 'weekly'
}

function pickSummaryKey(
  pattern: RhythmPattern,
  windows: DepartureWindow[],
): string {
  // Compose a lightweight slug for the hero caption.
  // The renderer handles i18n, but the choice of phrase depends on both
  // the pattern and the dominant window.
  const top = windows[0] ?? null
  if (pattern === 'on-demand') return 'onDemand'
  if (pattern === 'daily') {
    if (top === 'morning') return 'dailyMorning'
    if (top === 'evening') return 'dailyEvening'
    if (top === 'night') return 'dailyNight'
    return 'dailyFlexible'
  }
  if (pattern === 'weekends') return 'weekendsOnly'
  if (pattern === 'weekdays') return 'weekdaysOnly'
  if (pattern === 'most-days') return 'mostDays'
  if (pattern === 'half-week') return 'halfWeek'
  if (pattern === 'twice-weekly') return 'twiceWeekly'
  return 'onceWeekly'
}

function timeToMinutes(t: string): number | null {
  const m = t.match(/^(\d{1,2}):?(\d{2})?/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const mn = m[2] ? parseInt(m[2], 10) : 0
  if (!Number.isFinite(h) || !Number.isFinite(mn)) return null
  return h * 60 + mn
}

function normaliseTime(t: string): string | null {
  const min = timeToMinutes(t)
  if (min == null) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function departureRhythmScorer(signals: ActivitySignals): ModuleScore | null {
  // Carve-outs: parks / waterparks imply daily open hours.
  if (signals.setting.includes('park') || signals.setting.includes('waterpark')) {
    return null
  }

  const events = signals._events ?? []
  if (events.length === 0) return null

  // --- Union of active days across all events ---------------------
  const days: DaysMap = [false, false, false, false, false, false, false]
  const windowCounts: Record<DepartureWindow, number> = {
    dawn: 0, morning: 0, midday: 0, afternoon: 0, evening: 0, night: 0,
  }
  let earliestMin: number | null = null
  let latestMin: number | null = null

  for (const ev of events) {
    const daysArr = Array.isArray(ev.days) ? ev.days : []
    const timesArr = Array.isArray(ev.times) ? ev.times : []
    for (let i = 0; i < 7; i++) {
      const dVal = daysArr[i]
      const tVal = (timesArr[i] ?? '').toString().trim()
      const active = typeof dVal === 'number' ? dVal > 0 : false
      const hasTime = tVal.length > 0 && tVal !== '-'
      if (!active && !hasTime) continue
      days[i] = days[i] || active || hasTime
      if (hasTime) {
        const w = classifyWindow(tVal)
        if (w) windowCounts[w] += 1
        const mn = timeToMinutes(tVal)
        if (mn != null) {
          if (earliestMin == null || mn < earliestMin) earliestMin = mn
          if (latestMin == null || mn > latestMin) latestMin = mn
        }
      }
    }
  }

  const activeDayCount = days.filter(Boolean).length

  // Skip: fully inactive AND only one event (no story to tell).
  if (activeDayCount === 0 && events.length <= 1) return null

  // Skip: only a single event with a single day — other modules cover it.
  if (events.length === 1 && activeDayCount <= 1) return null

  const pattern = classifyPattern(days)
  const windows = (Object.entries(windowCounts) as [DepartureWindow, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)

  const earliestTime = earliestMin != null
    ? `${Math.floor(earliestMin / 60).toString().padStart(2, '0')}:${(earliestMin % 60).toString().padStart(2, '0')}`
    : null
  const latestTime = latestMin != null
    ? `${Math.floor(latestMin / 60).toString().padStart(2, '0')}:${(latestMin % 60).toString().padStart(2, '0')}`
    : null

  const summaryKey = pickSummaryKey(pattern, windows)

  // --- Scoring ----------------------------------------------------
  // A rhythm summary is most useful when availability is non-trivial —
  // a rare activity is a stronger "plan carefully" message than a
  // "runs every day" one (which travellers already assume).
  let s = 48
  if (pattern === 'weekly' || pattern === 'twice-weekly') s += 14 // scarcity matters
  else if (pattern === 'weekends' || pattern === 'weekdays') s += 10
  else if (pattern === 'half-week') s += 6
  else if (pattern === 'most-days') s += 4
  // daily: neutral (no bonus)

  // Multi-window (morning + evening) = genuine "pick your slot" value
  if (windows.length >= 2) s += 6
  // Night / dawn departures are unusual — worth flagging
  if (windows.includes('night')) s += 4
  if (windows.includes('dawn')) s += 4

  // Penalty when we only have 1 event's rhythm (less useful comparison)
  if (events.length === 1) s -= 4

  // Cap: this is informative, not critical — stays below the big modules
  s = Math.max(0, Math.min(76, s))

  return {
    id: 'departure-rhythm',
    score: s,
    slot: 'left-tertiary',
    reason: `pattern=${pattern}, days=${activeDayCount}/7, windows=${windows.join('|') || '—'}, summary=${summaryKey}`,
    props: {
      pattern,
      daysMap: days,
      activeDayCount,
      windows,
      earliestTime,
      latestTime,
      eventCount: events.length,
      summaryKey,
    } satisfies DepartureRhythmProps,
  }
}
