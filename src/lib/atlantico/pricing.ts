/**
 * Pricing utilities for Atlantico API
 * 
 * Handles fetching and computing real prices from loadLimits + loadPrices
 */

import { firstDayOfMonth, toYMD } from './date'
import { pickNextAvailableDateFromLimits } from './limits'
import { parseLoadPricesResponse } from './prices'
import { normalizePriceFromRaw } from './price-normalize'
import { fetchAtlantico } from './fetch'

/**
 * Concurrency limiter for pricing requests
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

const pricingLimiter = new ConcurrencyLimiter(5)

/**
 * Get next available date for an event code
 * Lookahead strategy: tries current month, then next 2 months (max 3 months total)
 */
export async function getNextAvailableDate(
  eventCode: string,
  lang: string,
  origin?: string
): Promise<string | null> {
  const monthsToTry = 3 // Current month + 2 more months
  const startDate = new Date()
  
  for (let i = 0; i < monthsToTry; i++) {
    const monthDate = new Date(startDate)
    monthDate.setMonth(startDate.getMonth() + i)
    const monthStart = firstDayOfMonth(monthDate)
    
    const nextDate = await tryGetNextDateForMonth(eventCode, lang, monthStart, origin)
    if (nextDate) {
      return nextDate
    }
  }
  
  return null
}

/**
 * Try to get next available date for a specific month
 */
async function tryGetNextDateForMonth(
  eventCode: string,
  lang: string,
  monthStart: string,
  origin?: string
): Promise<string | null> {
  try {
    // Use internal API route if origin provided, otherwise direct fetch
    // Use ?month= parameter (preferred) instead of ?date=
    const url = origin
      ? `${origin}/api/atlantico/availability/${eventCode}/${lang}?month=${monthStart}`
      : null

    let response: Response
    if (url) {
      response = await fetch(url, {
        next: { revalidate: 60 },
      })
    } else {
      // Direct fetch to Atlantico API
      response = await fetchAtlantico(
        `/loadLimits/${eventCode}/${lang}/${monthStart}`,
        { revalidate: 60 }
      )
    }

    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PRICING_DEBUG] Availability request failed', {
          eventCode,
          lang,
          monthStart,
          status: response.status,
        })
      }
      return null
    }

    const data = await response.json()
    
    // DEV: Log availability response structure
    if (process.env.NODE_ENV === 'development') {
      const hasDatesArray = Array.isArray(data?.dates)
      const hasWdays = data?.dates && typeof data.dates === 'object' && Array.isArray(data.dates.wdays)
      console.log('[PRICING_DEBUG] Availability response', {
        eventCode,
        requestedMonth: monthStart,
        usedMonth: data?.usedMonth || monthStart,
        hasDatesArray,
        datesLength: hasDatesArray ? data.dates.length : 0,
        hasWdays,
        wdaysLength: hasWdays ? data.dates.wdays.length : 0,
        datesShape: hasDatesArray ? 'array' : hasWdays ? 'wdays' : 'unknown',
      })
    }
    
    // Use usedMonth from response if available, otherwise use requested monthStart
    const effectiveMonth = data?.usedMonth || monthStart
    const nextDate = pickNextAvailableDateFromLimits(data, effectiveMonth)
    
    // DEV: Log computed nextDate
    if (process.env.NODE_ENV === 'development') {
      console.log('[PRICING_DEBUG] Computed nextDate', {
        eventCode,
        effectiveMonth,
        nextDate,
      })
    }
    
    return nextDate
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PRICING_DEBUG] Error in tryGetNextDateForMonth', {
        eventCode,
        monthStart,
        error: error instanceof Error ? error.message : 'Unknown',
      })
    }
    // Silent fail
    return null
  }
}

/**
 * Get price for a specific date
 */
