/**
 * Companion-Duo scorer — server-safe.
 *
 * Highlights "cross-archetype" activities that genuinely work for a
 * multi-generational group: grandparents + parents + kids, or a couple
 * travelling with another couple's family. Neither `companion-fit` nor
 * `family-fit` speaks to this buying moment today:
 *
 *   - companion-fit ranks archetypes but stops at top-3 verdicts — it
 *     won't tell the shopper "this is the rare trip that fits all three
 *     generations"
 *   - family-fit is exclusively parent-facing facts (min age, stroller,
 *     intensity) — silent on how grandparents would get on
 *
 * We fire ONLY when BOTH of these hold:
 *   1. companion-fit's `family-young` OR `family-teens` score ≥ 55
 *   2. companion-fit's `couple` OR `seniors` score ≥ 55
 *
 * That guarantees solo / pure-couple / pure-seniors / pure-family pages
 * do not get a redundant card — the existing scorers cover them better.
 *
 * Scored modestly (baseline 56, cap 78) so on a true multi-gen listing
 * it slots after companion-fit + family-fit without displacing either.
 * The per-slot cap in `compose.ts` (left-secondary = 4) absorbs it.
 */

import type { ActivitySignals, ModuleScore } from '../types'
import { companionFitScorer } from './companion-fit'
import { familyFitScorer } from './family-fit'
import type { CompanionArchetype, CompanionRating } from './companion-fit'
import type { FamilyVerdict } from './family-fit'

export type CompanionDuoAxis = 'family+couple' | 'family+seniors' | 'family+couple+seniors'

/**
 * Props shape the UI reads. Kept narrow on purpose — the card only
 * needs enough context to explain WHY this activity works for a
 * mixed-age group, not re-enumerate everything the other cards say.
 */
export type CompanionDuoProps = {
  /** Which generational pair (or triple) is endorsed. */
  axis: CompanionDuoAxis
  /** Family archetype pulled from companion-fit's ranking. */
  familyArchetype: Extract<CompanionArchetype, 'family-young' | 'family-teens'>
  /** Paired archetype endorsed by the axis — drives a secondary icon. */
  partnerArchetype: Extract<CompanionArchetype, 'couple' | 'seniors'>
  /** Min child age lifted from signals (if known) — UI shows "dès X ans". */
  minAge: number | null
  /** Infant allowed — lifted from family-fit verdict chain. */
  infantAllowed: boolean
  /** Verdict from family-fit (never 'adults-only' if we fire). */
  familyVerdict: FamilyVerdict
  /** Snapshot of the winning family rating for the reason chip. */
  familyRating: CompanionRating
  /** Snapshot of the paired rating for the reason chip. */
  partnerRating: CompanionRating
}

export function companionDuoScorer(signals: ActivitySignals): ModuleScore | null {
  // Adrenaline activities are almost never multi-gen friendly.
  if (signals.intensity === 'adrenaline') return null

  // We need a family angle with concrete data behind it — reuse the
  // same gating family-fit uses so the two modules stay in lockstep.
  const familyFit = familyFitScorer(signals)
  if (!familyFit) return null

  const familyProps = familyFit.props as { verdict: FamilyVerdict } | undefined
  if (!familyProps || familyProps.verdict === 'adults-only') return null

  // Pull the archetype rankings from companion-fit.
  const companion = companionFitScorer(signals)
  if (!companion || !companion.props) return null
  const ratings = (companion.props as { all: CompanionRating[] }).all

  const byArchetype = new Map(ratings.map((r) => [r.archetype, r]))
  const family =
    (byArchetype.get('family-young')?.score ?? 0) >=
    (byArchetype.get('family-teens')?.score ?? 0)
      ? byArchetype.get('family-young')!
      : byArchetype.get('family-teens')!
  const couple = byArchetype.get('couple')!
  const seniors = byArchetype.get('seniors')!

  // Gating: multi-gen only when BOTH a family archetype and a
  // non-family archetype (couple or seniors) are at least workable.
  const FAMILY_MIN = 55
  const PARTNER_MIN = 55
  if (family.score < FAMILY_MIN) return null

  const coupleFits = couple.score >= PARTNER_MIN
  const seniorsFit = seniors.score >= PARTNER_MIN
  if (!coupleFits && !seniorsFit) return null

  // Pick the strongest partner archetype (couple vs seniors) — if both
  // qualify, highlight both via the composite axis.
  let axis: CompanionDuoAxis
  let partner: CompanionRating
  if (coupleFits && seniorsFit) {
    axis = 'family+couple+seniors'
    partner = couple.score >= seniors.score ? couple : seniors
  } else if (coupleFits) {
    axis = 'family+couple'
    partner = couple
  } else {
    axis = 'family+seniors'
    partner = seniors
  }

  // --- Module score -----------------------------------------------
  // Baseline expresses "this is the rare activity that bridges two
  // generational archetypes" — a planning moment we want seen.
  let s = 56

  // Confidence bumps driven by the raw sub-scores.
  s += Math.min(10, Math.round((family.score - FAMILY_MIN) / 3))
  s += Math.min(8, Math.round((partner.score - PARTNER_MIN) / 4))

  // Triple-axis is the best-case multi-gen signal — worth an emphasis.
  if (axis === 'family+couple+seniors') s += 6

  // Solid family-fit verdict reinforces the message.
  if (familyProps.verdict === 'great-fit') s += 4
  else if (familyProps.verdict === 'caution') s -= 6

  // Very long trips (> 6h) wear on kids and grandparents alike —
  // dampen so we don't over-claim.
  if ((signals.durationMinutes ?? 0) >= 360) s -= 6

  // Relaxed intensity = the pace every generation can share.
  if (signals.intensity === 'relaxed') s += 4

  // Known "universal crowd-pleaser" settings get a small nudge.
  const universal =
    signals.setting.includes('catamaran') ||
    signals.setting.includes('boat') ||
    signals.setting.includes('zoo') ||
    signals.setting.includes('aquarium') ||
    signals.themes.has('wildlife')
  if (universal) s += 3

  s = Math.max(0, Math.min(78, s))

  const partnerArchetype =
    partner.archetype === 'couple' ? 'couple' : ('seniors' as const)

  const familyArchetype =
    family.archetype === 'family-young' ? 'family-young' : ('family-teens' as const)

  return {
    id: 'companion-duo',
    score: s,
    slot: 'left-secondary',
    reason: `axis=${axis}, family=${family.score}, partner=${partnerArchetype}:${partner.score}`,
    props: {
      axis,
      familyArchetype,
      partnerArchetype,
      minAge: signals.minChildAge,
      infantAllowed: signals.hasInfantAge,
      familyVerdict: familyProps.verdict,
      familyRating: family,
      partnerRating: partner,
    } satisfies CompanionDuoProps,
  }
}
