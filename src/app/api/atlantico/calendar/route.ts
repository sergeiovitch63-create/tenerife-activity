/**
 * GET /api/atlantico/calendar?eventId=XXX&lang=ENG&month=YYYY-MM-01
 * 
 * Fetches calendar availability using loadLimits endpoint
 * 
 * Query parameters:
 * - eventId: Event code (required)
 * - lang: Language code (e.g., 'ENG', 'ESP') - defaults to ATLANTICO_LANGUAGE_DEFAULT or 'ENG'
 * - month: First day of month in format YYYY-MM-01 (default: current month)
 * 
 * Returns:
 * - ok: boolean
 * - eventId: string
 * - lang: string
 * - month: string (YYYY-MM-01)
 * - dates: string[] (available dates in YYYY-MM-DD format)
 * - error?: string
 * 
 * Cache: 5 minutes (calendar data)
 */

/**
 * GET /api/atlantico/calendar?eventId=XXX&lang=ENG&month=YYYY-MM-01
 * 
 * Proxy endpoint that calls /api/atlantico/limits (single source of truth)
 * 
 * Query parameters:
 * - eventId: Event code (required)
 * - lang: Language code (e.g., 'ENG', 'ESP') - defaults to ATLANTICO_LANGUAGE_DEFAULT or 'ENG'
 * - month: First day of month in format YYYY-MM-01 (default: current month)
 * 
 * Returns:
 * - ok: boolean
 * - eventId: string
 * - lang: string
 * - month: string (YYYY-MM-01)
 * - dates: string[] (available dates in YYYY-MM-DD format)
 * - sessionsByDate: Record<string, Session[]>
 * 
 * Cache: 5 minutes (calendar data)
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import type { LimitsResponse } from '../limits/route'

// Simple in-memory cache for calendar data
const calendarCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(eventId: string, lang: string, month: string): string {
  return `${eventId}:${lang}:${month}`
}

type CalendarOkResponse = {
  ok: true
  eventId: string
  lang: string
  month: string
  dates: string[]
  sessionsByDate: Record<string, Array<{
    time: string
    available: number
    sessionId?: string
  }>>
  calendarMode: 'sessions' | 'dates' | 'wdays_only' | 'none'
  projectedAvailableDates?: string[] // Only for wdays_only mode
  requiresSessionTime: boolean // true when sessions exist and we can pick an actual time, false when only dates or wdays_only
}

type CalendarErrorResponse = {
  ok: false
  eventId: string
  lang: string
  month: string
  dates: string[]
  error: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const eventId = searchParams.get('eventId')
    const lang = searchParams.get('lang') || process.env.ATLANTICO_LANGUAGE_DEFAULT || 'ENG'
    const monthParam = searchParams.get('month')

    if (!eventId) {
      return NextResponse.json<CalendarErrorResponse>(
        {
          ok: false,
          eventId: '',
          lang,
          month: '',
          dates: [],
          error: 'eventId parameter is required',
        },
        { status: 400 }
      )
    }

    // Normalize month
    const normalizedMonth = monthParam || (() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    })()

    // Check cache
    const cacheKey = getCacheKey(eventId, lang, normalizedMonth)
    const cached = calendarCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // CRITICAL: Ensure cached data has requiresSessionTime (backward compatibility)
      const cachedData = cached.data as CalendarOkResponse
      if (cachedData.ok && cachedData.requiresSessionTime === undefined) {
        // Fix old cache entries: calculate from calendarMode
        cachedData.requiresSessionTime = cachedData.calendarMode === 'sessions'
      }
      
      return NextResponse.json<CalendarOkResponse>(cachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=150',
          'X-Cache': 'HIT',
        },
      })
    }

    // Proxy to /api/atlantico/limits (single source of truth)
    const baseUrl = request.nextUrl.origin
    const limitsUrl = new URL('/api/atlantico/limits', baseUrl)
    limitsUrl.searchParams.set('eventId', eventId)
    limitsUrl.searchParams.set('lang', lang)
    limitsUrl.searchParams.set('month', normalizedMonth)

    const limitsResponse = await fetch(limitsUrl.toString(), {
      cache: 'no-store',
    })

    if (!limitsResponse.ok) {
      const errorData = await limitsResponse.json().catch(() => ({ error: 'Failed to fetch limits' }))
      return NextResponse.json<CalendarErrorResponse>(
        {
          ok: false,
          eventId,
          lang,
          month: monthParam || '',
          dates: [],
          error: errorData.message || errorData.error || 'Failed to fetch limits',
        },
        { status: limitsResponse.status }
      )
    }

    const limitsData = await limitsResponse.json() as LimitsResponse | { ok: false; error?: string; message?: string; monthStart?: string }

    // NEVER return error if limitsResponse.ok === true (HTTP 200)
    // Even if limitsData.ok === false, check if it's a valid response structure
    // Only return error if HTTP status is not 200
    if (!limitsResponse.ok) {
      return NextResponse.json<CalendarErrorResponse>(
        {
          ok: false,
          eventId,
          lang,
          month: (limitsData as any).monthStart || monthParam || '',
          dates: [],
          error: 'Failed to fetch limits',
        },
        { status: limitsResponse.status }
      )
    }

    // If limitsData.ok === false but HTTP was 200, still process it (might be wdays_only with empty data)
    // Only return error if we truly can't process the response
    if (!limitsData.ok && 'error' in limitsData && limitsData.error) {
      // Only return error if it's a real error (not just empty data)
      if (limitsData.error.includes('Invalid event ID') || limitsData.error.includes('Missing parameters')) {
        return NextResponse.json<CalendarErrorResponse>(
          {
            ok: false,
            eventId,
            lang,
            month: (limitsData as any).monthStart || monthParam || '',
            dates: [],
            error: limitsData.error,
          },
          { status: 400 }
        )
      }
    }

    // If limitsData.ok === false but it's not a validation error, treat it as wdays_only with empty data
    if (!limitsData.ok) {
      // Return empty but valid response (wdays_only might have empty data)
      // CRITICAL: requiresSessionTime MUST be present (never undefined)
      const fallbackResponse: CalendarOkResponse = {
        ok: true,
        eventId,
        lang,
        month: (limitsData as any).monthStart || monthParam || normalizedMonth,
        dates: [],
        sessionsByDate: {},
        calendarMode: 'none',
        requiresSessionTime: false, // 'none' mode never requires session time
      }
      
      // Cache the response
      calendarCache.set(cacheKey, {
        data: fallbackResponse,
        timestamp: Date.now(),
      })
      
      return NextResponse.json<CalendarOkResponse>(fallbackResponse, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=150',
          'X-Cache': 'MISS',
        },
      })
    }

    // Convert sessionsByDay to sessionsByDate format (for backward compatibility)
    const sessionsByDate: Record<string, Array<{
      time: string
      available: number
      sessionId?: string
    }>> = {}

    for (const [date, sessions] of Object.entries(limitsData.sessionsByDay)) {
      sessionsByDate[date] = sessions.map(s => ({
        time: s.time,
        available: s.available,
        ...(s.sessionId ? { sessionId: s.sessionId } : {}),
      }))
    }

    // CRITICAL: requiresSessionTime MUST be present (never undefined)
    // Calculate from calendarMode if not provided by limitsData
    const calendarModeValue = limitsData.calendarMode || 'none'
    const requiresSessionTimeValue = limitsData.requiresSessionTime !== undefined 
      ? limitsData.requiresSessionTime 
      : (calendarModeValue === 'sessions')
    
    const responseData: CalendarOkResponse = {
      ok: true,
      eventId,
      lang,
      month: limitsData.monthStart,
      dates: calendarModeValue === 'wdays_only' ? (limitsData.projectedAvailableDates || []) : limitsData.availableDates,
      sessionsByDate,
      calendarMode: calendarModeValue,
      requiresSessionTime: requiresSessionTimeValue, // ALWAYS present, never undefined
      ...(limitsData.projectedAvailableDates ? { projectedAvailableDates: limitsData.projectedAvailableDates } : {}),
    }

    // Cache the response
    calendarCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    })

    // Clean old cache entries (keep only last 100)
    if (calendarCache.size > 100) {
      const entries = Array.from(calendarCache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      calendarCache.clear()
      entries.slice(0, 100).forEach(([key, value]) => {
        calendarCache.set(key, value)
      })
    }

    return NextResponse.json<CalendarOkResponse>(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=150',
        'X-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('[CALENDAR] Error:', error)

    return NextResponse.json<CalendarErrorResponse>(
      {
        ok: false,
        eventId: '',
        lang: '',
        month: '',
        dates: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
