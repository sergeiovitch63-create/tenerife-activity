/**
 * GET /api/atlantico/loadLimits/[idExc]/[lang]
 * 
 * Fetches availability using loadLimits endpoint with idExc (excursion ID)
 * 
 * Route parameters:
 * - idExc: Excursion ID (e.g., "1831")
 * - lang: Language code (e.g., 'fra', 'eng', 'esp')
 * 
 * Query parameters:
 * - date: Date in format YYYY-MM-DD (default: first day of current month, e.g., "2026-01-01")
 * 
 * Returns normalized response:
 * {
 *   ok: true,
 *   idExc: string,
 *   lang: string,
 *   dateUsed: "YYYY-MM-DD",
 *   dates: ["YYYY-MM-DD", ...],  // Array of available dates
 *   raw?: any  // Raw response (DEV only)
 * }
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'

// Mark route as dynamic (uses searchParams)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Normalize date to YYYY-MM-01 format (first day of month)
 */
function normalizeToMonthStart(dateStr: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }

  // If already in YYYY-MM-DD format, extract YYYY-MM-01
  const match = dateStr.match(/^(\d{4}-\d{2})/)
  if (match) {
    return `${match[1]}-01`
  }

  // Try to parse as Date
  try {
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      return `${year}-${month}-01`
    }
  } catch {
    // Fall through to default
  }

  // Default to first day of current month
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Extract all available dates from loadLimits response
 * Returns array of YYYY-MM-DD strings
 */
