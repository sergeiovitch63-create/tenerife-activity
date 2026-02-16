/**
 * GET /api/catalog
 * 
 * Returns normalized catalog of experiences from Atlantico repository.
 * Filters out non-bookable items (zones, areas, transport categories).
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { experienceRepository } from '@/config/repositories'
import { extractImageUrls } from '@/lib/atlantico/images.server'
import type { Experience } from '@/core/entities/experience'

/**
 * Normalized catalog item
 */
export type CatalogItem = {
  id: string
  title: string
  description?: string
  image?: string | null
  price?: number | null
  currency?: string | null
  vibeId?: string | null
  isBookable: boolean
  rawType?: string | null
}

/**
 * Extract image URL from experience
 */
function extractImage(exp: Experience): string | null {
  // Priority 1: imageUrl
  if (exp.imageUrl && typeof exp.imageUrl === 'string' && exp.imageUrl.trim().length > 0) {
    return exp.imageUrl.trim()
  }

  // Priority 2: imageUrls array
  if (Array.isArray(exp.imageUrls) && exp.imageUrls.length > 0) {
    const first = exp.imageUrls[0]
    if (typeof first === 'string' && first.trim().length > 0) {
      return first.trim()
    }
  }

  // Priority 3: Extract from raw data
  const raw = (exp as any)._raw
  if (raw && typeof raw === 'object') {
    // Try direct image field
    if (raw.image && typeof raw.image === 'string' && raw.image.trim().length > 0) {
      return raw.image.trim()
    }

    // Try images array
    if (Array.isArray(raw.images) && raw.images.length > 0) {
      const first = raw.images[0]
      if (typeof first === 'string' && first.trim().length > 0) {
        return first.trim()
      }
    }

    // Try media array
    if (Array.isArray(raw.media) && raw.media.length > 0) {
      const first = raw.media[0]
      if (typeof first === 'string' && first.trim().length > 0) {
        return first.trim()
      }
      if (first && typeof first === 'object') {
        const url = first.url || first.src || first.image
        if (typeof url === 'string' && url.trim().length > 0) {
          return url.trim()
        }
      }
    }

    // Try _raw nested
    if (raw._raw && typeof raw._raw === 'object') {
      if (raw._raw.image && typeof raw._raw.image === 'string' && raw._raw.image.trim().length > 0) {
        return raw._raw.image.trim()
      }
      if (Array.isArray(raw._raw.images) && raw._raw.images.length > 0) {
        const first = raw._raw.images[0]
        if (typeof first === 'string' && first.trim().length > 0) {
          return first.trim()
        }
      }
    }

    // Use extractImageUrls helper as last resort
    const urls = extractImageUrls(raw, 'https://static.atlantico-excursiones.com/images')
    if (urls.length > 0) {
      return urls[0]
    }
  }

  return null
}

/**
 * Extract raw type/category from experience
 */
function extractRawType(exp: Experience): string | null {
  const raw = (exp as any)._raw
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const category =
    raw.category ||
    raw.categoryCode ||
    raw.classification ||
    raw.classificationCode ||
    raw.type ||
    raw._raw?.category ||
    raw._raw?.categoryCode ||
    null

  return typeof category === 'string' ? category : null
}

/**
 * Check if experience is bookable
 */
function isBookable(exp: Experience): boolean {
  // Must have id and title
  if (!exp.id || !exp.title || exp.title.trim().length === 0) {
    return false
  }

  const titleLower = exp.title.toLowerCase()
  const raw = (exp as any)._raw
  const rawType = extractRawType(exp)

  // Exclude if title contains area/zone/south/north AND no price AND no image
  const isAreaZone =
    (titleLower.includes('area') ||
      titleLower.includes('zone') ||
      titleLower.includes('south') ||
      titleLower.includes('north')) &&
    (!exp.price || exp.price === 0) &&
    !extractImage(exp)

  if (isAreaZone) {
    return false
  }

  // Exclude if raw indicates non-sellable category/zone/transport
  if (rawType) {
    const typeLower = rawType.toLowerCase()
    if (
      typeLower.includes('zone') ||
      typeLower.includes('area') ||
      typeLower.includes('transport') ||
      typeLower.includes('category')
    ) {
      // Only exclude if it's clearly not sellable (no price, no image)
      if ((!exp.price || exp.price === 0) && !extractImage(exp)) {
        return false
      }
    }
  }

  // Check raw data for explicit non-sellable flags
  if (raw && typeof raw === 'object') {
    const sellable = raw.sellable ?? raw.bookable ?? raw.available
    if (sellable === false) {
      return false
    }
  }

  return true
}

