/**
 * GET /api/atlantico/tours-enriched/[lang]
 * 
 * Fetches enriched tours catalog combining groupsList + groupDetails for each tour.
 * Includes real pricing from loadLimits + loadPrices.
 * 
 * Route parameters:
 * - lang: Language code (e.g., 'ENG', 'ESP')
 * 
 * Returns:
 * - total: Total number of tours
 * - items: Array of enriched tour objects with pricing
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'
import { computeCheapestPrice, getPriceWithFallback } from '@/lib/atlantico/pricing'
import { normalizePriceFromRaw } from '@/lib/atlantico/price-normalize'
import { firstDayOfMonth } from '@/lib/atlantico/date'
import { resolveEventIds } from '@/lib/atlantico/event-id-resolver'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'

/**
 * Atlantico image base URL
 */
const ATLANTICO_IMAGE_BASE_URL = 'https://static.atlantico-excursiones.com/images'

/**
 * Get list of allowed group IDs from env
 */
function getAllowedGroupIds(): string[] | null {
  const envGroups = process.env.ATLANTICO_GROUP_IDS
  if (envGroups) {
    const ids = envGroups
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .filter((id) => /^\d+$/.test(id))
    return ids.length > 0 ? Array.from(new Set(ids)) : null
  }
  return null
}

/**
 * Strip HTML tags from string and decode HTML entities
 */
function stripHtmlTags(html: string): string {
  if (!html || typeof html !== 'string') return ''
  // First decode HTML entities, then strip HTML tags
  const decoded = decodeTextFromApi(html)
  return decoded.replace(/<[^>]*>/g, '').trim()
}

/**
 * Extract event codes from ids field
 */
// Removed local extractEventCodes - using resolveEventIds from event-id-resolver

/**
 * Concurrency limiter
 */
class ConcurrencyLimiter {
  private running = 0
  private queue: Array<() => Promise<void>> = []

  constructor(private maxConcurrent: number) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.running++
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.running--
          if (this.queue.length > 0) {
            const next = this.queue.shift()!
            next()
          }
        }
      }

      if (this.running < this.maxConcurrent) {
        run()
      } else {
        this.queue.push(run)
      }
    })
  }
}

const groupDetailsLimiter = new ConcurrencyLimiter(5)

/**
 * Normalize enriched tour from groupsList + groupDetails
 */
