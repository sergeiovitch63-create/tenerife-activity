/**
 * VIP Activities Matching
 * 
 * Matches VIP activity titles from Atlantico catalog and stores their codes.
 * Provides functions to find VIP activities in the catalog with flexible title matching.
 */

import type { FullTour } from '@/lib/atlantico/catalog-types'

/**
 * VIP title patterns to match (case-insensitive, flexible)
 */
/**
 * VIP title patterns to match (case-insensitive, flexible)
 * 
 * List of 11 VIP activities expected:
 * 1. Astronomic Tour VIP
 * 2. Gomera VIP Tour
 * 3. Teide de Noche VIP
 * 4. Masca + Teide VIP
 * 5. La Laguna + Anaga VIP
 * 6. Vuelta a La Isla VIP
 * 7. Tenerife VIP Tour
 * 8. Teide VIP Tour
 * 9. VIP Ascent to the Peak on foot
 * 10. Teide Tour VIP
 * 11. (Additional VIP tours from catalog)
 */
const VIP_TITLE_PATTERNS = [
  // Astronomic Tour VIP
  'astronomic tour vip',
  'astronomic vip',
  'astronomical tour vip',
  'astronomical vip',
  // Gomera VIP Tour
  'gomera vip tour',
  'gomera vip',
  // Teide de Noche VIP
  'teide de noche vip',
  'teide noche vip',
  // Masca + Teide VIP
  'masca + teide vip',
  'masca teide vip',
  'masca y teide vip',
  // La Laguna + Anaga VIP
  'la laguna + anaga vip',
  'laguna anaga vip',
  'laguna y anaga vip',
  // Vuelta a La Isla VIP
  'vuelta a la isla vip',
  'vuelta isla vip',
  'vuelta isla completa vip',
  // Tenerife VIP Tour
  'tenerife vip tour',
  'tenerife vip',
  // Teide VIP Tour
  'teide vip tour',
  'teide tour vip',
  'teide vip',
  // VIP Ascent to the Peak on foot
  'ascenso pico teide a pie vip',
  'ascenso teide vip',
  'teide a pie vip',
  'ascent peak foot vip',
  'ascent pico foot vip',
  'ascent teide foot vip',
  // Additional patterns
  'tenerife it & marine',
  'tenerife it marine',
  'tenerife it and marine',
]

/**
 * VIP activity curation entry
 */
export interface VipActivityCuration {
  /** Original title to match */
  titlePattern: string
  /** Matched tour ID/code from catalog */
  tourId?: string
  /** Matched event code(s) from catalog (for loadLimits/prices) */
  eventCodes: string[]
  /** Generated slug for the activity */
  slug?: string
  /** Final title to display */
  displayTitle?: string
  /** Status of the match */
  status: 'found' | 'not_found' | 'multiple_matches'
  /** Raw catalog match data (for debugging) */
  matchData?: {
    tourId: string
    eventIds: string[]
    rawCode?: string
    rawId?: string
  }
}

/**
 * Normalize text for matching (lowercase, remove accents, remove extra spaces, remove "VIP" if needed)
 */
function normalizeText(text: string): string {
  // Remove accents/diacritics
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  
  // Remove extra spaces
  const cleaned = normalized.replace(/\s+/g, ' ')
  
  return cleaned
}

/**
 * Check if a text contains a pattern (flexible matching)
 */
function matchesPattern(text: string, pattern: string): boolean {
  const normalizedText = normalizeText(text)
  const normalizedPattern = normalizeText(pattern)
  
  // Remove "VIP" from pattern for more flexible matching
  const patternWithoutVip = normalizedPattern.replace(/\s*vip\s*/g, '').trim()
  const textWithoutVip = normalizedText.replace(/\s*vip\s*/g, '').trim()
  
  // Check if pattern is contained in text (or vice versa if pattern is longer)
  if (normalizedText.includes(normalizedPattern) || normalizedPattern.includes(normalizedText)) {
    return true
  }
  
  // Check without "VIP"
  if (textWithoutVip.includes(patternWithoutVip) || patternWithoutVip.includes(textWithoutVip)) {
    return true
  }
  
  // Check if main keywords match
  const patternKeywords = patternWithoutVip.split(/\s+/).filter(k => k.length > 2)
  const textKeywords = textWithoutVip.split(/\s+/).filter(k => k.length > 2)
  
  if (patternKeywords.length > 0 && textKeywords.length > 0) {
    const matchingKeywords = patternKeywords.filter(k => textKeywords.some(t => t.includes(k) || k.includes(t)))
    // If at least 70% of keywords match, consider it a match
    if (matchingKeywords.length >= Math.ceil(patternKeywords.length * 0.7)) {
      return true
    }
  }
  
  return false
}

/**
 * Extract event codes from a tour
 */
