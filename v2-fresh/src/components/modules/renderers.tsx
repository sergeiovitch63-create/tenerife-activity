/**
 * Client-side module renderer map.
 *
 * The registry (`src/lib/personalize/registry.ts`) holds only scorers so it
 * can run on the server. Once scoring is done, this map turns each surviving
 * `ModuleScore` into the right React card.
 *
 * Keeping this file separate lets the composition engine stay server-safe
 * while the interactive components (useState, onChange, onClick) live in
 * their own `'use client'` files.
 */

import type { ModuleRenderer } from '@/lib/personalize/types'
import { SunsetTimeAdapterCard } from './SunsetTimeAdapter'
import { DynamicPackingListCard } from './DynamicPackingList'
import { SuitabilityProfileCard } from './SuitabilityProfile'
import { WeatherAdvisoryCard } from './WeatherAdvisory'
import { HiddenGemBadgeCard } from './HiddenGemBadge'
import { MicroItineraryCard } from './MicroItinerary'
import { MultiBookingCard } from './MultiBooking'
import { NextAvailableCard } from './NextAvailable'
import { EventHighlightsCard } from './EventHighlights'
import { FamilyFitCard } from './FamilyFit'
import { PickupCoverageCard } from './PickupCoverage'
import { ValueStoryCard } from './ValueStory'
import { PhotoSpotsCard } from './PhotoSpots'
import { DepartureRhythmCard } from './DepartureRhythm'
import { GuideExperienceCard } from './GuideExperience'
import { CompanionFitCard } from './CompanionFit'
import { EffortMeterCard } from './EffortMeter'
import { SeasonalWindowCard } from './SeasonalWindow'
import { OperatorSignatureCard } from './OperatorSignature'
import { BucketListRankCard } from './BucketListRank'
import { FirstTimerTipsCard } from './FirstTimerTips'
import { TimeBudgetCard } from './TimeBudget'

export const MODULE_RENDERERS: Record<string, ModuleRenderer> = {
  'sunset-time-adapter': (p) => <SunsetTimeAdapterCard {...p} />,
  'dynamic-packing-list': (p) => <DynamicPackingListCard {...p} />,
  'micro-itinerary': (p) => <MicroItineraryCard {...p} />,
  'suitability-profile': (p) => <SuitabilityProfileCard {...p} />,
  'weather-advisory': (p) => <WeatherAdvisoryCard {...p} />,
  'hidden-gem-badge': (p) => <HiddenGemBadgeCard {...p} />,
  'multi-booking': (p) => <MultiBookingCard {...p} />,
  'next-available': (p) => <NextAvailableCard {...p} />,
  'event-highlights': (p) => <EventHighlightsCard {...p} />,
  'family-fit': (p) => <FamilyFitCard {...p} />,
  'pickup-coverage': (p) => <PickupCoverageCard {...p} />,
  'value-story': (p) => <ValueStoryCard {...p} />,
  'photo-spots': (p) => <PhotoSpotsCard {...p} />,
  'departure-rhythm': (p) => <DepartureRhythmCard {...p} />,
  'guide-experience': (p) => <GuideExperienceCard {...p} />,
  'companion-fit': (p) => <CompanionFitCard {...p} />,
  'effort-meter': (p) => <EffortMeterCard {...p} />,
  'seasonal-window': (p) => <SeasonalWindowCard {...p} />,
  'operator-signature': (p) => <OperatorSignatureCard {...p} />,
  'bucket-list-rank': (p) => <BucketListRankCard {...p} />,
  'first-timer-tips': (p) => <FirstTimerTipsCard {...p} />,
  'time-budget': (p) => <TimeBudgetCard {...p} />,
}