/**
 * Normalize experience to catalog item
 */
function normalizeExperience(exp: Experience): CatalogItem {
  // Title: use title if non-empty, else fallback to description, else "Untitled"
  let title = 'Untitled'
  if (exp.title && typeof exp.title === 'string' && exp.title.trim().length > 0) {
    title = exp.title.trim()
  } else if (exp.description && typeof exp.description === 'string' && exp.description.trim().length > 0) {
    // Use first 100 chars of description as fallback
    title = exp.description.trim().substring(0, 100)
  } else if (exp.shortDescription && typeof exp.shortDescription === 'string' && exp.shortDescription.trim().length > 0) {
    title = exp.shortDescription.trim().substring(0, 100)
  }

  // Description: use description or shortDescription
  const description =
    (exp.description && typeof exp.description === 'string' && exp.description.trim().length > 0
      ? exp.description.trim()
      : exp.shortDescription && typeof exp.shortDescription === 'string' && exp.shortDescription.trim().length > 0
        ? exp.shortDescription.trim()
        : undefined) || undefined

  // Image: extract from various sources
  const image = extractImage(exp)

  // Price/Currency: null if price is 0 or null
  const price = exp.price && exp.price > 0 ? exp.price : null
  const currency = price ? exp.currency || 'EUR' : null

  // Vibe ID
  const vibeId = exp.vibeId || null

  // Raw type
  const rawType = extractRawType(exp)

  // Is bookable
  const isBookableValue = isBookable(exp)

  return {
    id: exp.id,
    title,
    description,
    image,
    price,
    currency,
    vibeId,
    isBookable: isBookableValue,
    rawType,
  }
}

export async function GET(request: NextRequest) {
  try {
    // Fetch all experiences
    const experiences = await experienceRepository.findAll()

    const beforeCount = experiences.length
    const rejected: Array<{ id: string; title: string; reason: string }> = []

    // Normalize and filter
    const catalog: CatalogItem[] = []
    for (const exp of experiences) {
      const normalized = normalizeExperience(exp)

      if (normalized.isBookable) {
        catalog.push(normalized)
      } else {
        // Determine rejection reason
        let reason = 'Unknown'
        if (!exp.id || !exp.title || exp.title.trim().length === 0) {
          reason = 'Missing id or title'
        } else {
          const titleLower = exp.title.toLowerCase()
          const isAreaZone =
            (titleLower.includes('area') ||
              titleLower.includes('zone') ||
              titleLower.includes('south') ||
              titleLower.includes('north')) &&
            (!exp.price || exp.price === 0) &&
            !extractImage(exp)
          if (isAreaZone) {
            reason = 'Area/zone without price/image'
          } else {
            const rawType = extractRawType(exp)
            if (rawType) {
              reason = `Non-sellable type: ${rawType}`
            } else {
              reason = 'No price/image and non-sellable'
            }
          }
        }

        if (rejected.length < 10) {
          rejected.push({
            id: normalized.id,
            title: normalized.title,
            reason,
          })
        }
      }
    }

    const afterCount = catalog.length

    // DEV logs
    if (process.env.NODE_ENV === 'development') {
      console.log('[CATALOG]', {
        before: beforeCount,
        after: afterCount,
        rejected: rejected.length,
        examples: rejected.slice(0, 5),
      })
    }

    return NextResponse.json(catalog)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[CATALOG] Error:', error)
    }
    return NextResponse.json(
      {
        error: 'Failed to fetch catalog',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}






















