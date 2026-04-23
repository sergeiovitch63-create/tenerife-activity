/**
 * Family-Fit scorer — server-safe.
 *
 * Converts Atlantico's raw `childAge` / `infantAge` bands + our intensity
 * signal into a concrete "will this work with kids?" readout. Parents
 * scanning the page shouldn't have to dig through fine print to decide if
 * the trip fits a 6-year-old and a toddler.
 *
 * We emit a compact set of facts (not prose) that the card renders as a
 * scorecard:
 *  - minAge / maxAge of the child band
 *  - infant acceptance + "in arms" nuance
 *  - intensity verdict (why adrenaline bans toddlers etc.)
 *  - stroller / gear hints derived from setting (boat, hiking, park)
 *  - a single `verdict` keyword the UI uses to colour the card
 *
 * Deliberately skipped when:
 *  - no child-age data AND no family theme/setting (module would lie)
 *  - adults-only adrenaline (jet-ski w/ min age 18): another module
 *    already communicates that via suitability-profile
 *  - enclosed parks where "family" is the default (suitability-profile
 *    is enough — we don't duplicate)
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type FamilyFact = {
  key:
    | 'minAge'
    | 'noLowerBound'
    | 'infantFree'
    | 'infantCharged'
    | 'infantNotAllowed'
    | 'strollerFriendly'
    | 'strollerTricky'
    | 'intensityRelaxed'
    | 'intensityModerate'
    | 'intensityAdrenaline'
    | 'pickupIncluded'
    | 'longTrip'
    | 'shortTrip'
  /** For ages-related facts. */
  value?: number | string
  /** Icon slot — client maps to a Lucide component. */
  icon: FamilyFactIcon
  /** Soft tone for the UI to render the row. */
  tone: 'positive' | 'neutral' | 'caution'
}

export type FamilyFactIcon =
  | 'Baby'
  | 'Users'
  | 'Gauge'
  | 'Smile'
  | 'AlertTriangle'
  | 'Heart'
  | 'CheckCircle2'
  | 'Clock'
  | 'Bus'
  | 'Stroller'

export type FamilyVerdict = 'great-fit' | 'workable' | 'caution' | 'adults-only'

export type FamilyFitProps = {
  verdict: FamilyVerdict
  minAge: number | null
  maxAge: number | null
  infant: 'allowed' | 'not-allowed' | 'unknown'
  facts: FamilyFact[]
}

function verdictFor(
  minAge: number | null,
  infantAllowed: boolean,
  intensity: ActivitySignals['intensity'],
): FamilyVerdict {
  if (intensity === 'adrenaline' && (minAge == null || minAge >= 12)) return 'adults-only'
  if (infantAllowed && (minAge == null || minAge <= 3)) return 'great-fit'
  if (intensity === 'adrenaline') return 'caution'
  if (minAge != null && minAge >= 8) return 'workable'
  return 'workable'
}

