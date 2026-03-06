/**
 * GET /api/atlantico/tours/[lang]
 * 
 * Fetches tours catalog from Atlantico groupsList endpoint.
 * Returns normalized tour data for UI consumption.
 * 
 * Route parameters:
 * - lang: Language code (e.g., 'ENG', 'ESP')
 * 
 * Returns:
 * - total: Total number of tours
 * - items: Array of normalized tour objects
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'
import { normalizePriceFromRaw } from '@/lib/atlantico/price-normalize'
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
 * Normalize tour from groupsList response
 */
async function normalizeTour(raw: any): Promise<any> {
  // Extract code (used as slug)
  const code = raw.code || raw.id || ''
  const id = String(code || JSON.stringify(raw).substring(0, 50))

  // Extract title
  const title = raw.name || raw.title || ''

  // Extract description (keep HTML for detail page)
  const descriptionHtml = raw.desc || raw.description || ''
  
  // Extract excerpt (strip HTML, max 150 chars)
  const plainText = stripHtmlTags(descriptionHtml)
  const excerpt = plainText
    ? plainText.length > 150
      ? plainText.substring(0, 150).trim() + '...'
      : plainText.trim()
    : ''

  // Extract image
  const imageFilename = raw.image && typeof raw.image === 'string' && raw.image.trim().length > 0
    ? String(raw.image).trim()
    : null
  const imageUrl = imageFilename
    ? `${ATLANTICO_IMAGE_BASE_URL}/${encodeURIComponent(imageFilename)}`
    : null

  // Extract duration (convert to hours if needed)
  let durationHours: number | null = null
  if (raw.duration) {
    if (typeof raw.duration === 'number') {
      durationHours = raw.duration > 0 ? raw.duration : null
    } else if (typeof raw.duration === 'string') {
      const match = raw.duration.match(/(\d+(?:\.\d+)?)\s*h/i)
      if (match) {
        durationHours = parseFloat(match[1])
      }
    }
  }

  // Extract price from group first
  let fromPrice = normalizePriceFromRaw(raw)
  
  // Extract event codes for potential price lookup
  const { resolveEventIds } = await import('@/lib/atlantico/event-id-resolver')
  const eventCodes = resolveEventIds(raw)

  return {
    id,
    code,
    title,
    excerpt,
    descriptionHtml,
    imageUrl,
    durationHours,
    fromPrice,
    currency: 'EUR',
    eventCodes, // Keep for potential price lookup
    raw,
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

    // Fetch groupsList with page=-1 to get all tours
    const response = await fetchAtlantico(
      `/groupsList/${lang}/-1`,
      { revalidate: 3600 } // Cache 1 hour
    )

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch tours',
          message: `HTTP ${response.status}: ${response.statusText}`,
          total: 0,
          items: [],
        },
        { status: response.status }
      )
    }

    const rawGroups = await response.json()
    const groups = Array.isArray(rawGroups) ? rawGroups : []

    // Filter by allowed group IDs if configured
    const allowedGroupIds = getAllowedGroupIds()
    const filteredGroups = allowedGroupIds
      ? groups.filter((group: any) => {
          const groupId = String(group.id || group.code || '')
          return allowedGroupIds.includes(groupId)
        })
      : groups

    // Normalize tours
    let normalized = await Promise.all(filteredGroups.map(normalizeTour))

    // Concurrency limiter for eventDetails fetch
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

    const eventLimiter = new ConcurrencyLimiter(5)

    // For tours without price, try to fetch from first eventDetails (max 2 attempts)
    const toursNeedingPrice = normalized.filter((tour) => tour.fromPrice === null && tour.eventCodes.length > 0)
    
    if (toursNeedingPrice.length > 0) {
      const pricePromises = toursNeedingPrice.map((tour) =>
        eventLimiter.execute(async () => {
          // Try first eventCode, then second if needed (max 2)
          for (let i = 0; i < Math.min(2, tour.eventCodes.length); i++) {
            const eventCode = tour.eventCodes[i]
            if (!eventCode) continue

            try {
              const eventResponse = await fetchAtlantico(
                `/eventDetails/${eventCode}/${lang}`,
                { revalidate: 3600 }
              )

              if (eventResponse.ok) {
                const eventData = await eventResponse.json()
                const price = normalizePriceFromRaw(eventData)
                if (price !== null && price > 0) {
                  tour.fromPrice = price
                  return // Found price, stop trying
                }
              }
            } catch (err) {
              // Silent fail, try next eventCode
            }
          }
        })
      )

      await Promise.all(pricePromises)
    }

    const duration = Date.now() - startTime

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      const withPrice = normalized.filter((tour) => tour.fromPrice !== null).length
      const withoutPrice = normalized.length - withPrice
      
      console.log('[TOURS]', {
        lang,
        fetched: groups.length,
        filtered: filteredGroups.length,
        total: normalized.length,
        withPrice,
        withoutPrice,
        duration: `${duration}ms`,
      })

      if (normalized.length > 0) {
        const sample = normalized[0]
        const priceSource = sample.fromPrice !== null
          ? sample.raw.price || sample.raw.priceA || sample.raw.priceS || sample.raw.priceC
            ? 'group'
            : 'eventDetails'
          : 'none'
        
        console.log('[TOURS_SAMPLE]', {
          code: sample.code,
          title: sample.title,
          image: sample.imageUrl,
          fromPrice: sample.fromPrice,
          durationHours: sample.durationHours,
          priceSource,
          whyNull: sample.fromPrice === null
            ? `No price in group fields (price/priceA/priceS/priceC) and ${sample.eventCodes.length > 0 ? `eventDetails fetch failed or empty` : 'no eventCodes'}`
            : null,
        })
      }
    }

    return NextResponse.json(
      {
        total: normalized.length,
        items: normalized,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600', // 1 hour cache
        },
      }
    )
  } catch (error) {
    console.error('[TOURS] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch tours',
        message: error instanceof Error ? error.message : 'Unknown error',
        total: 0,
        items: [],
      },
      { status: 500 }
    )
  }
}

