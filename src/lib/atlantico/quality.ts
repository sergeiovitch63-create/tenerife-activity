/**
 * Quality normalization and filtering for Atlantico catalog
 * 
 * Provides:
 * - normalizeTour: sanitize and normalize tour data
 * - normalizeEvent: sanitize and normalize event data
 * - evaluateTourQuality: determine if a tour is sellable
 */

import { sanitizeText, buildAtlanticoImageUrl } from './client'
import type { FullTour, FullEvent } from './catalog-types'

/**
 * Extract image from Atlantico raw data
 * Tries multiple possible field names used by Atlantico API
 * 
 * @param raw - Raw Atlantico data (groupDetails, eventDetails, etc.)
 * @returns Full image URL or null if not found
 */
export function extractAtlanticoImage(raw: any): string | null {
  if (!raw) return null

  // Try all possible field names in order of likelihood
  const candidate =
    raw.image ??
    raw.img ??
    raw.photo ??
    raw.picture ??
    raw.images?.[0] ??
    raw.gallery?.[0] ??
    raw.photos?.[0] ??
    raw.media?.[0]?.url ??
    raw.media?.[0] ??
    null

  // Return null if candidate is not a valid string
  if (!candidate || typeof candidate !== 'string' || candidate.trim().length === 0) {
    return null
  }

  // Build full URL using buildAtlanticoImageUrl
  return buildAtlanticoImageUrl(candidate)
}

/**
 * Quality evaluation result
 */
export interface QualityEvaluation {
  sellable: boolean
  reasons: string[]
}

/**
 * Normalize tour data
 */
export function normalizeTour(tour: FullTour): FullTour {
  // Sanitize title
  const title = sanitizeText(tour.title || '')
  const normalizedTitle = title.length > 0 ? title : 'Untitled Tour'

  // Sanitize description
  const description = sanitizeText(tour.description || '')

  // Normalize duration (ensure number or null)
  let duration: number | null = null
  if (typeof tour.duration === 'number' && tour.duration > 0) {
    duration = Math.round(tour.duration * 100) / 100 // Round to 2 decimals
  }

  // Normalize image - ALWAYS recalculate from raw if available (ignore tour.image initial)
  // This ensures image is always extracted correctly regardless of previous value
  let image: string | null = null

  // Try to extract from raw first (most reliable source)
  if (tour.raw) {
    // Try groupDetails first (most common location)
    if (tour.raw.groupDetails) {
      image = extractAtlanticoImage(tour.raw.groupDetails)
    }
    // Try groupList if groupDetails didn't have image
    if (!image && tour.raw.groupList) {
      image = extractAtlanticoImage(tour.raw.groupList)
    }
    // Try raw root level
    if (!image) {
      image = extractAtlanticoImage(tour.raw)
    }
  }
  
  // Try first event image if still no image
  if (!image && tour.events && tour.events.length > 0) {
    for (const event of tour.events) {
      if (event.raw) {
        image = extractAtlanticoImage(event.raw)
        if (image) break
      }
    }
  }
  
  // Fallback to tour.image if no raw data available (shouldn't happen after hydration, but safety)
  if (!image && tour.image) {
    // Ensure image is a valid URL
    image = buildAtlanticoImageUrl(tour.image) || tour.image
  }

  // Compute basePrice from events if not set
  let basePrice: number | null = tour.basePrice || null
  if ((basePrice === null || basePrice === 0) && tour.events && tour.events.length > 0) {
    let minPrice: number | null = null

    for (const event of tour.events) {
      // Check event.price.adult
      if (event.price && event.price.adult !== null && event.price.adult !== undefined && event.price.adult > 0) {
        const adultPrice = event.price.adult
        if (minPrice === null || adultPrice < minPrice) {
          minPrice = adultPrice
        }
      }

      // Check sessions prices
      if (event.availability && event.availability.sessionsByDate) {
        for (const sessions of Object.values(event.availability.sessionsByDate)) {
          if (Array.isArray(sessions)) {
            for (const session of sessions) {
              if (
                session.price !== undefined &&
                session.price !== null &&
                session.price > 0
              ) {
                if (minPrice === null || session.price < minPrice) {
                  minPrice = session.price
                }
              }
            }
          }
        }
      }
    }

    if (minPrice !== null) {
      basePrice = Math.round(minPrice * 100) / 100 // Round to 2 decimals
    }
  } else if (basePrice !== null && basePrice > 0) {
    basePrice = Math.round(basePrice * 100) / 100 // Round to 2 decimals
  }

  // Ensure currency
  const currency: 'EUR' = 'EUR'

  return {
    ...tour,
    title: normalizedTitle,
    description,
    duration,
    image,
    basePrice,
    currency,
  }
}

/**
 * Normalize event data
 */
