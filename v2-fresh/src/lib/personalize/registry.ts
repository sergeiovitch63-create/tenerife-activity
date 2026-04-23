/**
 * Module registry — server-safe catalogue of every personalizable block.
 *
 * Holds ONLY the scorer + metadata. The render components live in
 * `src/components/modules/*` (client) and are looked up via
 * `MODULE_RENDERERS` at render time. This split lets the composition
 * engine run identically on server (e.g. debug endpoint, RSC) and
 * client (ActivityDetailLayout) without pulling React into the scoring
 * path.
 *
 * Adding a new module:
 * 1. Create a scorer in `src/lib/personalize/scorers/<id>.ts`
 * 2. Create the render component in `src/components/modules/<Name>.tsx`
 * 3. Register the scorer below AND wire the renderer in
 *    `src/components/modules/renderers.tsx`
 *
 * Scoring conventions:
 *   0   — never show (return null, don't push a 0 score)
 *   40  — default threshold; below this, module is dropped
 *   60  — clearly relevant, would add value
 *   80  — strongly relevant, should probably be shown
 *   100 — the defining feature of this activity, must be shown
 */

import type { ModuleDefinition } from './types'
import { sunsetTimeAdapterScorer } from './scorers/sunset-time-adapter'
import { dynamicPackingListScorer } from './scorers/dynamic-packing-list'
import { suitabilityProfileScorer } from './scorers/suitability-profile'
import { weatherAdvisoryScorer } from './scorers/weather-advisory'
import { hiddenGemBadgeScorer } from './scorers/hidden-gem-badge'
import { microItineraryScorer } from './scorers/micro-itinerary'
import { multiBookingScorer } from './scorers/multi-booking'
import { nextAvailableScorer } from './scorers/next-available'
import { eventHighlightsScorer } from './scorers/event-highlights'
import { familyFitScorer } from './scorers/family-fit'
import { pickupCoverageScorer } from './scorers/pickup-coverage'
import { valueStoryScorer } from './scorers/value-story'
import { photoSpotsScorer } from './scorers/photo-spots'
import { departureRhythmScorer } from './scorers/departure-rhythm'
import { guideExperienceScorer } from './scorers/guide-experience'
import { companionFitScorer } from './scorers/companion-fit'
import { effortMeterScorer } from './scorers/effort-meter'
import { seasonalWindowScorer } from './scorers/seasonal-window'
import { operatorSignatureScorer } from './scorers/operator-signature'
import { bucketListRankScorer } from './scorers/bucket-list-rank'
import { firstTimerTipsScorer } from './scorers/first-timer-tips'
import { timeBudgetScorer } from './scorers/time-budget'
import { calimaBannerScorer } from './scorers/calima-banner'

export const REGISTRY: ModuleDefinition[] = [
  {
    id: 'sunset-time-adapter',
    defaultSlot: 'left-primary',
    score: sunsetTimeAdapterScorer,
  },
  {
    id: 'dynamic-packing-list',
    defaultSlot: 'left-secondary',
    score: dynamicPackingListScorer,
  },
  {
    id: 'micro-itinerary',
    defaultSlot: 'left-secondary',
    score: microItineraryScorer,
  },
  {
    id: 'suitability-profile',
    defaultSlot: 'left-secondary',
    score: suitabilityProfileScorer,
  },
  {
    id: 'weather-advisory',
    defaultSlot: 'left-tertiary',
    score: weatherAdvisoryScorer,
  },
  {
    id: 'hidden-gem-badge',
    defaultSlot: 'left-tertiary',
    score: hiddenGemBadgeScorer,
  },
  {
    id: 'multi-booking',
    defaultSlot: 'right-inline',
    score: multiBookingScorer,
  },
  {
    id: 'next-available',
    defaultSlot: 'right-inline',
    score: nextAvailableScorer,
  },
  {
    id: 'event-highlights',
    defaultSlot: 'left-secondary',
    score: eventHighlightsScorer,
  },
  {
    id: 'family-fit',
    defaultSlot: 'left-secondary',
    score: familyFitScorer,
  },
  {
    id: 'pickup-coverage',
    defaultSlot: 'right-inline',
    score: pickupCoverageScorer,
  },
  {
    id: 'value-story',
    defaultSlot: 'right-inline',
    score: valueStoryScorer,
  },
  {
    id: 'photo-spots',
    defaultSlot: 'left-tertiary',
    score: photoSpotsScorer,
  },
  {
    id: 'departure-rhythm',
    defaultSlot: 'left-tertiary',
    score: departureRhythmScorer,
  },
  {
    id: 'guide-experience',
    defaultSlot: 'right-inline',
    score: guideExperienceScorer,
  },
  {
    id: 'companion-fit',
    defaultSlot: 'left-secondary',
    score: companionFitScorer,
  },
  {
    id: 'effort-meter',
    defaultSlot: 'left-tertiary',
    score: effortMeterScorer,
  },
  {
    id: 'seasonal-window',
    defaultSlot: 'left-tertiary',
    score: seasonalWindowScorer,
  },
  {
    id: 'operator-signature',
    defaultSlot: 'right-inline',
    score: operatorSignatureScorer,
  },
  {
    id: 'bucket-list-rank',
    defaultSlot: 'left-primary',
    score: bucketListRankScorer,
  },
  {
    id: 'first-timer-tips',
    defaultSlot: 'left-tertiary',
    score: firstTimerTipsScorer,
  },
  {
    id: 'time-budget',
    defaultSlot: 'right-inline',
    score: timeBudgetScorer,
  },
  {
    id: 'calima-banner',
    defaultSlot: 'banner',
    score: calimaBannerScorer,
  },
]

/**
 * Merge external module definitions (feature flags / experiments).
 */
export function withExtraModules(extras: ModuleDefinition[]): ModuleDefinition[] {
  return [...REGISTRY, ...extras]
}