export function familyFitScorer(signals: ActivitySignals): ModuleScore | null {
  // Carve-out: Atlantico's `park` / `waterpark` settings already get the
  // bulk of a family read-out via suitability-profile; duplicating here
  // crowds the page.
  if (signals.setting.includes('park') || signals.setting.includes('waterpark')) return null

  // We need either structured age data OR a family-flavoured activity to
  // have something honest to say.
  const hasAgeSignal = signals.hasChildAge || signals.hasInfantAge
  const familyVibe =
    signals.isFamilyFriendly ||
    signals.themes.has('family') ||
    signals.themes.has('wildlife')

  if (!hasAgeSignal && !familyVibe) return null

  // Adults-only adrenaline short-circuit: nothing useful to say to
  // parents — let suitability-profile handle it.
  if (
    signals.intensity === 'adrenaline' &&
    signals.hasChildAge &&
    (signals.minChildAge ?? 0) >= 14 &&
    !signals.hasInfantAge
  ) {
    return null
  }

  const facts: FamilyFact[] = []

  // --- Age band ----------------------------------------------------
  if (signals.hasChildAge && signals.minChildAge != null) {
    facts.push({
      key: 'minAge',
      value: signals.minChildAge,
      icon: 'Users',
      tone: signals.minChildAge <= 4 ? 'positive' : signals.minChildAge <= 8 ? 'neutral' : 'caution',
    })
  } else if (familyVibe) {
    facts.push({ key: 'noLowerBound', icon: 'Users', tone: 'neutral' })
  }

  // --- Infant policy ----------------------------------------------
  const infant: FamilyFitProps['infant'] =
    signals.hasInfantAge ? 'allowed'
    : signals.hasChildAge && (signals.minChildAge ?? 99) >= 6 ? 'not-allowed'
    : 'unknown'

  if (infant === 'allowed') {
    // Infants appearing as a dedicated price bucket usually means free
    // or symbolic. We tell the UI "allowed, often free on lap" — not a
    // binding promise, but matches reality for 95% of Atlantico feeds.
    facts.push({ key: 'infantFree', icon: 'Baby', tone: 'positive' })
  } else if (infant === 'not-allowed') {
    facts.push({ key: 'infantNotAllowed', icon: 'Baby', tone: 'caution' })
  }

  // --- Intensity ---------------------------------------------------
  if (signals.intensity === 'relaxed') {
    facts.push({ key: 'intensityRelaxed', icon: 'Heart', tone: 'positive' })
  } else if (signals.intensity === 'moderate') {
    facts.push({ key: 'intensityModerate', icon: 'Gauge', tone: 'neutral' })
  } else {
    facts.push({ key: 'intensityAdrenaline', icon: 'AlertTriangle', tone: 'caution' })
  }

  // --- Stroller / gear nuance -------------------------------------
  const strollerFriendly =
    signals.setting.includes('restaurant') ||
    signals.setting.includes('village') ||
    signals.setting.includes('winery') ||
    signals.setting.includes('museum')
  const strollerTricky =
    signals.setting.includes('boat') ||
    signals.setting.includes('catamaran') ||
    signals.setting.includes('yacht') ||
    signals.setting.includes('hiking') ||
    signals.setting.includes('climbing') ||
    signals.setting.includes('caving') ||
    signals.setting.includes('volcano') ||
    signals.setting.includes('paragliding')

  if (strollerFriendly && !strollerTricky) {
    facts.push({ key: 'strollerFriendly', icon: 'Stroller', tone: 'positive' })
  } else if (strollerTricky) {
    facts.push({ key: 'strollerTricky', icon: 'Stroller', tone: 'caution' })
  }

  // --- Duration for the tired-kid factor --------------------------
  if (signals.durationMinutes != null) {
    if (signals.durationMinutes >= 360) {
      facts.push({
        key: 'longTrip',
        value: Math.round(signals.durationMinutes / 60),
        icon: 'Clock',
        tone: 'caution',
      })
    } else if (signals.durationMinutes <= 150) {
      facts.push({
        key: 'shortTrip',
        value: Math.round(signals.durationMinutes / 60),
        icon: 'Clock',
        tone: 'positive',
      })
    }
  }

  // --- Pickup (reduces logistics headache with toddlers) ----------
  const pickupRaw = signals._group.pickup
  const pickupOn = pickupRaw === 1 || pickupRaw === '1' || pickupRaw === 'on' || pickupRaw === 'yes'
  if (pickupOn) {
    facts.push({ key: 'pickupIncluded', icon: 'Bus', tone: 'positive' })
  }

  if (facts.length < 2) return null

  const verdict = verdictFor(
    signals.minChildAge,
    infant === 'allowed',
    signals.intensity,
  )

  // --- Scoring -----------------------------------------------------
  // Baseline — we have *some* family signal worth showing.
  let s = 50

  // Structured age data is the single biggest confidence boost.
  if (signals.hasChildAge) s += 14
  if (signals.hasInfantAge) s += 6

  // Family-flavoured activity without explicit age data — useful but soft.
  if (!signals.hasChildAge && familyVibe) s += 4

  // Wildlife + family = whale watching type. Strong parental demand signal.
  if (signals.themes.has('wildlife') && (signals.isFamilyFriendly || signals.hasChildAge)) s += 8

  // Relaxed intensity is the archetypal family fit.
  if (signals.intensity === 'relaxed') s += 6
  if (signals.intensity === 'adrenaline') s -= 6

  // Stroller caution is a real objection — the card surfacing it is valuable.
  if (strollerTricky) s += 4

  // Verdict-based damping for edge cases.
  if (verdict === 'adults-only') s = Math.min(s, 48)
  if (verdict === 'caution' && !signals.hasChildAge) s = Math.min(s, 52)

  s = Math.max(0, Math.min(88, s))

  return {
    id: 'family-fit',
    score: s,
    slot: 'left-secondary',
    reason: `verdict=${verdict}, minAge=${signals.minChildAge ?? '—'}, infant=${infant}, facts=${facts.length}`,
    props: {
      verdict,
      minAge: signals.minChildAge,
      maxAge: signals.maxChildAge,
      infant,
      facts,
    } satisfies FamilyFitProps,
  }
}
