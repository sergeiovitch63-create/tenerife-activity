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

    // Proxy to /api/atlantico/limits (single source of truth)
    const baseUrl = request.nextUrl.origin
    const limitsUrl = new URL('/api/atlantico/limits', baseUrl)
    limitsUrl.searchParams.set('eventId', eventId)
    limitsUrl.searchParams.set('lang', lang)
    if (monthParam) {
      limitsUrl.searchParams.set('month', monthParam)
    }

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

    const limitsData: LimitsResponse = await limitsResponse.json()

    if (!limitsData.ok) {
      return NextResponse.json<CalendarErrorResponse>(
        {
          ok: false,
          eventId,
          lang,
          month: limitsData.monthStart || monthParam || '',
          dates: [],
          error: 'Failed to fetch limits',
        },
        { status: 500 }
      )
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

    return NextResponse.json<CalendarOkResponse>(
      {
        ok: true,
        eventId,
        lang,
        month: limitsData.monthStart,
        dates: limitsData.availableDates,
        sessionsByDate,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=150',
        },
      }
    )
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