export function normalizeEvent(event: FullEvent): FullEvent {
  // Sanitize title
  const title = event.title ? sanitizeText(event.title) : undefined

  // Normalize times (ensure array of strings)
  let times: string[] | undefined = undefined
  if (event.times && Array.isArray(event.times)) {
    times = event.times
      .map((t) => (typeof t === 'string' ? t.trim() : String(t).trim()))
      .filter((t) => t.length > 0)
    if (times.length === 0) {
      times = undefined
    }
  }

  // Normalize days (ensure array of strings)
  let days: string[] | undefined = undefined
  if (event.days && Array.isArray(event.days)) {
    days = event.days
      .map((d) => (typeof d === 'string' ? d.trim() : String(d).trim()))
      .filter((d) => d.length > 0)
    if (days.length === 0) {
      days = undefined
    }
  }

  // Compute event-level min price
  let eventMinPrice: number | null = null

  // Check event.price.adult
  if (event.price && event.price.adult !== null && event.price.adult !== undefined && event.price.adult > 0) {
    eventMinPrice = event.price.adult
  }

  // Check sessions prices
  if (event.availability && event.availability.sessionsByDate) {
    for (const sessions of Object.values(event.availability.sessionsByDate)) {
      if (Array.isArray(sessions)) {
        for (const session of sessions) {
          if (
            session.price !== undefined &&
            session.price !== null &&
            session.price > 0
          ) {
            if (eventMinPrice === null || session.price < eventMinPrice) {
              eventMinPrice = session.price
            }
          }
        }
      }
    }
  }

  return {
    ...event,
    title,
    times,
    days,
  }
}

/**
 * Evaluate tour quality and determine if it's sellable
 */
export function evaluateTourQuality(tour: FullTour): QualityEvaluation {
  const reasons: string[] = []

  // Rule 1: Title must be non-empty and >= 6 characters
  if (!tour.title || tour.title.trim().length < 6) {
    reasons.push('title_too_short_or_empty')
  }

  // Rule 2: Title must not match non-activity patterns
  const titleLower = tour.title.toLowerCase()
  
  // Pattern: area/zone/zones/north/south/east/west (geographic zones, not activities)
  if (/\b(area|zone|zones|north|south|east|west)\b/i.test(tour.title)) {
    reasons.push('title_contains_geographic_zone')
  }

  // Pattern: category/categoría (category listings, not activities)
  if (/\bcategory|categor(i|í)a|categoria|categoría\b/i.test(tour.title)) {
    reasons.push('title_contains_category_keyword')
  }

  // Note: "excursion" alone is OK (not dropped for this)

  // Rule 3: Must have at least one event with price > 0
  let hasPricedEvent = false
  if (tour.events && tour.events.length > 0) {
    for (const event of tour.events) {
      // Check event.price.adult
      if (event.price && event.price.adult !== null && event.price.adult !== undefined && event.price.adult > 0) {
        hasPricedEvent = true
        break
      }

      // Check sessions prices
      if (event.availability && event.availability.sessionsByDate) {
        for (const sessions of Object.values(event.availability.sessionsByDate)) {
          if (Array.isArray(sessions)) {
            for (const session of sessions) {
              if (
                session.price !== undefined &&
                session.price !== null &&
                session.price > 0
              ) {
                hasPricedEvent = true
                break
              }
            }
            if (hasPricedEvent) break
          }
        }
        if (hasPricedEvent) break
      }
    }
  }

  if (!hasPricedEvent) {
    // Also check basePrice as fallback
    if (!tour.basePrice || tour.basePrice <= 0) {
      reasons.push('no_price_available')
    }
  }

  // Rule 4: Image is preferred but not strictly required if price+events+times are OK
  // (We'll be lenient here - image null is acceptable if other criteria are met)
  if (!tour.image) {
    // Only add as info reason, not blocking
    // (UI has placeholder, so we accept it)
  }

  // Rule 5: Description empty + no highlights/raw useful (info only, not blocking)
  if (!tour.description || tour.description.trim().length === 0) {
    // Check if there's useful info in events
    let hasUsefulInfo = false
    if (tour.events && tour.events.length > 0) {
      for (const event of tour.events) {
        if (
          (event.times && event.times.length > 0) ||
          (event.days && event.days.length > 0) ||
          event.route ||
          (event.meetingPoints && event.meetingPoints.length > 0)
        ) {
          hasUsefulInfo = true
          break
        }
      }
    }
    if (!hasUsefulInfo) {
      // Info reason only, not blocking
      // reasons.push('no_description_or_useful_info')
    }
  }

  // Determine sellable: no blocking reasons
  const blockingReasons = reasons.filter(
    (r) =>
      r === 'title_too_short_or_empty' ||
      r === 'title_contains_geographic_zone' ||
      r === 'title_contains_category_keyword' ||
      r === 'no_price_available'
  )

  const sellable = blockingReasons.length === 0

  return {
    sellable,
    reasons,
  }
}

