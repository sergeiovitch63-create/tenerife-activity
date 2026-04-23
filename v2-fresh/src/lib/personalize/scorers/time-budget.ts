/**
 * Time-Budget scorer — server-safe.
 *
 * Answers "how does this activity fit in my day?" — a quiet but
 * concrete planning aid next to the booking panel. Unlike
 * `departure-rhythm` (which talks about weekly cadence) or
 * `micro-itinerary` (which describes the internal beats of the
 * activity), this one is about the SHAPE of the time footprint:
 * pocket, half-day, full-day, or multi-day — and whether transit
 * steals enough of that budget to change the mental model.
 *
 * The window (morning / afternoon / evening) is derived from the
 * event start times; the transit buffer is added when pickup is
 * not included and the activity sits in a hard-to-reach zone.
 *
 * Distinct from:
 *  - departure-rhythm  : which weekdays + how many departures
 *  - micro-itinerary   : minute-by-minute plan inside the activity
 *  - first-timer-tips  : pitfalls the visitor would regret
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type TimeBudgetFit =
  | 'pocket'     // ≤ 90 min effective — slots between other things
  | 'half-day'   // 91–300 min — morning or afternoon
  | 'full-day'   // 301–540 min — takes the whole day
  | 'multi-day'  // > 540 min — overnight / 2-day tour

export type TimeBudgetWindow =
  | 'morning'     // starts before 12:00
  | 'afternoon'   // starts 12:00–17:59
  | 'evening'     // starts ≥ 18:00 (sunset / night)
  | 'flex'        // multiple daily starts across slots
  | null

export type TimeBudgetProps = {
  fit: TimeBudgetFit
  /** Raw booked duration in minutes. */
  durationMinutes: number
  /** Duration + return transit buffer. */
  effectiveMinutes: number
  /** Added transit minutes (round-trip). 0 if pickup included or local. */
  transitMinutes: number
  pickupIncluded: boolean
  /** Start-time window, if derivable from event times. */
  window: TimeBudgetWindow
  /** Planning tip key consumed by the renderer for the subtitle. */
  planningKey: string
}

function parseNum(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const s = String(raw).replace(',', '.').trim()
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/** Estimate round-trip transit minutes when pickup isn't bundled. */
function estimateTransit(signals: ActivitySignals, pickupIncluded: boolean): number {
  if (pickupIncluded) return 0
  // South is where most tourists stay — there's no transit penalty for south.
  switch (signals.zone) {
    case 'south':
    case 'ocean':
    case 'unknown':
      return 0
    case 'center': // Teide area — long drive up
      return 120
    case 'north':  // Puerto / Orotava
      return 90
    case 'west':   // Los Gigantes / Masca
      return 75
    case 'east':   // Santa Cruz / Anaga
      return 75
    default:
      return 0
  }
}

/** Classify effective minutes into the fit archetype. */
function classifyFit(mins: number): TimeBudgetFit {
  if (mins <= 90) return 'pocket'
  if (mins <= 300) return 'half-day'
  if (mins <= 540) return 'full-day'
  return 'multi-day'
}

/** Derive start window from the union of event times. */
function deriveWindow(signals: ActivitySignals): TimeBudgetWindow {
  const buckets = new Set<Exclude<TimeBudgetWindow, null | 'flex'>>()
  for (const ev of signals._events) {
    for (const t of ev.times ?? []) {
      if (!t || typeof t !== 'string') continue
      // Expected "HH:MM" — take the hour
      const hh = parseInt(t.slice(0, 2), 10)
      if (!Number.isFinite(hh)) continue
      if (hh >= 18) buckets.add('evening')
      else if (hh >= 12) buckets.add('afternoon')
      else buckets.add('morning')
    }
  }
  if (buckets.size === 0) return null
  if (buckets.size > 1) return 'flex'
  return [...buckets][0]
}

/** Pick the right planning tip key for this (fit, window, transit) combo. */
function pickPlanningKey(
  fit: TimeBudgetFit,
  window: TimeBudgetWindow,
  transitHeavy: boolean,
  pickupIncluded: boolean,
): string {
  if (fit === 'multi-day') return 'tip_multi_day'
  if (fit === 'full-day') return transitHeavy ? 'tip_full_day_transit' : 'tip_full_day'
  if (fit === 'pocket') {
    if (transitHeavy) return 'tip_pocket_transit'
    if (pickupIncluded) return 'tip_pocket_pickup'
    return 'tip_pocket_local'
  }
  // half-day
  if (window === 'morning') return 'tip_halfday_morning'
  if (window === 'afternoon') return 'tip_halfday_afternoon'
  if (window === 'evening') return 'tip_halfday_evening'
  if (transitHeavy) return 'tip_halfday_transit'
  return 'tip_halfday_flex'
}

export function timeBudgetScorer(signals: ActivitySignals): ModuleScore | null {
  const duration = signals.durationMinutes
  if (duration == null || duration <= 0) return null

  const pickupFlag = parseNum(signals._group.pickup)
  const pickupIncluded = pickupFlag != null && pickupFlag >= 1

  const transitMinutes = estimateTransit(signals, pickupIncluded)
  const effectiveMinutes = duration + transitMinutes

  const fit = classifyFit(effectiveMinutes)
  const window = deriveWindow(signals)
  const transitHeavy = transitMinutes >= 75

  const planningKey = pickPlanningKey(fit, window, transitHeavy, pickupIncluded)

  // --- Scoring ----------------------------------------------------
  // Moderate baseline — this is quiet planning help, not a headline.
  let s = 46

  // Transit adds meaningful context
  if (transitHeavy) s += 5

  // Time-locked windows (sunset / evening) are higher-value info
  if (window === 'evening') s += 4
  else if (window === 'morning') s += 2

  // Full-day and multi-day carry more weight — bigger commitment
  if (fit === 'full-day') s += 4
  else if (fit === 'multi-day') s += 6

  // Pocket without pickup + no transit = pedestrian info; damp a bit
  if (fit === 'pocket' && !transitHeavy && !pickupIncluded) s -= 4

  // Multi-event activities with varied rhythms feel richer to plan
  if (signals._events.length >= 3) s += 2

  // If the operator already ships a detailed itinerary, this card is
  // less differentiating — micro-itinerary carries the weight.
  if (signals.hasDetailedRoute && fit === 'half-day') s -= 3

  s = Math.max(0, Math.min(72, s))

  return {
    id: 'time-budget',
    score: s,
    slot: 'right-inline',
    reason: `fit=${fit}, eff=${effectiveMinutes}min, transit=${transitMinutes}min, window=${window ?? '—'}`,
    props: {
      fit,
      durationMinutes: duration,
      effectiveMinutes,
      transitMinutes,
      pickupIncluded,
      window,
      planningKey,
    } satisfies TimeBudgetProps,
  }
}