function extractEventCodes(tour: FullTour): string[] {
  const codes: string[] = []
  
  // Try to get code from tour itself
  if (tour.code) {
    codes.push(tour.code)
  }
  if (tour.id && tour.id !== tour.code) {
    codes.push(tour.id)
  }
  
  // Get codes from events
  for (const event of tour.events || []) {
    if (event.id && !codes.includes(event.id)) {
      codes.push(event.id)
    }
    // Also check raw data for event codes
    if (event.raw) {
      const rawCode = (event.raw as any).code || (event.raw as any).eventCode || (event.raw as any).id
      if (rawCode && !codes.includes(rawCode)) {
        codes.push(String(rawCode))
      }
    }
  }
  
  // Check tour raw data
  if (tour.raw) {
    const rawCode = (tour.raw as any).code || (tour.raw as any).id
    if (rawCode && !codes.includes(rawCode)) {
      codes.push(String(rawCode))
    }
  }
  
  return codes
}

/**
 * Generate slug from title
 */
function generateSlug(title: string): string {
  return normalizeText(title)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Find VIP activities in the catalog
 * 
 * Returns a map of title pattern -> curation entry
 */
export function findVipActivities(catalog: FullTour[]): Record<string, VipActivityCuration> {
  const result: Record<string, VipActivityCuration> = {}
  
  // Initialize all patterns as "not_found"
  for (const pattern of VIP_TITLE_PATTERNS) {
    result[pattern] = {
      titlePattern: pattern,
      eventCodes: [],
      status: 'not_found',
    }
  }
  
  // Find matches in catalog
  for (const pattern of VIP_TITLE_PATTERNS) {
    const matches: FullTour[] = []
    
    for (const tour of catalog) {
      const title = tour.displayTitle || tour.titleOverride || tour.title || ''
      
      if (matchesPattern(title, pattern)) {
        matches.push(tour)
      }
    }
    
    if (matches.length === 0) {
      // Keep as "not_found"
      continue
    }
    
    if (matches.length === 1) {
      // Single match - use it
      const tour = matches[0]
      const eventCodes = extractEventCodes(tour)
      
      result[pattern] = {
        titlePattern: pattern,
        tourId: tour.id,
        eventCodes,
        slug: tour.slug || generateSlug(pattern),
        displayTitle: tour.displayTitle || tour.titleOverride || tour.title,
        status: 'found',
        matchData: {
          tourId: tour.id,
          eventIds: tour.events.map(e => e.id),
          rawCode: tour.code,
          rawId: tour.id,
        },
      }
    } else {
      // Multiple matches - pick the best one (e.g., most relevant title)
      // For now, pick the first one but mark as "multiple_matches"
      const tour = matches[0]
      const eventCodes = extractEventCodes(tour)
      
      result[pattern] = {
        titlePattern: pattern,
        tourId: tour.id,
        eventCodes,
        slug: tour.slug || generateSlug(pattern),
        displayTitle: tour.displayTitle || tour.titleOverride || tour.title,
        status: 'multiple_matches',
        matchData: {
          tourId: tour.id,
          eventIds: tour.events.map(e => e.id),
          rawCode: tour.code,
          rawId: tour.id,
        },
      }
    }
  }
  
  return result
}

/**
 * Get VIP tours from catalog using matching
 * 
 * Returns tours that match VIP patterns, sorted by priority
 * Includes both 'found' and 'multiple_matches' status
 */
export function getVipToursFromCatalog(catalog: FullTour[]): FullTour[] {
  const matching = findVipActivities(catalog)
  const foundTourIds = new Set<string>()
  
  // Collect all unique tour IDs that matched (both 'found' and 'multiple_matches')
  for (const entry of Object.values(matching)) {
    if (entry.tourId && (entry.status === 'found' || entry.status === 'multiple_matches')) {
      foundTourIds.add(entry.tourId)
    }
  }
  
  // Return matching tours
  const vipTours = catalog.filter(tour => foundTourIds.has(tour.id))
  
  // Sort by priority (can be enhanced with custom ordering)
  return vipTours.sort((a, b) => {
    // Sort by title for now
    const aTitle = a.displayTitle || a.title
    const bTitle = b.displayTitle || b.title
    return aTitle.localeCompare(bTitle)
  })
}

/**
 * Check if a tour is a VIP activity (based on title matching)
 */
export function isVipActivity(tour: FullTour): boolean {
  const title = tour.displayTitle || tour.titleOverride || tour.title || ''
  return VIP_TITLE_PATTERNS.some(pattern => matchesPattern(title, pattern))
}

/**
 * Get matching report for debugging (DEV only)
 */
export function getVipMatchingReport(catalog: FullTour[]): {
  found: number
  notFound: number
  multipleMatches: number
  matches: Array<{
    titlePattern: string
    status: string
    tourId?: string
    slug?: string
    eventCodes: string[]
    displayTitle?: string
  }>
} {
  const matching = findVipActivities(catalog)
  const matches = Object.values(matching).map(entry => ({
    titlePattern: entry.titlePattern,
    status: entry.status,
    tourId: entry.tourId,
    slug: entry.slug,
    eventCodes: entry.eventCodes,
    displayTitle: entry.displayTitle,
  }))
  
  return {
    found: matches.filter(m => m.status === 'found').length,
    notFound: matches.filter(m => m.status === 'not_found').length,
    multipleMatches: matches.filter(m => m.status === 'multiple_matches').length,
    matches,
  }
}