function extractDatesFromLimits(limitsResponse: any, requestedDate: string): string[] {
  if (!limitsResponse || typeof limitsResponse !== 'object') {
    return []
  }

  const dates: string[] = []
  const seen = new Set<string>()

  // Parse requested date to get year and month
  const dateMatch = requestedDate.match(/^(\d{4})-(\d{2})-\d{2}$/)
  if (!dateMatch) {
    return []
  }
  const year = parseInt(dateMatch[1], 10)
  const month = parseInt(dateMatch[2], 10) - 1 // JavaScript months are 0-indexed

  // Format 0: Object with dates.wdays (weekdays array)
  if (limitsResponse.dates && typeof limitsResponse.dates === 'object' && !Array.isArray(limitsResponse.dates)) {
    const wdays = limitsResponse.dates.wdays
    if (Array.isArray(wdays) && wdays.length > 0) {
      const lastDay = new Date(year, month + 1, 0).getDate()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
      const startDay = isCurrentMonth ? today.getDate() : 1

      for (let day = startDay; day <= lastDay; day++) {
        const candidateDate = new Date(year, month, day)
        const dayOfWeek = candidateDate.getDay() // 0 = Sunday, 6 = Saturday
        const wday = dayOfWeek === 0 ? 7 : dayOfWeek // Convert to 1-7 (Monday=1, Sunday=7)

        if (wdays.includes(wday) && candidateDate >= today) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          if (!seen.has(dateStr)) {
            dates.push(dateStr)
            seen.add(dateStr)
          }
        }
      }
    }
  }

  // Format 1: Array of dates with limit/used arrays
  if (Array.isArray(limitsResponse.dates)) {
    for (const dateItem of limitsResponse.dates) {
      if (dateItem && typeof dateItem === 'object') {
        const day = dateItem.day
        const monthItem = dateItem.month
        const yearItem = dateItem.year
        const limit = dateItem.limit
        const used = dateItem.used

        if (day && monthItem && yearItem && limit !== undefined && used !== undefined) {
          const available = limit > used
          if (available) {
            const dateStr = `${yearItem}-${String(monthItem).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            if (!seen.has(dateStr)) {
              dates.push(dateStr)
              seen.add(dateStr)
            }
          }
        }
      }
    }
  }

  // Format 2: Direct dates array (strings YYYY-MM-DD or YYYYMMDD)
  if (Array.isArray(limitsResponse.dates)) {
    for (const dateItem of limitsResponse.dates) {
      if (typeof dateItem === 'string') {
        let normalizedDate: string | null = null
        // Support YYYYMMDD format (8 digits) - doc Atlántico format
        if (/^\d{8}$/.test(dateItem)) {
          // YYYYMMDD format: "20220801" -> "2022-08-01"
          const year = dateItem.substring(0, 4)
          const month = dateItem.substring(4, 6)
          const day = dateItem.substring(6, 8)
          const monthNum = parseInt(month, 10)
          if (monthNum >= 1 && monthNum <= 12) {
            normalizedDate = `${year}-${month}-${day}`
          }
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateItem)) {
          // Already YYYY-MM-DD
          normalizedDate = dateItem
        }
        
        if (normalizedDate && !seen.has(normalizedDate)) {
          dates.push(normalizedDate)
          seen.add(normalizedDate)
        }
      }
    }
  }

  // Format 3: sessionsByDate object (format YYYYMMDD selon doc Atlántico)
  if (limitsResponse.sessionsByDate && typeof limitsResponse.sessionsByDate === 'object') {
    for (const dateStr of Object.keys(limitsResponse.sessionsByDate)) {
      // Support YYYYMMDD (8 digits) - format documenté Atlántico
      let normalizedDateStr: string | null = null
      
      if (/^\d{8}$/.test(dateStr)) {
        // Format YYYYMMDD: "20220801" -> "2022-08-01"
        const year = dateStr.substring(0, 4)
        const month = dateStr.substring(4, 6)
        const day = dateStr.substring(6, 8)
        normalizedDateStr = `${year}-${month}-${day}`
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // Already YYYY-MM-DD
        normalizedDateStr = dateStr
      }
      
      if (normalizedDateStr && !seen.has(normalizedDateStr)) {
        const sessions = limitsResponse.sessionsByDate[dateStr]
        if (Array.isArray(sessions) && sessions.length > 0) {
          dates.push(normalizedDateStr)
          seen.add(normalizedDateStr)
        }
      }
    }
  }

  // Format 4: avail object with dates as keys (may be YYYYMMDD format)
  if (limitsResponse.avail && typeof limitsResponse.avail === 'object') {
    for (const dateStr of Object.keys(limitsResponse.avail)) {
      let normalizedDate: string | null = null
      // Support YYYYMMDD format (8 digits) - doc Atlántico format
      if (/^\d{8}$/.test(dateStr)) {
        // YYYYMMDD format: "20220801" -> "2022-08-01"
        const year = dateStr.substring(0, 4)
        const month = dateStr.substring(4, 6)
        const day = dateStr.substring(6, 8)
        const monthNum = parseInt(month, 10)
        if (monthNum >= 1 && monthNum <= 12) {
          normalizedDate = `${year}-${month}-${day}`
        }
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // Already YYYY-MM-DD
        normalizedDate = dateStr
      }
      
      if (normalizedDate && !seen.has(normalizedDate)) {
        const availData = limitsResponse.avail[dateStr]
        if (availData && (availData.available > 0 || availData.limit > availData.used)) {
          dates.push(normalizedDate)
          seen.add(normalizedDate)
        }
      }
    }
  }

  return dates.sort()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ idExc: string; lang: string }> }
) {
  try {
    const { searchParams } = request.nextUrl
    const dateParam = searchParams.get('date')
    
    // Await params and extract date if present in PATH (route structure may vary)
    const routeParams = await params
    const { idExc, lang } = routeParams
    // Note: Next.js route [idExc]/[lang]/route.ts doesn't capture date in PATH by default
    // We'll need to check query param for now, but URL construction in client should use PATH

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

    if (!idExc || !lang) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'idExc and lang are required',
          ok: false,
        },
        { status: 400 }
      )
    }

    // Normalize date to first day of month (YYYY-MM-01)
    // Priority: query param (for now, since PATH structure doesn't capture date yet)
    // TODO: If route changed to [idExc]/[lang]/[date]/route.ts, use PATH param
    const targetDate = normalizeToMonthStart(dateParam)

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[LOAD_LIMITS] Fetching:', {
        idExc,
        lang,
        dateParam,
        targetDate,
      })
    }

    // Fetch from loadLimits endpoint
    const response = await fetchAtlantico(
      `/loadLimits/${idExc}/${lang}/${targetDate}`,
      { revalidate: 60 } // Cache 60 seconds
    )

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch limits',
          message: `HTTP ${response.status}: ${response.statusText}`,
          dateUsed: targetDate,
          ok: false,
          idExc,
          lang,
          dates: [],
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const extractedDates = extractDatesFromLimits(data, targetDate)

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[LOAD_LIMITS] Response:', {
        idExc,
        lang,
        dateUsed: targetDate,
        hasData: !!data,
        nbDates: extractedDates.length,
        first5Dates: extractedDates.slice(0, 5),
        rawKeys: Object.keys(data),
      })
    }

    // Return normalized response
    return NextResponse.json(
      {
        ok: true,
        idExc,
        lang,
        dateUsed: targetDate,
        dates: extractedDates,
        ...(process.env.NODE_ENV === 'development' && { raw: data }), // Include raw in dev
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30', // 60s cache
        },
      }
    )
  } catch (error) {
    console.error('[LOAD_LIMITS] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch limits',
        message: error instanceof Error ? error.message : 'Unknown error',
        ok: false,
        dates: [],
      },
      { status: 500 }
    )
  }
}


