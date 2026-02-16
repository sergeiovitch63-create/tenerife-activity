/**
 * GET /api/atlantico/tours-pricing/[lang]
 * 
 * Calculates real pricing for tours by fetching availability and prices.
 * Returns pricing snapshot for catalog display.
 * 
 * Route parameters:
 * - lang: Language code (e.g., 'ENG', 'ESP')
 * 
 * Query parameters:
 * - limit: Number of tours to process (default: 24)
 * - offset: Offset for pagination (default: 0)
 * 
 * Returns:
 * - lang, generatedAt, items: Array<{ code, eventCodeUsed, nextDate, fromPrice }>
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { firstDayOfMonth } from '@/lib/atlantico/date'
import { pickNextAvailableDateFromLimits } from '@/lib/atlantico/limits'
import { parseLoadPricesResponse } from '@/lib/atlantico/prices'

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

const limiter = new ConcurrencyLimiter(5) // Max 5 concurrent requests

/**
 * Extract event codes from tour raw data
 */
function extractEventCodes(tour: any): string[] {
  const codes: string[] = []

  // Try raw.ids (string or array)
  if (tour.raw) {
    const ids = tour.raw.ids
    if (typeof ids === 'string') {
      // Format: ",1317,104," or "1317,104"
      const parts = ids.split(',').map((p) => p.trim()).filter((p) => p.length > 0 && /^\d+$/.test(p))
      codes.push(...parts)
    } else if (Array.isArray(ids)) {
      codes.push(...ids.filter((id): id is string => typeof id === 'string' && /^\d+$/.test(String(id))))
    }
  }

  return codes
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  const startTime = Date.now()

  try {
    const { lang } = await params
    const { searchParams } = request.nextUrl
    const limit = parseInt(searchParams.get('limit') || '24', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build absolute URL for internal API fetch
    const hdrs = headers()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    const origin = envBase ? envBase : `${protocol}://${host}`

    // Fetch tours
    const toursResponse = await fetch(`${origin}/api/atlantico/tours/${lang}`, {
      next: { revalidate: 3600 },
    })

    if (!toursResponse.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch tours',
          message: `HTTP ${toursResponse.status}`,
          lang,
          generatedAt: new Date().toISOString(),
          items: [],
        },
        { status: toursResponse.status }
      )
    }

    const toursData = await toursResponse.json()
    const tours = Array.isArray(toursData.items) ? toursData.items : []
    const paginatedTours = tours.slice(offset, offset + limit)

    // Process each tour to get pricing
    const pricingPromises = paginatedTours.map((tour: any) =>
      limiter.execute(async () => {
        const eventCodes = extractEventCodes(tour)
        const eventCodeUsed = eventCodes.length > 0 ? eventCodes[0] : null

        if (!eventCodeUsed) {
          return {
            code: tour.code || tour.id,
            eventCodeUsed: null,
            nextDate: null,
            fromPrice: null,
          }
        }

        // Fetch availability for current month
        const currentMonth = firstDayOfMonth(new Date())
        const controller1 = new AbortController()
        const timeout1 = setTimeout(() => controller1.abort(), 4000)

        try {
          const availabilityResponse = await fetch(
            `${origin}/api/atlantico/availability/${eventCodeUsed}/${lang}?date=${currentMonth}`,
            {
              signal: controller1.signal,
              next: { revalidate: 60 },
            }
          )

          clearTimeout(timeout1)

          if (!availabilityResponse.ok) {
            return {
              code: tour.code || tour.id,
              eventCodeUsed,
              nextDate: null,
              fromPrice: null,
            }
          }

          const limitsData = await availabilityResponse.json()
          const nextDate = pickNextAvailableDateFromLimits(limitsData)

          if (!nextDate) {
            return {
              code: tour.code || tour.id,
              eventCodeUsed,
              nextDate: null,
              fromPrice: null,
            }
          }

          // Fetch prices for next available date
          const controller2 = new AbortController()
          const timeout2 = setTimeout(() => controller2.abort(), 4000)

          try {
            const pricesResponse = await fetch(
              `${origin}/api/atlantico/prices/${eventCodeUsed}?date=${nextDate}`,
              {
                signal: controller2.signal,
                next: { revalidate: 60 },
              }
            )

            clearTimeout(timeout2)

            if (!pricesResponse.ok) {
              return {
                code: tour.code || tour.id,
                eventCodeUsed,
                nextDate,
                fromPrice: null,
              }
            }

            const pricesData = await pricesResponse.json()
            const prices = parseLoadPricesResponse(pricesData)
            const fromPrice = prices.adult || prices.child || prices.infant || null

            return {
              code: tour.code || tour.id,
              eventCodeUsed,
              nextDate,
              fromPrice,
            }
          } catch (err) {
            clearTimeout(timeout2)
            return {
              code: tour.code || tour.id,
              eventCodeUsed,
              nextDate,
              fromPrice: null,
            }
          }
        } catch (err) {
          clearTimeout(timeout1)
          return {
            code: tour.code || tour.id,
            eventCodeUsed,
            nextDate: null,
            fromPrice: null,
          }
        }
      })
    )

    const pricingItems = await Promise.all(pricingPromises)

    const duration = Date.now() - startTime
    const withNextDate = pricingItems.filter((item) => item.nextDate !== null).length
    const withPrice = pricingItems.filter((item) => item.fromPrice !== null).length

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[TOURS_PRICING]', {
        lang,
        processed: pricingItems.length,
        withNextDate,
        withPrice,
        durationMs: duration,
      })

      if (pricingItems.length > 0) {
        const sample = pricingItems.find((item) => item.fromPrice !== null) || pricingItems[0]
        console.log('[TOURS_PRICING] sample:', sample)
      }
    }

    return NextResponse.json(
      {
        lang,
        generatedAt: new Date().toISOString(),
        items: pricingItems,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300', // 10 min cache
        },
      }
    )
  } catch (error) {
    console.error('[TOURS_PRICING] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate pricing snapshot',
        message: error instanceof Error ? error.message : 'Unknown error',
        lang: (await params).lang,
        generatedAt: new Date().toISOString(),
        items: [],
      },
      { status: 500 }
    )
  }
}
























