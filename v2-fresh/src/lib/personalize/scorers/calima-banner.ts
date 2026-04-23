/**
 * Calima-Banner scorer — server-safe.
 *
 * Fires a full-width advisory at the top of the page when the
 * activity is visibility-sensitive AND we're inside the known
 * calima peak window (July–August on Tenerife). The goal: warn
 * the visitor *before* they book that dust from the Sahara can
 * collapse visibility in these months, so they should pick a
 * flexible ticket or a rescheduling-friendly operator.
 *
 * This is a static heuristic — we do NOT fetch live weather.
 * A future `weather-live` module can escalate this with real
 * PM10/visibility data from an AEMET feed. Until then, the
 * static calendar-based warning is genuinely useful because
 * calima frequency in Jul-Aug is well-established.
 *
 * Banner slot (cap=1), so at most one page-top advisory runs.
 * Distinct from `seasonal-window` (which talks about the whole
 * year and is passive) and `weather-advisory` (which is about
 * today's forecast interaction with the activity).
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type CalimaSeverity = 'watch' | 'advisory' | 'strong'

export type CalimaBannerProps = {
  severity: CalimaSeverity
  /** 1-indexed month (1..12) used to choose copy. */
  month: number
  /** Which aspects of the activity are at risk. */
  affects: Array<'visibility' | 'respiratory' | 'photos' | 'flight' | 'sea'>
  /** Short reason key for the banner subtitle. */
  reasonKey: string
}

/**
 * Current month, 1-indexed. Extracted for testability.
 * Runs on both server (SSR/RSC) and client — same TZ heuristic as
 * SunsetTimeAdapter: use the server's local clock, accept the small
 * skew vs. the viewer's TZ as cheaper than per-request geo.
 */
function currentMonth(): number {
  return new Date().getMonth() + 1
}

export function calimaBannerScorer(
  signals: ActivitySignals,
  nowMonth: number = currentMonth(),
): ModuleScore | null {
  // --- Gate 1 : month window -------------------------------------
  // Jul-Aug is the defining calima peak on the Canaries; Feb-Mar
  // brings a milder second wave off the Sahara. Anywhere else the
  // banner is overkill.
  const isPeak = nowMonth === 7 || nowMonth === 8
  const isSecondary = nowMonth === 2 || nowMonth === 3
  if (!isPeak && !isSecondary) return null

  // --- Gate 2 : activity actually at risk ------------------------
  const isVisibility = signals.visibilitySensitive || signals.calimaSensitive
  const isFlight =
    signals.setting.includes('paragliding') ||
    signals.setting.includes('helicopter') ||
    signals.setting.includes('flight')
  const isViewpoint =
    signals.setting.includes('mirador') ||
    signals.altitude === 'high' ||
    signals.themes.has('stargazing') ||
    signals.themes.has('photography')
  const isSea =
    signals.setting.includes('diving') ||
    signals.setting.includes('snorkel')
  const isHikingHigh =
    signals.setting.includes('hiking') &&
    (signals.altitude === 'mid' || signals.altitude === 'high')

  const affects: CalimaBannerProps['affects'] = []
  if (isVisibility || isViewpoint) affects.push('visibility')
  if (isFlight) affects.push('flight')
  if (signals.themes.has('photography') || isViewpoint) affects.push('photos')
  if (isSea) affects.push('sea')
  if (isFlight || isHikingHigh || signals.altitude === 'high') {
    affects.push('respiratory')
  }

  // Deduplicate while preserving order
  const dedup = [...new Set(affects)]

  // Need at least one concrete risk vector, otherwise don't
  // interrupt the page with a generic dust warning.
  if (dedup.length === 0) return null

  // --- Severity --------------------------------------------------
  let severity: CalimaSeverity
  if (isPeak && (isFlight || isVisibility)) severity = 'strong'
  else if (isPeak) severity = 'advisory'
  else severity = 'watch'

  // --- Reason key ------------------------------------------------
  let reasonKey: string
  if (isFlight) reasonKey = 'reason_flight'
  else if (isVisibility || isViewpoint) reasonKey = 'reason_visibility'
  else if (isSea) reasonKey = 'reason_sea'
  else reasonKey = 'reason_generic'

  // --- Scoring ---------------------------------------------------
  // Banner slot is scarce (cap=1) and interrupts reading flow —
  // score aggressively so it only wins when the combination is
  // genuinely strong.
  let s = 52
  if (severity === 'strong') s += 14
  else if (severity === 'advisory') s += 8

  if (dedup.length >= 3) s += 4
  if (isFlight && isPeak) s += 4

  s = Math.max(0, Math.min(82, s))

  return {
    id: 'calima-banner',
    score: s,
    slot: 'banner',
    reason: `severity=${severity}, month=${nowMonth}, affects=[${dedup.join(',')}]`,
    props: {
      severity,
      month: nowMonth,
      affects: dedup,
      reasonKey,
    } satisfies CalimaBannerProps,
  }
}
