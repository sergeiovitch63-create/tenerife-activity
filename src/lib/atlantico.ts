/**
 * Atlantico Excursiones API - Server-side fetch layer for pricing
 * 
 * Provides typed functions for fetching group details, event details, and prices.
 * Uses production base URL https://api.atlanticoexcursiones.com (configurable via env).
 * All requests use cache: 'no-store' for dynamic pricing.
 */

import { getAtlanticoConfig } from './atlantico/config'
import { fetchAtlantico } from './atlantico/fetch'

/**
 * Group details response from /groupDetails/{tourId}/{lang}
 */
export type GroupDetailsResponse = {
  id?: string | number
  Code?: string
  code?: string
  name?: string
  Name?: string
  price?: string | number
  ids?: string // Comma-separated like ",184,546"
  [key: string]: unknown
}

/**
 * Event details response from /eventDetails/{eventId}/{lang}
 */
export type EventDetailsResponse = {
  Code?: string
  code?: string
  name?: string
  title?: string
  pProd?: string | number // Pricing mode: 0=per person, 1=per product, 2=per day, 3=unique
  days?: string | number
  times?: string[]
  [key: string]: unknown
}

/**
 * Price block for per-person pricing (pProd=0)
 */
export type PriceBlockPerPerson = {
  eventId: string
  eventName: string
  pProd: 0
  adult: number
  child: number
  infant: number
  currency: 'EUR'
}

/**
 * Price block for per-day pricing (pProd=2)
 */
export type PriceBlockPerDay = {
  eventId: string
  eventName: string
  pProd: 2
  tiers: Array<{ upToDays: number; price: number; currency: 'EUR' }>
}

/**
 * Price block for other pricing modes (pProd=1 or 3)
 */
export type PriceBlockOther = {
  eventId: string
  eventName: string
  pProd: 1 | 3
  raw: string
}

/**
 * Union type for all price blocks
 */
export type PriceBlock = PriceBlockPerPerson | PriceBlockPerDay | PriceBlockOther

/**
 * Fetch group details from Atlantico API
 * 
 * @param tourId - Tour/group ID
 * @param lang - Language code (e.g., 'ENG', 'ESP')
 * @returns Group details response
 */