export async function getPriceForDate(
  eventCode: string,
  date: string,
  origin?: string,
  office?: string
): Promise<number | null> {
  try {
    // Prefer provided office, fallback to env var
    const effectiveOffice = office || process.env.ATLANTICO_OFFICE || undefined
    
    // Use internal API route if origin provided, otherwise direct fetch
    const url = origin
      ? `${origin}/api/atlantico/prices/${eventCode}?date=${date}${effectiveOffice ? `&office=${effectiveOffice}` : ''}`
      : null

    let response: Response
    if (url) {
      response = await fetch(url, {
        next: { revalidate: 60 },
      })
    } else {
      // Direct fetch to Atlantico API
      const endpoint = effectiveOffice
        ? `/loadPrices/${eventCode}/${date}/${effectiveOffice}`
        : `/loadPrices/${eventCode}/${date}`
      response = await fetchAtlantico(endpoint, { revalidate: 60 })
    }

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    // DEV: Log prices response structure
    if (process.env.NODE_ENV === 'development') {
      const priceKeys = data && typeof data === 'object' ? Object.keys(data).slice(0, 10) : []
      console.log('[PRICING_DEBUG] Prices response', {
        eventCode,
        date,
        priceKeys,
        hasPVPA: !!(data?.PVPA || data?.pvpa),
        PVPA: data?.PVPA || data?.pvpa,
      })
    }
    
    const prices = parseLoadPricesResponse(data)
    
    // Return adult price, or child, or infant (first available, preferring adult)
    // This gives us the "From €X" price
    const extractedPrice = prices.adult || prices.child || prices.infant || null
    
    // DEV: Log extracted price
    if (process.env.NODE_ENV === 'development') {
      console.log('[PRICING_DEBUG] Extracted price', {
        eventCode,
        date,
        extractedPrice,
        adult: prices.adult,
        child: prices.child,
        infant: prices.infant,
      })
    }
    
    return extractedPrice
  } catch (error) {
    // Silent fail
    return null
  }
}

/**
 * Compute cheapest price across multiple event codes
 * Returns cheapest option with eventCode, fromPrice, nextDate
 */
export async function computeCheapestPrice(
  eventCodes: string[],
  lang: string,
  origin?: string
): Promise<{ eventCode: string; fromPrice: number; nextDate: string } | null> {
  if (eventCodes.length === 0) {
    return null
  }

  const results = await Promise.all(
    eventCodes.map((eventCode) =>
      pricingLimiter.execute(async () => {
        const nextDate = await getNextAvailableDate(eventCode, lang, origin)
        if (!nextDate) {
          return { eventCode, fromPrice: null, nextDate: null }
        }

        const price = await getPriceForDate(eventCode, nextDate, origin)
        return { eventCode, fromPrice: price, nextDate }
      })
    )
  )

  // Filter out null prices and find cheapest
  const priced = results.filter((r) => r.fromPrice !== null && r.fromPrice > 0)
  if (priced.length === 0) {
    return null
  }

  const cheapest = priced.sort((a, b) => (a.fromPrice || Infinity) - (b.fromPrice || Infinity))[0]
  return {
    eventCode: cheapest.eventCode,
    fromPrice: cheapest.fromPrice!,
    nextDate: cheapest.nextDate!,
  }
}

/**
 * Get price with fallback to eventDetails raw price fields
 */
export async function getPriceWithFallback(
  eventCode: string,
  lang: string,
  eventDetailsRaw?: any,
  origin?: string
): Promise<{ fromPrice: number | null; nextDate: string | null; source: 'loadPrices' | 'fallback' | 'none' }> {
  // Try loadPrices first
  const nextDate = await getNextAvailableDate(eventCode, lang, origin)
  if (nextDate) {
    const price = await getPriceForDate(eventCode, nextDate, origin)
    if (price !== null && price > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PRICE_PIPELINE]', {
          eventCode,
          nextDate,
          price,
          source: 'loadPrices',
        })
      }
      return { fromPrice: price, nextDate, source: 'loadPrices' }
    }
  }

  // Fallback to eventDetails raw price fields
  if (eventDetailsRaw) {
    const fallbackPrice = normalizePriceFromRaw(eventDetailsRaw)
    if (fallbackPrice !== null && fallbackPrice > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PRICE_PIPELINE]', {
          eventCode,
          nextDate: null,
          price: fallbackPrice,
          source: 'fallback',
        })
      }
      return { fromPrice: fallbackPrice, nextDate: null, source: 'fallback' }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[PRICE_PIPELINE]', {
      eventCode,
      nextDate: null,
      price: null,
      source: 'none',
    })
  }

  return { fromPrice: null, nextDate: null, source: 'none' }
}