function normalizeEnrichedTour(
  groupListRaw: any,
  groupDetailsRaw: any,
  pricing: { fromPrice: number | null; nextDate: string | null }
): any {
  // Use groupDetails if available, otherwise fallback to groupList
  const raw = groupDetailsRaw || groupListRaw

  // Extract code (used as slug)
  const code = raw.code || raw.id || ''
  const id = String(code || JSON.stringify(raw).substring(0, 50))

  // Extract title (prefer groupDetails)
  const title = (groupDetailsRaw?.name || groupDetailsRaw?.title) || (groupListRaw?.name || groupListRaw?.title) || ''

  // Extract description HTML (prefer groupDetails)
  const descriptionHtml = (groupDetailsRaw?.desc || groupDetailsRaw?.description) || (groupListRaw?.desc || groupListRaw?.description) || ''
  
  // Extract excerpt (strip HTML, max 160 chars)
  const plainText = stripHtmlTags(descriptionHtml)
  const excerpt = plainText
    ? plainText.length > 160
      ? plainText.substring(0, 160).trim() + '...'
      : plainText.trim()
    : ''

  // Extract image (prefer groupDetails)
  const imageFilename = (groupDetailsRaw?.image || groupListRaw?.image) && typeof (groupDetailsRaw?.image || groupListRaw?.image) === 'string' && String(groupDetailsRaw?.image || groupListRaw?.image).trim().length > 0
    ? String(groupDetailsRaw?.image || groupListRaw?.image).trim()
    : null
  const image = imageFilename
    ? `${ATLANTICO_IMAGE_BASE_URL}/${encodeURIComponent(imageFilename)}`
    : null

  // Extract duration (prefer groupDetails)
  let duration: number | null = null
  const durationRaw = groupDetailsRaw?.duration || groupListRaw?.duration
  if (durationRaw) {
    if (typeof durationRaw === 'number') {
      duration = durationRaw > 0 ? durationRaw : null
    } else if (typeof durationRaw === 'string') {
      const match = durationRaw.match(/(\d+(?:\.\d+)?)\s*h/i)
      if (match) {
        duration = parseFloat(match[1])
      }
    }
  }

  // Extract event codes from groupDetails
  const eventCodes = resolveEventIds(groupDetailsRaw || groupListRaw)

  return {
    code,
    title,
    descriptionHtml,
    excerpt,
    image,
    duration,
    eventCodes,
    fromPrice: pricing.fromPrice,
    nextDate: pricing.nextDate,
    currency: 'EUR',
    _raw: {
      groupList: groupListRaw,
      groupDetails: groupDetailsRaw,
    },
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  const startTime = Date.now()

  try {
    const { lang } = await params
    const config = getAtlanticoConfig()

    // Check configuration
    if (!config.isValid) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: config.error || 'Atlantico API configuration is invalid',
          total: 0,
          items: [],
        },
        { status: 500 }
      )
    }

    // Validate lang
    if (!lang || typeof lang !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'lang is required',
          total: 0,
          items: [],
        },
        { status: 400 }
      )
    }

    // Get origin for internal API calls
    const hdrs = headers()
    const host = hdrs.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    const origin = envBase ? envBase : `${protocol}://${host}`

    // Fetch groupsList with page=-1 to get all tours
    const groupsListResponse = await fetchAtlantico(
      `/groupsList/${lang}/-1`,
      { revalidate: 3600 } // Cache 1 hour
    )

    if (!groupsListResponse.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch tours',
          message: `HTTP ${groupsListResponse.status}: ${groupsListResponse.statusText}`,
          total: 0,
          items: [],
        },
        { status: groupsListResponse.status }
      )
    }

    const rawGroups = await groupsListResponse.json()
    const groups = Array.isArray(rawGroups) ? rawGroups : []

    // Filter by allowed group IDs if configured
    const allowedGroupIds = getAllowedGroupIds()
    const filteredGroups = allowedGroupIds
      ? groups.filter((group: any) => {
          const groupId = String(group.id || group.code || '')
          return allowedGroupIds.includes(groupId)
        })
      : groups

    // Fetch groupDetails for each tour (with concurrency limit)
    const enrichedTours = await Promise.all(
      filteredGroups.map((group: any) =>
        groupDetailsLimiter.execute(async () => {
          const tourCode = String(group.code || group.id || '')
          if (!tourCode) {
            return null
          }

          // Fetch groupDetails
          let groupDetails: any = null
          try {
            const groupDetailsResponse = await fetchAtlantico(
              `/groupDetails/${tourCode}/${lang}`,
              { revalidate: 3600 }
            )
            if (groupDetailsResponse.ok) {
              groupDetails = await groupDetailsResponse.json()
            }
          } catch (error) {
            // Silent fail, use groupList data only
          }

          // Extract event codes
          const eventCodes = resolveEventIds(groupDetails || group)

          // Compute pricing (cheapest across all event codes)
          let pricing = { fromPrice: null as number | null, nextDate: null as string | null }
          if (eventCodes.length > 0) {
            const cheapest = await computeCheapestPrice(eventCodes, lang, origin)
            if (cheapest) {
              pricing = {
                fromPrice: cheapest.fromPrice,
                nextDate: cheapest.nextDate,
              }
            } else {
              // Fallback: try to get price from groupDetails raw fields
              const fallbackPrice = normalizePriceFromRaw(groupDetails || group)
              if (fallbackPrice !== null && fallbackPrice > 0) {
                pricing.fromPrice = fallbackPrice
              }
            }
          } else {
            // No event codes, try group price fields
            const fallbackPrice = normalizePriceFromRaw(groupDetails || group)
            if (fallbackPrice !== null && fallbackPrice > 0) {
              pricing.fromPrice = fallbackPrice
            }
          }

          return normalizeEnrichedTour(group, groupDetails, pricing)
        })
      )
    )

    const validTours = enrichedTours.filter((tour): tour is any => tour !== null)

    const duration = Date.now() - startTime

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      const withEventCodes = validTours.filter((t) => t.eventCodes.length > 0).length
      const withPrice = validTours.filter((t) => t.fromPrice !== null).length
      
      console.log('[TOURS_ENRICHED]', {
        lang,
        fetched: groups.length,
        filtered: filteredGroups.length,
        toursTotal: validTours.length,
        withEventCodes,
        withPrice,
        durationMs: duration,
      })
    }

    return NextResponse.json(
      {
        total: validTours.length,
        items: validTours,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300', // 10 min cache
        },
      }
    )
  } catch (error) {
    console.error('[TOURS_ENRICHED] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch enriched tours',
        message: error instanceof Error ? error.message : 'Unknown error',
        total: 0,
        items: [],
      },
      { status: 500 }
    )
  }
}





