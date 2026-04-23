/**
 * Micro-itinerary scorer — server-safe.
 *
 * Builds a tiny 3-step "how to fit this into your day" plan based on the
 * activity's actual earliest event time, duration and zone. The idea is
 * practical guidance: if you're doing a 3h south-coast catamaran starting
 * at 10 am, what comes before and what makes sense after?
 *
 * We classify the activity into a (timeSlot × duration) template, then
 * pick zone-flavoured before/after suggestions. Everything is referenced
 * by translation key so the client card can i18n-resolve.
 *
 * Out of scope (explicit): linking to specific other activities. That
 * would need a catalog query. Here we keep the module self-contained and
 * purely advisory — "plan this, it's a morning/half-day/full-evening
 * experience".
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type ItineraryIconName =
  | 'Sunrise'
  | 'Sun'
  | 'Sunset'
  | 'Moon'
  | 'Coffee'
  | 'Utensils'
  | 'Bed'
  | 'MapPin'
  | 'Sparkles'
  | 'CalendarClock'

export type ItineraryStep = {
  key: string
  icon: ItineraryIconName
  /** e.g. "8h – 9h30", "Avant l'activité", "Le lendemain" — resolved on client */
  timeKey: string
  timeParams?: Record<string, string | number>
  /** What to do in this slot — resolved on client from the translation map. */
  textKey: string
  textParams?: Record<string, string | number>
}

type TimeClass = 'early' | 'morning' | 'midday' | 'afternoon' | 'sunset' | 'night' | 'unknown'
type DurationClass = 'short' | 'half' | 'full' | 'multi'

function classifyStart(hour: number | null): TimeClass {
  if (hour == null) return 'unknown'
  if (hour < 8) return 'early'
  if (hour < 11) return 'morning'
  if (hour < 14) return 'midday'
  if (hour < 17) return 'afternoon'
  if (hour < 20) return 'sunset'
  return 'night'
}

function classifyDuration(mins: number | null): DurationClass {
  if (mins == null) return 'half'
  if (mins <= 90) return 'short'
  if (mins <= 240) return 'half'
  // Big single-day blocks (Teide sunset + stargazing at 8h, full-day tours at
  // 10-11h) still benefit from a before/during/after plan — 'full' covers up
  // to a long evening. Only genuinely multi-day tours (>12h) are 'multi'.
  if (mins <= 720) return 'full'
  return 'multi'
}

function earliestEventHour(signals: ActivitySignals): number | null {
  let earliest: number | null = null
  for (const e of signals._events) {
    for (const t of e.times ?? []) {
      const m = t.match(/^(\d{1,2}):/)
      if (!m) continue
      const h = parseInt(m[1], 10)
      if (earliest == null || h < earliest) earliest = h
    }
  }
  return earliest
}

function fmtHour(h: number): string {
  return `${h}h`
}

function fmtRange(startH: number, durMin: number): string {
  const end = startH + Math.round(durMin / 60)
  return `${fmtHour(startH)} – ${fmtHour(Math.min(24, end))}`
}

/**
 * Zone-flavoured "what to pair this with" — the actual copy sits in the
 * client i18n file; we emit stable textKeys.
 */
function beforeAfterForZone(zone: string | null): { before: string; after: string } {
  switch (zone) {
    case 'south':
      return { before: 'beforeSouth', after: 'afterSouth' }
    case 'north':
      return { before: 'beforeNorth', after: 'afterNorth' }
    case 'west':
      return { before: 'beforeWest', after: 'afterWest' }
    case 'center':
      return { before: 'beforeCenter', after: 'afterCenter' }
    case 'east':
      return { before: 'beforeEast', after: 'afterEast' }
    default:
      return { before: 'beforeGeneric', after: 'afterGeneric' }
  }
}

