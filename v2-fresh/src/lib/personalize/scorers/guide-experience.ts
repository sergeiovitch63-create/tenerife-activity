/**
 * Guide-Experience scorer — server-safe.
 *
 * Answers "will I be shown around, or do I figure it out myself?"
 *
 * Atlantico doesn't expose an `idiomas` / language array on events, but
 * it does emit two useful icon flags across the catalogue:
 *   - `interprete` (or `guide`) — a bilingual guide is included
 *   - `sin_guia`                 — self-guided / no host on board
 *
 * Combined with other contextual icons (`free_bus`, entry-only tickets)
 * we can classify the visit into four archetypes:
 *   - `guided`    — a multilingual guide accompanies the group
 *   - `escorted`  — transfer + entrance but no on-site guide ("drop-off")
 *   - `self`      — self-guided / ticket-only visit
 *   - `mixed`     — variants differ (e.g. guided AND self-guided options)
 *
 * The scorer also extracts a rough "spoken languages" hint from the
 * group's booking-language metadata when accessible, and always notes
 * whether the activity is language-light (diving, jetski, paragliding)
 * so even without a guide, language is not a barrier.
 *
 * Skipped when:
 *  - no guide/sin_guia signal anywhere AND the activity is language-light
 *    (the card would have nothing to add)
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type GuideArchetype = 'guided' | 'escorted' | 'self' | 'mixed'

export type GuideExperienceProps = {
  archetype: GuideArchetype
  /** True when at least one variant includes an interpreter / guide. */
  hasGuide: boolean
  /** True when at least one variant is explicitly self-guided. */
  hasSelfGuided: boolean
  /** True when a pickup / shuttle is part of at least one variant. */
  hasTransfer: boolean
  /** Lightweight claim when the activity doesn't rely on spoken language. */
  languageLight: boolean
  /** Count of distinct variants that have each trait — for the hero caption. */
  guidedVariants: number
  selfGuidedVariants: number
  totalVariants: number
  /**
   * Best-effort list of languages the booking flow supports for this
   * operator. Drawn from Atlantico booking-language constants — always
   * includes the big 6 we operate in. Used purely for the re-assurance
   * footer ("réservez en FR / EN / ES …").
   */
  bookingLanguages: BookingLanguage[]
}

export type BookingLanguage = 'fr' | 'en' | 'es' | 'de' | 'it' | 'ru'

/**
 * Activities that don't require spoken language to enjoy. We still
 * surface the module for these (so travellers don't wonder about
 * language barriers) but the tone is "no worries" rather than
 * "look for a guide in your language".
 */
const LANGUAGE_LIGHT_SETTINGS = new Set([
  'jetski', 'quad', 'buggy', 'bike', 'scooter',
  'paragliding', 'helicopter', 'flight',
  'diving', 'snorkel', 'surf', 'fishing',
  'waterpark', 'beach',
])

function hasIcon(icons: string[] | undefined, needle: string): boolean {
  if (!icons) return false
  return icons.some((i) => i.toLowerCase().includes(needle))
}

export function guideExperienceScorer(signals: ActivitySignals): ModuleScore | null {
  const events = signals._events ?? []
  const totalVariants = events.length

  let guidedVariants = 0
  let selfGuidedVariants = 0
  let hasTransfer = false

  for (const ev of events) {
    const icons = Array.isArray(ev.icons) ? ev.icons as string[] : []
    const hasGuideIcon =
      hasIcon(icons, 'interprete') ||
      hasIcon(icons, 'guide') && !hasIcon(icons, 'sin_guia')
    const hasSelfIcon = hasIcon(icons, 'sin_guia')
    const hasBus =
      hasIcon(icons, 'free_bus') ||
      hasIcon(icons, 'bus') ||
      hasIcon(icons, 'transfer') ||
      hasIcon(icons, 'pickup')

    if (hasGuideIcon) guidedVariants += 1
    if (hasSelfIcon) selfGuidedVariants += 1
    if (hasBus) hasTransfer = true
  }

  const hasGuide = guidedVariants > 0
  const hasSelfGuided = selfGuidedVariants > 0

  // Classify
  let archetype: GuideArchetype
  if (hasGuide && hasSelfGuided) archetype = 'mixed'
  else if (hasGuide) archetype = 'guided'
  else if (hasSelfGuided) archetype = 'self'
  else if (hasTransfer) archetype = 'escorted'
  else archetype = 'self' // default: assume self-guided if nothing signals a guide

  const languageLight = signals.setting.some((s) => LANGUAGE_LIGHT_SETTINGS.has(s))

  // Hard skip: no signal at all AND language-light → nothing to say.
  if (!hasGuide && !hasSelfGuided && !hasTransfer && languageLight) {
    return null
  }

  // Booking languages: the platform supports the big 6 regardless of the
  // individual operator — this is a sales-assurance line, not a contract.
  const bookingLanguages: BookingLanguage[] = ['fr', 'en', 'es', 'de', 'it', 'ru']

  // --- Scoring ---------------------------------------------------
  // Most useful when the answer isn't obvious: mixed (choice to make),
  // guided (language matters, good news), or escorted (bus but no host —
  // common point of confusion).
  let s = 44
  if (archetype === 'mixed') s += 16       // choice to make — high utility
  else if (archetype === 'guided') s += 10 // reassures language-worried visitors
  else if (archetype === 'escorted') s += 8 // clarifies a subtle case
  // self: neutral

  // When the activity is culture/gastro/wildlife, a guide makes a big
  // difference — boost so travellers know.
  if (
    hasGuide &&
    (signals.themes.has('culture') ||
     signals.themes.has('gastro') ||
     signals.themes.has('wildlife') ||
     signals.themes.has('nature'))
  ) {
    s += 6
  }

  // Multi-variant group with a guide-vs-self choice is genuinely
  // decision-shaping content.
  if (archetype === 'mixed' && totalVariants >= 3) s += 4

  // Language-light activity with no guide: low information value.
  if (languageLight && archetype === 'self' && !hasTransfer) s -= 8

  s = Math.max(0, Math.min(76, s))

  return {
    id: 'guide-experience',
    score: s,
    slot: 'right-inline',
    reason: `archetype=${archetype}, guide=${guidedVariants}/${totalVariants}, self=${selfGuidedVariants}, transfer=${hasTransfer}, langLight=${languageLight}`,
    props: {
      archetype,
      hasGuide,
      hasSelfGuided,
      hasTransfer,
      languageLight,
      guidedVariants,
      selfGuidedVariants,
      totalVariants,
      bookingLanguages,
    } satisfies GuideExperienceProps,
  }
}
