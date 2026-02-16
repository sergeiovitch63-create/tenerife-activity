/**
 * Find the next available month for an event
 * 
 * Searches forward from startMonth until finding a month with available sessions
 * or reaches maxMonthsAhead limit.
 * 
 * @param eventId - Event code (t_id)
 * @param lang - Language code (ENG, CAS, etc.)
 * @param startMonth - Starting month in YYYY-MM-01 format
 * @param maxMonthsAhead - Maximum months to search ahead (default: 12)
 * @returns Next available month in YYYY-MM-01 format, or null if none found
 */

// Simple in-memory cache (key: eventId+lang+month, value: { available: boolean, month: string | null })
const cache = new Map<string, { available: boolean; month: string | null; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Add a month to a YYYY-MM-01 date string
 */
function addMonth(monthStr: string, months: number): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1 + months, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Check if a month has availability
 */
async function checkMonthAvailability(
  eventId: string,
  lang: string,
  month: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/atlantico/limits?eventId=${encodeURIComponent(eventId)}&lang=${encodeURIComponent(lang)}&month=${encodeURIComponent(month)}`,
      {
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    
    if (!data.ok) {
      return false
    }

    // Check if there are available dates or sessions
    const hasAvailableDates = Array.isArray(data.availableDates) && data.availableDates.length > 0
    const hasSessions = data.sessionsByDay && typeof data.sessionsByDay === 'object' && Object.keys(data.sessionsByDay).length > 0

    return hasAvailableDates || hasSessions
  } catch (error) {
    console.error('[findNextAvailableMonth] Error checking month:', error)
    return false
  }
}

/**
 * Find the next available month for an event
 * 
 * @param eventId - Event code (t_id)
 * @param lang - Language code (ENG, CAS, etc.)
 * @param startMonth - Starting month in YYYY-MM-01 format
 * @param maxMonthsAhead - Maximum months to search ahead (default: 12)
 * @returns Next available month in YYYY-MM-01 format, or null if none found
 */
export async function findNextAvailableMonth(
  eventId: string,
  lang: string,
  startMonth: string,
  maxMonthsAhead: number = 12
): Promise<string | null> {
  // Normalize startMonth to YYYY-MM-01
  const normalizedStart = (() => {
    const match = startMonth.match(/^(\d{4}-\d{2})/)
    if (match) {
      return `${match[1]}-01`
    }
    return startMonth
  })()

  // Check cache first
  const cacheKey = `${eventId}:${lang}:${normalizedStart}:${maxMonthsAhead}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.month
  }

  // Search forward month by month
  for (let i = 0; i <= maxMonthsAhead; i++) {
    const monthToCheck = addMonth(normalizedStart, i)
    
    // Check if this month has availability
    const hasAvailability = await checkMonthAvailability(eventId, lang, monthToCheck)
    
    if (hasAvailability) {
      // Cache the result
      cache.set(cacheKey, {
        available: true,
        month: monthToCheck,
        timestamp: Date.now(),
      })
      return monthToCheck
    }

    // Small delay to avoid rate limiting
    if (i < maxMonthsAhead) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // No availability found
  const result: string | null = null
  cache.set(cacheKey, {
    available: false,
    month: result,
    timestamp: Date.now(),
  })
  return result
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearFindNextAvailableMonthCache(): void {
  cache.clear()
}