function buildSteps(signals: ActivitySignals): ItineraryStep[] {
  const startHour = earliestEventHour(signals)
  const timeClass = classifyStart(startHour)
  const duration = classifyDuration(signals.durationMinutes)
  const zoneCopy = beforeAfterForZone(signals.zone)
  const steps: ItineraryStep[] = []

  const rangeLabel =
    startHour != null && signals.durationMinutes
      ? fmtRange(startHour, signals.durationMinutes)
      : null

  // --- BEFORE step --------------------------------------------------
  if (timeClass === 'sunset' || timeClass === 'night') {
    // Sunset/night activity → suggest a restful afternoon first.
    steps.push({
      key: 'before',
      icon: 'Bed',
      timeKey: 'timeBeforeSunset',
      textKey: 'restBeforeSunset',
    })
  } else if (timeClass === 'morning' || timeClass === 'early') {
    steps.push({
      key: 'before',
      icon: 'Coffee',
      timeKey: 'timeEarlyMorning',
      textKey: 'quickBreakfast',
    })
  } else if (timeClass === 'midday' || timeClass === 'afternoon') {
    steps.push({
      key: 'before',
      icon: 'Sunrise',
      timeKey: 'timeMorningSlot',
      textKey: zoneCopy.before,
    })
  } else {
    steps.push({
      key: 'before',
      icon: 'Sunrise',
      timeKey: 'timeBeforeGeneric',
      textKey: zoneCopy.before,
    })
  }

  // --- DURING step (the activity itself) ----------------------------
  const duringIcon: ItineraryIconName =
    timeClass === 'sunset' ? 'Sunset' :
    timeClass === 'night' ? 'Moon' :
    timeClass === 'morning' || timeClass === 'early' ? 'Sun' :
    'Sun'

  let duringTextKey = 'duringGeneric'
  if (duration === 'full') duringTextKey = 'duringFullDay'
  else if (duration === 'short') duringTextKey = 'duringShort'
  else if (timeClass === 'sunset') duringTextKey = 'duringSunset'

  steps.push({
    key: 'during',
    icon: duringIcon,
    timeKey: rangeLabel ? 'timeDuringRange' : 'timeDuringActivity',
    timeParams: rangeLabel ? { range: rangeLabel } : undefined,
    textKey: duringTextKey,
    textParams: signals.durationMinutes
      ? {
          duration: signals.durationMinutes >= 60
            ? `${Math.round(signals.durationMinutes / 60)}h`
            : `${signals.durationMinutes}min`,
        }
      : undefined,
  })

  // --- AFTER step ---------------------------------------------------
  if (timeClass === 'sunset' || timeClass === 'night' || duration === 'full') {
    steps.push({
      key: 'after',
      icon: 'Moon',
      timeKey: 'timeLateEvening',
      textKey: 'restAfterLong',
    })
  } else if (timeClass === 'morning' || timeClass === 'early') {
    steps.push({
      key: 'after',
      icon: 'Utensils',
      timeKey: 'timeAfternoonSlot',
      textKey: zoneCopy.after,
    })
  } else {
    steps.push({
      key: 'after',
      icon: 'Utensils',
      timeKey: 'timeAfterGeneric',
      textKey: zoneCopy.after,
    })
  }

  return steps
}

export function microItineraryScorer(signals: ActivitySignals): ModuleScore | null {
  // Multi-day tours aren't a fit for a 3-step daily plan.
  if (classifyDuration(signals.durationMinutes) === 'multi') return null

  // Enclosed venues (zoo, water park) already come with their own day plan —
  // a generic "morning / during / afternoon" template on top is redundant.
  if (signals.setting.includes('park') || signals.setting.includes('waterpark')) return null

  // Must have at least one real scheduled time — otherwise the plan is
  // guesswork and we'd show it for the "Dîner pique-nique" templates
  // whose `times` are all placeholders.
  if (earliestEventHour(signals) == null) return null

  const steps = buildSteps(signals)
  if (steps.length < 3) return null

  // Base score — modest, this is an aid, not a hero module.
  let s = 45
  if (signals.durationMinutes && signals.durationMinutes >= 180) s += 10 // non-trivial block of the day
  if (signals.zone && signals.zone !== 'unknown') s += 5
  if (signals.setting.includes('sunset') || signals.setting.includes('night')) s += 8
  if (signals.themes.has('family')) s += 4

  s = Math.min(85, s)

  return {
    id: 'micro-itinerary',
    score: s,
    slot: 'left-secondary',
    reason: `3-step plan, start=${earliestEventHour(signals)}h, dur=${classifyDuration(signals.durationMinutes)}`,
    props: {
      steps,
    },
  }
}
