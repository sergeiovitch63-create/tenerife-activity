/**
 * GET /api/atlantico/availability/[eventCode]/[lang]
 * 
 * Fetches availability and limits for an event.
 * 
 * Route parameters:
 * - eventCode: Event code
 * - lang: Language code (e.g., 'EN', 'ES')
 * 
 * Query parameters:
 * - month: Month in format YYYY-MM (e.g., 2026-01) - preferred
 * - date: Date in format YYYY-MM-DD (will be normalized to YYYY-MM)
 * 
 * Returns normalized response:
 * {
 *   ok: true,
 *   eventCode: string,
 *   lang: string,
 *   monthUsed: "YYYY-MM",
 *   dates: ["YYYY-MM-DD", ...],  // Array of available dates
 *   raw?: any  // Raw response (DEV only)
 * }
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'
import { parseYYYYMMDD, isFutureOrToday, toYMD } from '@/lib/atlantico/date'

/**
 * Normalize month to YYYY-MM format
 */
function normalizeMonth(monthStr: string | null): string {
  if (!monthStr || typeof monthStr !== 'string') {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  // If already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(monthStr)) {
    return monthStr
  }

  // If in YYYY-MM-DD format, extract YYYY-MM
  const match = monthStr.match(/^(\d{4}-\d{2})/)
  if (match) {
    return match[1]
  }

  // Try to parse as Date
  try {
    const date = new Date(monthStr)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      return `${year}-${month}`
    }
  } catch {
    // Fall through to default
  }

  // Default to current month
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Extract all available dates from loadLimits response
 * Returns array of YYYY-MM-DD strings
 */
