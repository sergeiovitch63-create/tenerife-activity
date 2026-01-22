/**
 * GET /api/atlantico/debug-pricing/[groupCode]/[lang]
 * 
 * Debug endpoint for pricing pipeline analysis.
 * 
 * Returns detailed pricing information for a group (tour):
 * - Event codes extracted
 * - For first 3 eventCodes: availability, prices, extracted minPrice
 * - Cheapest option overall
 * - Collected errors
 * 
 * Route parameters:
 * - groupCode: Group/tour code
 * - lang: Language code (e.g., 'ENG', 'ESP')
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'
import { extractEventCodes } from '@/lib/atlantico/mappers'
import { getNextAvailableDate, getPriceForDate } from '@/lib/atlantico/pricing'
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

const limiter = new ConcurrencyLimiter(3) // Max 3 concurrent requests

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupCode: string; lang: string }> }
) {
  const errors: string[] = []
  const startTime = Date.now()

  try {
    const { groupCode, lang } = await params
    const config = getAtlanticoConfig()

    if (!config.isValid) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: config.error || 'Atlantico API configuration is invalid',
          groupCode,
          lang,
          ok: false,
        },
        { status: 500 }
      )
    }

    if (!groupCode || !lang) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'groupCode and lang are required',
          ok: false,
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

    // Fetch group details
    let groupDetails: any = null
    try {
      const groupResponse = await fetchAtlantico(
        `/groupDetails/${groupCode}/${lang}`,
        { revalidate: 3600 }
      )
      if (groupResponse.ok) {
        groupDetails = await groupResponse.json()
      } else {
        errors.push(`groupDetails failed: HTTP ${groupResponse.status}`)
      }
    } catch (err) {
      errors.push(`groupDetails error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    if (!groupDetails) {
      return NextResponse.json(
        {
          error: 'Failed to fetch group details',
          groupCode,
          lang,
          eventCodes: [],
          eventDetails: [],
          cheapestOption: null,
          errors,
          ok: false,
        },
        { status: 404 }
      )
    }

    // Extract event codes
    // Extract event codes using robust resolver
    const { resolveEventIds } = await import('@/lib/atlantico/event-id-resolver')
    const eventCodes = resolveEventIds(groupDetails)

    // Process first 3 eventCodes only
    const eventCodesToProcess = eventCodes.slice(0, 3)
    const eventDetails = await Promise.all(
      eventCodesToProcess.map((eventCode) =>
        limiter.execute(async () => {
          const result: any = {
            eventCode,
            nextDate: null,
            availabilityStatus: 'error',
            pricesStatus: 'error',
            extractedMinPrice: null,
            availabilityKeys: [],
            pricesKeys: [],
            errors: [],
          }

          try {
            // Fetch availability
            try {
              // Use current month for availability query
              const currentMonth = new Date().toISOString().substring(0, 7) + '-01'
              const availUrl = `${origin}/api/atlantico/availability/${eventCode}/${lang}?month=${currentMonth}`
              const availResponse = await fetch(availUrl, { next: { revalidate: 60 } })
              
              if (availResponse.ok) {
                const availData = await availResponse.json()
                result.availabilityStatus = 'ok'
                
                // Extract keys from availability response
                if (availData && typeof availData === 'object') {
                  result.availabilityKeys = Object.keys(availData).slice(0, 10) // First 10 keys
                  
                  // Check for availability: either dates array OR wdays
                  const hasDatesArray = Array.isArray(availData?.dates)
                  const datesLength = hasDatesArray ? availData.dates.length : 0
                  const hasWdays = availData?.dates && typeof availData.dates === 'object' && Array.isArray(availData.dates.wdays)
                  const wdaysLength = hasWdays ? availData.dates.wdays.length : 0
                  const hasAvailability = (hasDatesArray && datesLength > 0) || (hasWdays && wdaysLength > 0)
                  
                  // Try to extract next date (pass usedMonth from response, or current month as fallback)
                  const usedMonth = availData?.usedMonth || currentMonth
                  const nextDate = pickNextAvailableDateFromLimits(availData, usedMonth)
                  if (nextDate) {
                    result.nextDate = nextDate
                  } else if (hasAvailability) {
                    // Has availability format but no nextDate computed (might be past dates or other issue)
                    result.availabilityStatus = 'ok' // Keep as ok since format is valid
                    result.errors.push(`Has availability (${hasDatesArray ? `${datesLength} dates` : ''}${hasWdays ? `${wdaysLength} weekdays` : ''}) but no nextDate computed`)
                  } else {
                    result.availabilityStatus = 'empty'
                    result.errors.push('No available dates found in limits (no dates array and no wdays)')
                  }
                  
                  // Add availability diagnostics
                  result.hasAvailability = hasAvailability
                  result.hasWdays = hasWdays
                  result.wdaysLength = wdaysLength
                  result.hasDatesArray = hasDatesArray
                  result.datesLength = datesLength
                } else {
                  result.availabilityStatus = 'empty'
                  result.errors.push('Availability response is not an object')
                }
              } else {
                result.availabilityStatus = 'error'
                result.errors.push(`Availability HTTP ${availResponse.status}`)
              }
            } catch (availErr) {
              result.availabilityStatus = 'error'
              result.errors.push(`Availability error: ${availErr instanceof Error ? availErr.message : 'Unknown'}`)
            }

            // Fetch prices if we have a nextDate
            if (result.nextDate) {
              try {
                const priceUrl = `${origin}/api/atlantico/prices/${eventCode}?date=${result.nextDate}`
                const priceResponse = await fetch(priceUrl, { next: { revalidate: 60 } })
                
                if (priceResponse.ok) {
                  const priceData = await priceResponse.json()
                  result.pricesStatus = 'ok'
                  
                  // Extract keys from prices response
                  if (priceData && typeof priceData === 'object') {
                    result.pricesKeys = Object.keys(priceData).slice(0, 10) // First 10 keys
                  } else if (typeof priceData === 'string') {
                    result.pricesKeys = ['string']
                  }
                  
                  // Parse prices
                  const parsed = parseLoadPricesResponse(priceData)
                  const minPrice = parsed.adult || parsed.child || parsed.infant || null
                  
                  if (minPrice !== null && minPrice > 0) {
                    result.extractedMinPrice = minPrice
                  } else {
                    result.pricesStatus = 'empty'
                    result.errors.push('No valid prices found in response')
                  }
                } else {
                  result.pricesStatus = 'error'
                  result.errors.push(`Prices HTTP ${priceResponse.status}`)
                }
              } catch (priceErr) {
                result.pricesStatus = 'error'
                result.errors.push(`Prices error: ${priceErr instanceof Error ? priceErr.message : 'Unknown'}`)
              }
            } else {
              result.errors.push('Cannot fetch prices: no nextDate available')
            }
          } catch (err) {
            result.errors.push(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`)
          }

          return result
        })
      )
    )

    // Find cheapest option
    const pricedOptions = eventDetails.filter((e) => e.extractedMinPrice !== null && e.extractedMinPrice > 0)
    const cheapestOption = pricedOptions.length > 0
      ? pricedOptions.sort((a, b) => (a.extractedMinPrice || Infinity) - (b.extractedMinPrice || Infinity))[0]
      : null

    const duration = Date.now() - startTime

    return NextResponse.json(
      {
        groupCode,
        lang,
        eventCodes: eventCodes.slice(0, 3), // Return first 3 only
        eventDetails,
        cheapestOption: cheapestOption
          ? {
              eventCode: cheapestOption.eventCode,
              nextDate: cheapestOption.nextDate,
              minPrice: cheapestOption.extractedMinPrice,
            }
          : null,
        errors,
        durationMs: duration,
        ok: true,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    )
  } catch (error) {
    errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    return NextResponse.json(
      {
        error: 'Failed to process debug pricing',
        message: error instanceof Error ? error.message : 'Unknown error',
        errors,
        ok: false,
      },
      { status: 500 }
    )
  }
}