export async function getGroupDetails(
  tourId: string,
  lang: string
): Promise<GroupDetailsResponse> {
  const endpoint = `/groupDetails/${tourId}/${lang}`
  const response = await fetchAtlantico(endpoint, {
    revalidate: 0,
    cache: 'no-store', // Dynamic
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch group details: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as GroupDetailsResponse
}

/**
 * Fetch event details from Atlantico API
 * 
 * @param eventId - Event ID
 * @param lang - Language code (e.g., 'ENG', 'ESP')
 * @returns Event details response
 */
export async function getEventDetails(
  eventId: string,
  lang: string
): Promise<EventDetailsResponse> {
  const endpoint = `/eventDetails/${eventId}/${lang}`
  const response = await fetchAtlantico(endpoint, {
    revalidate: 0,
    cache: 'no-store', // Dynamic
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch event details: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as EventDetailsResponse
}

/**
 * Fetch event prices from Atlantico API
 * 
 * @param eventId - Event ID
 * @param date - Date in YYYY-MM-DD format
 * @param office - Optional office/collaborator number
 * @returns Raw price string from API
 */
export async function getEventPrices(
  eventId: string,
  date: string,
  office?: string
): Promise<string> {
  // Build endpoint with optional office parameter
  let endpoint = `/loadPrices/${eventId}/${date}`
  if (office && office.trim()) {
    endpoint = `/loadPrices/${eventId}/${date}/${office.trim()}`
  }

  const response = await fetchAtlantico(endpoint, {
    revalidate: 0,
    cache: 'no-store', // Dynamic pricing
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch prices: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()
  return text.trim()
}

/**
 * Parse comma-separated event IDs from groupDetails.ids
 * 
 * @param ids - Comma-separated string like ",184,546" or "184,546"
 * @returns Array of event IDs
 */
export function parseEventIds(ids: string | number | string[] | number[] | undefined): string[] {
  if (!ids) return []

  // If already an array, convert to strings
  if (Array.isArray(ids)) {
    return ids.map(String).filter((id) => id.trim().length > 0)
  }

  // Convert to string and parse
  const idsStr = String(ids).trim()
  if (!idsStr) return []

  // Split by comma, strip leading/trailing commas, filter empty
  return idsStr
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
}

/**
 * Parse per-person pricing (pProd=0)
 * Format: "ADULT_PRICE|CHILD_PRICE|INFANT_PRICE|ADULT_COM|CHILD_COM|INFANT_COM"
 * 
 * @param raw - Raw price string
 * @returns Parsed prices or null if invalid
 */
export function parsePerPersonPrices(raw: string): {
  adult: number
  child: number
  infant: number
} | null {
  const parts = raw.split('|').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 3) return null

  const adult = parseFloat(parts[0])
  const child = parseFloat(parts[1])
  const infant = parseFloat(parts[2])

  if (!Number.isFinite(adult) || !Number.isFinite(child) || !Number.isFinite(infant)) {
    return null
  }

  return { adult, child, infant }
}

/**
 * Parse per-day pricing (pProd=2)
 * Format: "DAYS|PRICE|COMMISSION|DAYS|PRICE|COMMISSION|..."
 * 
 * @param raw - Raw price string
 * @returns Array of tiers or null if invalid
 */
export function parsePerDayPrices(raw: string): Array<{ upToDays: number; price: number }> | null {
  const parts = raw.split('|').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 3 || parts.length % 3 !== 0) return null

  const tiers: Array<{ upToDays: number; price: number }> = []

  for (let i = 0; i < parts.length; i += 3) {
    const days = parseFloat(parts[i])
    const price = parseFloat(parts[i + 1])

    if (Number.isFinite(days) && Number.isFinite(price) && days > 0 && price >= 0) {
      tiers.push({ upToDays: Math.round(days), price })
    }
  }

  return tiers.length > 0 ? tiers : null
}

/**
 * Get today's date in YYYY-MM-DD format (server UTC)
 * 
 * @returns Date string
 */
export function getTodayDate(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Add days to a date string
 * 
 * @param dateStr - Date in YYYY-MM-DD format
 * @param days - Number of days to add
 * @returns New date string in YYYY-MM-DD format
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + days)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Try to fetch prices for a date, with retry logic (today + up to 7 days ahead)
 * 
 * @param eventId - Event ID
 * @param office - Optional office/collaborator number
 * @returns Raw price string or null if all attempts failed
 */
export async function getEventPricesWithRetry(
  eventId: string,
  office?: string
): Promise<string | null> {
  let startDate = getTodayDate()

  // Try today + up to 7 days ahead
  for (let offset = 0; offset <= 7; offset++) {
    const date = offset === 0 ? startDate : addDays(startDate, offset)

    try {
      const prices = await getEventPrices(eventId, date, office)
      // Check if response is valid (non-empty and contains data)
      if (prices && prices.trim().length > 0) {
        // Basic validation: should contain at least one pipe or number
        if (prices.includes('|') || /^\d+/.test(prices.trim())) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[ATLANTICO_PRICES] Success for eventId ${eventId} on date ${date}`)
          }
          return prices
        }
      }
    } catch (error) {
      // Continue to next date
      if (process.env.NODE_ENV === 'development' && offset === 0) {
        console.warn(`[ATLANTICO_PRICES] Failed for eventId ${eventId} on date ${date}:`, error)
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(`[ATLANTICO_PRICES] All attempts failed for eventId ${eventId}`)
  }

  return null
}

/**
 * Build normalized price blocks for all events in a group
 * 
 * @param tourId - Tour/group ID
 * @param lang - Language code
 * @param office - Optional office/collaborator number
 * @returns Array of price blocks (may be empty if all events fail)
 */
export async function buildPriceBlocks(
  tourId: string,
  lang: string,
  office?: string
): Promise<PriceBlock[]> {
  const priceBlocks: PriceBlock[] = []

  try {
    // Fetch group details
    const groupDetails = await getGroupDetails(tourId, lang)
    const eventIds = parseEventIds(groupDetails.ids)

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ATLANTICO_PRICES] tourId=${tourId}, eventIds=${eventIds.join(',')}`)
    }

    if (eventIds.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[ATLANTICO_PRICES] No event IDs found for tourId ${tourId}`)
      }
      return []
    }

    // Process each event
    for (const eventId of eventIds) {
      try {
        // Fetch event details
        const eventDetails = await getEventDetails(eventId, lang)
        const eventName = eventDetails.name || eventDetails.title || eventDetails.Code || eventDetails.code || `Event ${eventId}`
        const pProdRaw = eventDetails.pProd
        const pProd = typeof pProdRaw === 'string' ? parseInt(pProdRaw, 10) : typeof pProdRaw === 'number' ? pProdRaw : null

        if (process.env.NODE_ENV === 'development') {
          console.log(`[ATLANTICO_PRICES] eventId=${eventId}, pProd=${pProd}`)
        }

        // Fetch prices with retry
        const pricesRaw = await getEventPricesWithRetry(eventId, office)

        if (!pricesRaw) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[ATLANTICO_PRICES] No prices found for eventId ${eventId}`)
          }
          // Create fallback block
          priceBlocks.push({
            eventId,
            eventName,
            pProd: (pProd === 1 || pProd === 3 ? pProd : 1) as 1 | 3,
            raw: 'No prices available',
          })
          continue
        }

        if (process.env.NODE_ENV === 'development') {
          console.log(`[ATLANTICO_PRICES] eventId=${eventId}, raw prices="${pricesRaw}"`)
        }

        // Parse based on pProd
        if (pProd === 0) {
          // Per person pricing
          const parsed = parsePerPersonPrices(pricesRaw)
          if (parsed) {
            priceBlocks.push({
              eventId,
              eventName,
              pProd: 0,
              adult: parsed.adult,
              child: parsed.child,
              infant: parsed.infant,
              currency: 'EUR',
            })
          } else {
            // Fallback
            priceBlocks.push({
              eventId,
              eventName,
              pProd: 1,
              raw: pricesRaw,
            })
          }
        } else if (pProd === 2) {
          // Per day pricing
          const parsed = parsePerDayPrices(pricesRaw)
          if (parsed) {
            priceBlocks.push({
              eventId,
              eventName,
              pProd: 2,
              tiers: parsed.map((tier) => ({
                upToDays: tier.upToDays,
                price: tier.price,
                currency: 'EUR' as const,
              })),
            })
          } else {
            // Fallback
            priceBlocks.push({
              eventId,
              eventName,
              pProd: 1,
              raw: pricesRaw,
            })
          }
        } else {
          // Other pricing modes (1 or 3) or unknown
          priceBlocks.push({
            eventId,
            eventName,
            pProd: (pProd === 3 ? 3 : 1) as 1 | 3,
            raw: pricesRaw,
          })
        }
      } catch (error) {
        // Skip failing event and continue
        if (process.env.NODE_ENV === 'development') {
          console.error(`[ATLANTICO_PRICES] Error processing eventId ${eventId}:`, error)
        }
        continue
      }
    }
  } catch (error) {
    // Log error but return empty array (don't crash page)
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ATLANTICO_PRICES] Error building price blocks for tourId ${tourId}:`, error)
    }
    return []
  }

  return priceBlocks
}

