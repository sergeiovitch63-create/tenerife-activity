/**
 * TypeScript types for Full Catalog
 * 
 * UI-ready types for the Super Catalogue cache.
 */

/**
 * Full catalog structure
 */
export interface FullCatalog {
  updatedAt: string // ISO timestamp
  language: string // 'ENG', 'ESP', etc.
  itemCount: number
  items: FullTour[]
}

/**
 * Full tour (group) with all events
 */
export interface FullTour {
  id: string
  code?: string
  slug: string
  title: string
  description: string
  image: string | null
  duration: number | null // hours
  basePrice?: number | null
  currency: 'EUR'
  raw?: any // Raw Atlantico data (if includeRaw=true)
  events: FullEvent[]
  // Curation fields (added when merged=1)
  enabled?: boolean
  featured?: boolean
  priority?: number
  vibe_id?: string | null
  // Override fields (added when merged=1)
  imageOverrideUrl?: string | null
  titleOverride?: string | null
  shortDescriptionOverride?: string | null
  // Display fields (computed by API when merged=1)
  displayTitle?: string
  displayDescription?: string
  displayImage?: string | null
}

/**
 * Full event (option) with pricing and availability
 */
export interface FullEvent {
  id: string
  title?: string
  days?: string[] // ['Monday', 'Tuesday', ...]
  times?: string[] // ['09:00', '14:00', ...]
  icons?: string[] // Icon identifiers
  route?: string // Route description
  meetingPoints?: string[] // Meeting point descriptions
  price?: EventPrice
  availability?: EventAvailability
  raw?: any // Raw Atlantico data (if includeRaw=true)
  rawError?: string // Error message if fetch failed (DEV only)
}

/**
 * Event price for a specific date
 */
export interface EventPrice {
  date: string // YYYY-MM-DD
  office?: string
  adult?: number | null
  child?: number | null
  infant?: number | null
  raw?: any // Raw price response (if includeRaw=true)
}

/**
 * Event availability for a month
 */
export interface EventAvailability {
  month: string // YYYY-MM-01
  sessionsByDate: Record<string, EventSession[]> // key = YYYY-MM-DD
  raw?: any // Raw limits response (if includeRaw=true)
}

/**
 * Event session (time slot) for a specific date
 */
export interface EventSession {
  time?: string // '09:00' (optional if no specific time)
  available?: number // Remaining slots
  price?: number // Price for this session
  sessionId?: string // Session identifier
  raw?: any // Raw session data (if includeRaw=true)
}

/**
 * Core catalog (stable data: groups, groupDetails, eventDetails)
 * No prices, no limits
 */
export interface CoreCatalog {
  updatedAt: string // ISO timestamp
  language: string // 'ENG', 'ESP', etc.
  itemCount: number
  items: CoreTour[]
}

/**
 * Core tour (without prices/availability)
 */
export interface CoreTour {
  id: string
  code?: string
  slug: string
  title: string
  description: string
  image: string | null
  duration: number | null // hours
  basePrice?: number | null // May be computed from dynamic data later
  currency: 'EUR'
  raw?: any // Raw Atlantico data (if includeRaw=true)
  events: CoreEvent[]
  // Curation fields (added when merged=1)
  enabled?: boolean
  featured?: boolean
  priority?: number
  vibe_id?: string | null
  // Override fields (added when merged=1)
  imageOverrideUrl?: string | null
  titleOverride?: string | null
  shortDescriptionOverride?: string | null
  // Display fields (computed by API when merged=1)
  displayTitle?: string
  displayDescription?: string
  displayImage?: string | null
}

/**
 * Core event (without prices/availability)
 */
export interface CoreEvent {
  id: string
  title?: string
  days?: string[] // ['Monday', 'Tuesday', ...]
  times?: string[] // ['09:00', '14:00', ...]
  icons?: string[] // Icon identifiers
  route?: string // Route description
  meetingPoints?: string[] // Meeting point descriptions
  raw?: any // Raw Atlantico data (if includeRaw=true)
  rawError?: string // Error message if fetch failed (DEV only)
}

/**
 * Dynamic catalog (prices and availability only)
 * Indexed by tourId -> eventId
 */
export interface DynamicCatalog {
  updatedAt: string // ISO timestamp
  language: string // 'ENG', 'ESP', etc.
  priceDate?: string // YYYY-MM-DD (date used for prices)
  limitsMonth?: string // YYYY-MM-01 (month for availability)
  office?: string // Office code used for prices
  // Map: tourId -> eventId -> DynamicEventData
  data: Record<string, Record<string, DynamicEventData>>
}

/**
 * Dynamic event data (prices and availability only)
 */
export interface DynamicEventData {
  eventId: string
  tourId: string
  price?: EventPrice
  availability?: EventAvailability
}