function extractDatesFromLimits(limitsResponse: any, requestedMonth: string): string[] {
  if (!limitsResponse || typeof limitsResponse !== 'object') {
    return []
  }

  const dates: string[] = []
  const seen = new Set<string>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Parse requested month
  const monthMatch = requestedMonth.match(/^(\d{4})-(\d{2})$/)
  if (!monthMatch) {
    return []
  }
  const year = parseInt(monthMatch[1], 10)
  const month = parseInt(monthMatch[2], 10) - 1 // JavaScript months are 0-indexed

  // Format 0: Object with dates.wdays (weekdays array)
  // Example: { dates: { wdays: [1,2,3,4,5,6,7] } }
  if (limitsResponse.dates && typeof limitsResponse.dates === 'object' && !Array.isArray(limitsResponse.dates)) {
    const wdays = limitsResponse.dates.wdays
    if (Array.isArray(wdays) && wdays.length > 0) {
      const lastDay = new Date(year, month + 1, 0).getDate()
      const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
      const startDay = isCurrentMonth ? today.getDate() : 1

      for (let day = startDay; day <= lastDay; day++) {
        const candidateDate = new Date(year, month, day)
        const weekday = candidateDate.getDay() === 0 ? 7 : candidateDate.getDay() // 1=Monday, 7=Sunday

        if (wdays.includes(weekday) && isFutureOrToday(candidateDate)) {
          const dateStr = toYMD(candidateDate)
          if (!seen.has(dateStr)) {
            dates.push(dateStr)
            seen.add(dateStr)
          }
        }
      }
    }
  }

  // Format 1: Array of dates with limit/used arrays
  if (Array.isArray(limitsResponse.dates) && Array.isArray(limitsResponse.limit)) {
    const dateArray = limitsResponse.dates
    const limits = limitsResponse.limit
    const used = limitsResponse.used || []

    for (let i = 0; i < dateArray.length; i++) {
      const dateStr = String(dateArray[i])
      const limit = typeof limits[i] === 'number' ? limits[i] : 0
      const usedCount = typeof used[i] === 'number' ? used[i] : 0
      const remaining = limit - usedCount

      if (remaining > 0) {
        const date = parseYYYYMMDD(dateStr)
        if (date && isFutureOrToday(date)) {
          const ymd = toYMD(date)
          if (!seen.has(ymd)) {
            dates.push(ymd)
            seen.add(ymd)
          }
        }
      }
    }
  }

  // Format 2: Object with date keys (YYYYMMDD format)
  if (typeof limitsResponse === 'object' && !Array.isArray(limitsResponse)) {
    const dateKeys = Object.keys(limitsResponse)
      .filter((key) => /^\d{8}$/.test(key))
      .sort()

    for (const dateKey of dateKeys) {
      const date = parseYYYYMMDD(dateKey)
      if (!date || !isFutureOrToday(date)) {
        continue
      }

      const dayData = limitsResponse[dateKey]
      if (dayData && typeof dayData === 'object') {
        const limit = typeof dayData.limit === 'number' ? dayData.limit : 0
        const used = typeof dayData.used === 'number' ? dayData.used : 0
        const remaining = limit - used

        if (remaining > 0) {
          const ymd = toYMD(date)
          if (!seen.has(ymd)) {
            dates.push(ymd)
            seen.add(ymd)
          }
        }
      } else if (typeof dayData === 'number' && dayData > 0) {
        const ymd = toYMD(date)
        if (!seen.has(ymd)) {
          dates.push(ymd)
          seen.add(ymd)
        }
      }
    }
  }

  // Format 3: Array of objects with date property
  if (Array.isArray(limitsResponse)) {
    for (const item of limitsResponse) {
      if (!item || typeof item !== 'object') continue

      const dateStr = item.date || item.dateStr || item.day
      if (!dateStr) continue

      const date = parseYYYYMMDD(String(dateStr))
      if (!date || !isFutureOrToday(date)) continue

      const limit = typeof item.limit === 'number' ? item.limit : 0
      const used = typeof item.used === 'number' ? item.used : 0
      const remaining = limit - used

      if (remaining > 0) {
        const ymd = toYMD(date)
        if (!seen.has(ymd)) {
          dates.push(ymd)
          seen.add(ymd)
        }
      }
    }
  }

  // Format 4: Direct dates array (strings YYYY-MM-DD)
  if (Array.isArray(limitsResponse.dates)) {
    for (const dateItem of limitsResponse.dates) {
      if (typeof dateItem === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateItem)) {
        const date = parseYYYYMMDD(dateItem)
        if (date && isFutureOrToday(date)) {
          if (!seen.has(dateItem)) {
            dates.push(dateItem)
            seen.add(dateItem)
          }
        }
      }
    }
  }

  return dates.sort()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventCode: string; lang: string }> }
) {
  try {
    const { eventCode, lang } = await params
    const { searchParams } = request.nextUrl
    const dateParam = searchParams.get('date')
    const monthParam = searchParams.get('month')

    const config = getAtlanticoConfig()

    if (!config.isValid) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: config.error || 'Atlantico API configuration is invalid',
          ok: false,
        },
        { status: 500 }
      )
    }

    if (!eventCode || !lang) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'eventCode and lang are required',
          ok: false,
        },
        { status: 400 }
      )
    }

    // Normalize month (prefer month param, fallback to date param, then current month)
    const requestedMonth = normalizeMonth(monthParam || dateParam)
    const targetDate = `${requestedMonth}-01` // YYYY-MM-01 for loadLimits API

    // Fetch availability
    const response = await fetchAtlantico(
      `/loadLimits/${eventCode}/${lang}/${targetDate}`,
      { revalidate: 60 } // Cache 60 seconds (short cache for availability)
    )

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to fetch availability',
          message: `HTTP ${response.status}: ${response.statusText}`,
          eventCode,
          lang,
          monthUsed: requestedMonth,
          dates: [],
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract dates from response
    const dates = extractDatesFromLimits(data, requestedMonth)

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[LIMITS]', {
        eventCode,
        lang,
        month: requestedMonth,
        targetDate,
        nbDates: dates.length,
        sampleDates: dates.slice(0, 3),
        hasRawData: !!data,
      })
    }

    // Return normalized response
    const responseData: any = {
      ok: true,
      eventCode,
      lang,
      monthUsed: requestedMonth,
      dates,
    }

    // Include raw data in DEV only
    if (process.env.NODE_ENV === 'development') {
      responseData.raw = data
    }

    return NextResponse.json(
      responseData,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30', // 60s cache
        },
      }
    )
  } catch (error) {
    console.error('[LIMITS] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch availability',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


