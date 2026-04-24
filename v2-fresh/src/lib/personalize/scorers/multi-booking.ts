/**
 * Multi-activity booking CTA — server-safe scorer.
 *
 * Renders inside the booking sidebar (`right-inline`) when the activity
 * is a good fit for multi-activity planning — typically a half-day slot
 * that pairs naturally with complementary experiences across the week.
 *
 * We do NOT promise a discount unless we actually have one in the system.
 * Instead the card surfaces practical benefits the platform can credibly
 * deliver: grouped confirmation, transfer coordination, single support
 * thread, and per-activity cancellation. The "pairing suggestion" line
 * is themed (adventure→relax, family→park, romantic→sunset, etc.).
 *
 * Disqualifiers:
 *   - Full-day/multi-day tours (the day is already booked)
 *   - Mass-market parks / water parks (already have their own bundles)
 *   - Bargain-tier prices (savings via bundle won't move the needle)
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type MultiBookingPairing =
  | 'adventureRelax'
  | 'familyDay'
  | 'romanticWeek'
  | 'natureGastro'
  | 'wildlifeWalk'
  | 'cultureFood'
  | 'sunsetNext'
  | 'generic'

export type MultiBookingBenefitKey =
  | 'groupedConfirmation'
  | 'coordinatedTransfers'
  | 'prioritySupport'
  | 'perActivityCancellation'

export type MultiBookingProps = {
  pairing: MultiBookingPairing
  benefits: MultiBookingBenefitKey[]
  /** Optional headline count, e.g. "3 activités = un séjour." */
  suggestedCount: number
}

function pickPairing(signals: ActivitySignals): MultiBookingPairing {
  // Order matters — more specific themes first.
  if (signals.themes.has('stargazing')) return 'sunsetNext'
  if (signals.themes.has('romantic')) return 'romanticWeek'
  if (signals.themes.has('adrenaline')) return 'adventureRelax'
  if (signals.themes.has('wildlife')) return 'wildlifeWalk'
  if (signals.themes.has('culture') && signals.themes.has('gastro')) return 'cultureFood'
  if (signals.themes.has('gastro')) return 'cultureFood'
  if (signals.themes.has('family')) return 'familyDay'
  if (signals.themes.has('nature')) return 'natureGastro'
  return 'generic'
}

export function multiBookingScorer(signals: ActivitySignals): ModuleScore | null {
  // Disqualifier: full-day or multi-day activity — the day is taken.
  if (signals.durationMinutes != null && signals.durationMinutes > 360) return null

  // Disqualifier: mass-market venues with their own package pricing.
  if (signals.setting.includes('park') || signals.setting.includes('waterpark')) return null

  // Disqualifier: bargain tier — the value prop is weak for low-ticket items.
  if (signals.priceTier === 'low') return null

  const pairing = pickPairing(signals)
  const benefits: MultiBookingBenefitKey[] = [
    'groupedConfirmation',
    'coordinatedTransfers',
    'prioritySupport',
    'perActivityCancellation',
  ]

  // Suggested number of activities to pair with.
  //   short/half-day → 2-3
  //   full-ish evening / 5-6h → 2
  const suggestedCount = signals.durationMinutes && signals.durationMinutes > 240 ? 2 : 3

  let s = 50
  if (signals.durationMinutes && signals.durationMinutes <= 180) s += 12 // short activities pair easily
  if (signals.priceTier === 'high') s += 6
  if (signals.priceTier === 'premium') s += 4 // premium is great to bundle too
  if (signals.hasMultipleEvents) s += 3          // lots of variants = flexible to fit a plan
  if (signals.themes.size >= 3) s += 3           // rich theming hints at bundling potential

  s = Math.min(85, s)

  return {
    id: 'multi-booking',
    score: s,
    slot: 'right-inline',
    reason: `pairing=${pairing}, count=${suggestedCount}`,
    props: {
      pairing,
      benefits,
      suggestedCount,
    } satisfies MultiBookingProps,
  }
}
