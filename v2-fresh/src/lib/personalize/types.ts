/**
 * Activity page personalization — core types
 *
 * The system takes an Atlantico activity and composes a page from a registry
 * of optional UI modules. Each module scores itself against the activity's
 * signals; top-scoring modules are rendered in score order.
 *
 * Key design choice: personalization is PER ACTIVITY, not per category.
 * A module's relevance is computed from the specific activity's data
 * (description keywords, coords, duration, icons, flags) — not a coarse tag.
 */

import type { AtlanticoGroup, AtlanticoEvent } from '@/lib/atlantico/types'

/**
 * Raw signals extracted from a single activity. Everything a scorer needs
 * to make a decision, pre-computed once per activity.
 */
export type ActivitySignals = {
  // Core metadata
  code: string
  name: string
  category: string | null
  durationMinutes: number | null
  priceTier: 'low' | 'mid' | 'high' | 'premium'

  // Location
  lat: number | null
  lng: number | null
  zone: GeoZone | null
  altitude: AltitudeBand // 'sea' | 'low' | 'mid' | 'high' (rough estimate)

  // Demographics
  hasChildAge: boolean
  minChildAge: number | null
  maxChildAge: number | null
  hasInfantAge: boolean
  isFamilyFriendly: boolean

  // Experience profile (derived from keywords + icons)
  themes: ThemeSet // Set of high-level vibes
  intensity: 'relaxed' | 'moderate' | 'adrenaline'
  setting: Setting[] // e.g. ['water', 'boat', 'sunset']

  // Environmental sensitivity
  weatherSensitive: boolean
  windSensitive: boolean
  waveSensitive: boolean
  visibilitySensitive: boolean
  altitudeSensitive: boolean
  calimaSensitive: boolean

  // Content richness
  hasVideo: boolean
  imageCount: number
  hasDetailedRoute: boolean
  hasFaq: boolean
  hasMultipleEvents: boolean

  // Raw keyword buckets for fine-grained scoring
  keywords: Set<string>

  // Supabase-backed aggregates (reviews) — null when feature disabled
  // or no published reviews exist for this activity. Populated by the
  // server page before `extractSignals` runs so the scoring stays pure.
  reviewsMeta: ReviewsMeta | null

  // Raw inputs for scorers that need to dig deeper
  _group: AtlanticoGroup
  _events: AtlanticoEvent[]
}

/** Aggregate over published reviews — lives in signals because scorers read it. */
export type ReviewsMeta = {
  count: number
  avgRating: number
  verifiedCount: number
  lastReviewAt: string | null
}

export type GeoZone =
  | 'south'      // Costa Adeje, Los Cristianos, Playa de las Americas
  | 'north'      // Puerto de la Cruz, La Orotava, La Laguna
  | 'west'       // Los Gigantes, Masca, Santiago del Teide
  | 'center'     // Teide, Vilaflor, Las Cañadas
  | 'east'       // Santa Cruz, Anaga
  | 'ocean'      // Open-sea activities
  | 'unknown'

export type AltitudeBand = 'sea' | 'low' | 'mid' | 'high'

export type Theme =
  | 'adrenaline'
  | 'family'
  | 'romantic'
  | 'nature'
  | 'gastro'
  | 'culture'
  | 'wildlife'
  | 'water'
  | 'mountain'
  | 'wellness'
  | 'party'
  | 'stargazing'
  | 'photography'

export type ThemeSet = Set<Theme>

export type Setting =
  | 'boat' | 'catamaran' | 'yacht' | 'jetski'
  | 'diving' | 'snorkel' | 'surf' | 'fishing'
  | 'hiking' | 'climbing' | 'caving'
  | 'paragliding' | 'helicopter' | 'flight'
  | 'quad' | 'buggy' | 'bike' | 'scooter'
  | 'park' | 'zoo' | 'aquarium' | 'waterpark'
  | 'sunset' | 'sunrise' | 'night'
  | 'winery' | 'restaurant' | 'tasting'
  | 'museum' | 'monument' | 'village'
  | 'whale' | 'dolphin' | 'turtle'
  | 'volcano' | 'beach' | 'mirador' | 'forest'

// =====================================================================
// Module system
// =====================================================================

export type ModuleId = string // stable slug, e.g. "sunset-time-adapter"

export type ModuleSlot =
  | 'left-primary'    // Top of the main column, after hero
  | 'left-secondary'  // Mid-column, between description and reviews
  | 'left-tertiary'   // Lower, before related activities
  | 'right-inline'    // Inside the booking sidebar
  | 'banner'          // Full-width advisory (e.g. calima warning)

export type ModuleScore = {
  id: ModuleId
  /** 0-100. Modules below threshold are dropped. */
  score: number
  /** Slot where this module wants to render. */
  slot: ModuleSlot
  /** Optional data this module pre-computed for its own render. */
  props?: Record<string, unknown>
  /** Human-readable reason the module was selected (useful for debugging). */
  reason?: string
}

export type ModuleScorer = (signals: ActivitySignals) => ModuleScore | null

export type ModuleDefinition = {
  id: ModuleId
  /** Default slot if the scorer doesn't override. */
  defaultSlot: ModuleSlot
  /** Pure scoring function — MUST be deterministic for the same input. */
  score: ModuleScorer
  /** Optional: forbid this module via manual override. */
  overridable?: boolean
}

/**
 * Render props passed to every module renderer. Renderers live in client
 * components (they use hooks/handlers); scorers live in server-safe files.
 * The registry holds only scorers; a client-side renderer map bridges the
 * two so the composition layer can run on both server and client.
 */
export type ModuleRendererProps = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export type ModuleRenderer = (props: ModuleRendererProps) => React.ReactNode

export type ComposedPage = {
  modulesBySlot: Record<ModuleSlot, ModuleScore[]>
  allScores: ModuleScore[]
  signals: ActivitySignals
}

export type ComposeOptions = {
  /** Minimum score for a module to be included. Default 40. */
  threshold?: number
  /** Max modules per slot. Default 3 (but banner = 1). */
  maxPerSlot?: Partial<Record<ModuleSlot, number>>
  /** Force include these module IDs regardless of score. */
  forceInclude?: ModuleId[]
  /** Force exclude these module IDs. */
  forceExclude?: ModuleId[]
}
