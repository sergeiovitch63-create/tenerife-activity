/**
 * GET /api/atlantico/loadLimits/[idExc]/[lang]/[date]
 * 
 * Fetches availability using loadLimits endpoint with idExc (excursion ID)
 * Date is in PATH (as per Atlántico API documentation)
 * 
 * Route parameters:
 * - idExc: Excursion ID (e.g., "1831")
 * - lang: Language code (e.g., 'FRA', 'ENG', 'CAS') - uppercase as per doc
 * - date: Date in format YYYY-MM-DD (will be normalized to first day of month, e.g., "2026-02-01")
 * 
 * Returns normalized response:
 * {
 *   ok: true,
 *   idExc: string,
 *   lang: string,
 *   dateUsed: "YYYY-MM-DD",
 *   dates: ["YYYY-MM-DD", ...],  // Array of available dates (normalized from YYYYMMDD if needed)
 *   raw?: any  // Raw response (DEV only)
 * }
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'

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
 * Supports YYYYMMDD format (8 digits) as per Atlántico doc
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

  // Format 3: sessionsByDate object (PRIORITY - source of truth)
  // Keys are in format "YYYYMMDD" (8 digits) according to Atlántico doc
  if (limitsResponse.sessionsByDate && typeof limitsResponse.sessionsByDate === 'object') {
    for (const dateStr of Object.keys(limitsResponse.sessionsByDate)) {
      // Support YYYYMMDD format (8 digits) - doc Atlántico format
      let normalizedDate: string | null = null
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
        const sessions = limitsResponse.sessionsByDate[dateStr]
        if (Array.isArray(sessions) && sessions.length > 0) {
          dates.push(normalizedDate)
          seen.add(normalizedDate)
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
  { params }: { params: Promise<{ idExc: string; lang: string; date: string }> }
) {
  try {
    const routeParams = await params
    const { idExc, lang, date: dateParam } = routeParams

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
    const targetDate = normalizeToMonthStart(dateParam)

    // Normalize language to uppercase (as per Atlántico doc: ENG, FRA, CAS, etc.)
    const normalizedLang = lang.toUpperCase()

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[LOAD_LIMITS] Fetching (PATH):', {
        idExc,
        lang,
        normalizedLang,
        datePath: dateParam,
        targetDate,
        endpointUrl: `/loadLimits/${idExc}/${normalizedLang}/${targetDate}`,
      })
    }

    // Fetch from loadLimits endpoint (date in PATH as per doc, language in uppercase)
    const response = await fetchAtlantico(
      `/loadLimits/${idExc}/${normalizedLang}/${targetDate}`,
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

    // DEV log: Enhanced diagnostic logging
    if (process.env.NODE_ENV === 'development') {
      const payloadSize = JSON.stringify(data).length
      const sessionsByDateKeys = data.sessionsByDate ? Object.keys(data.sessionsByDate) : []
      const datesArray = Array.isArray(data.dates) ? data.dates : []
      
      // Detect format of sessionsByDate keys
      let sessionsFormat = 'NONE'
      if (sessionsByDateKeys.length > 0) {
        const sampleKey = sessionsByDateKeys[0]
        if (/^\d{8}$/.test(sampleKey)) {
          sessionsFormat = 'YYYYMMDD'
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(sampleKey)) {
          sessionsFormat = 'YYYY-MM-DD'
        } else {
          sessionsFormat = 'OTHER'
        }
      }
      
      // Detect format of dates array
      let datesFormat = 'NONE'
      if (datesArray.length > 0 && typeof datesArray[0] === 'string') {
        const sampleDate = datesArray[0]
        if (/^\d{8}$/.test(sampleDate)) {
          datesFormat = 'YYYYMMDD'
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(sampleDate)) {
          datesFormat = 'YYYY-MM-DD'
        } else {
          datesFormat = 'OTHER'
        }
      }
      
      console.log('[LOAD_LIMITS] Response:', {
        idExc,
        lang: normalizedLang,
        dateUsed: targetDate,
        status: response.status,
        payloadSizeBytes: payloadSize,
        hasData: !!data,
        nbDates: extractedDates.length,
        first5Dates: extractedDates.slice(0, 5),
        rawKeys: Object.keys(data),
        hasSessionsByDate: !!data.sessionsByDate,
        sessionsByDateKeysCount: sessionsByDateKeys.length,
        sessionsByDateFirst10Keys: sessionsByDateKeys.slice(0, 10),
        sessionsByDateMinKey: sessionsByDateKeys.length > 0 ? [...sessionsByDateKeys].sort()[0] : null,
        sessionsByDateMaxKey: sessionsByDateKeys.length > 0 ? [...sessionsByDateKeys].sort().reverse()[0] : null,
        sessionsByDateFormat: sessionsFormat,
        datesArrayCount: datesArray.length,
        datesArrayFirst10: datesArray.slice(0, 10),
        datesArrayMin: datesArray.length > 0 ? [...datesArray].sort()[0] : null,
        datesArrayMax: datesArray.length > 0 ? [...datesArray].sort().reverse()[0] : null,
        datesArrayFormat: datesFormat,
      })
    }

    // Return normalized response
    return NextResponse.json(
      {
        ok: true,
        idExc,
        lang: normalizedLang,
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
