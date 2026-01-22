/**
 * GET /api/atlantico/limits?eventId=&lang=&month=YYYY-MM-01
 * 
 * Fetches availability limits from Atlantico API and returns normalized JSON
 * with sessions by day
 * 
 * Single source of truth: loadLimits endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { normalizeLimits } from '@/lib/atlantico/normalizeLimits'

export interface LimitsResponse {
  ok: true
  quote: number | null
  monthStart: string // YYYY-MM-01
  sessionsByDay: Record<string, Array<{
    time: string // HH:mm
    available: number
    sessionId?: string
    raw?: any
  }>>
  availableDates: string[] // YYYY-MM-DD[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const eventId = searchParams.get('eventId')
    const lang = searchParams.get('lang')
    const monthParam = searchParams.get('month')

    if (!eventId || !lang) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing parameters',
          message: 'eventId and lang are required',
        },
        { status: 400 }
      )
    }

    // Use shared normalizeLimits function (single source of truth)
    const { normalized, upstreamStatus, upstreamUrl } = await normalizeLimits(eventId, lang, monthParam || '')
    const { quote, sessionsByDay } = normalized

    // Filter sessions: remove invalid times ("-" and ""), keep "00:00" if upstream provides it
    const filteredSessionsByDay: Record<string, Array<{
      time: string
      available: number
      sessionId?: string
      raw?: any
    }>> = {}

    for (const [date, sessions] of Object.entries(sessionsByDay)) {
      const filtered = sessions
        .filter(s => {
          const time = s.time || ''
          // Filter out invalid times, but keep "00:00" if upstream provides it
          return time !== '-' && time !== '' && time.trim() !== ''
        })
        .map(s => ({
          time: s.time || '00:00',
          available: s.available,
          ...(s.sessionId ? { sessionId: s.sessionId } : {}),
          ...(process.env.NODE_ENV === 'development' ? { raw: s } : {}),
        }))
      
      if (filtered.length > 0) {
        filteredSessionsByDay[date] = filtered
      }
    }

    // Extract available dates from sessionsByDay keys
    const availableDates = Object.keys(filteredSessionsByDay).sort()

    // DEV: Log response (server-side only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[ATLANTICO_LIMITS] Response:', {
        eventId,
        lang,
        monthStart: normalized.dates[0]?.date ? 
          normalized.dates[0].date.substring(0, 7) + '-01' : 
          monthParam,
        upstreamStatus,
        upstreamUrl,
        sessionsByDayKeys: Object.keys(filteredSessionsByDay).length,
        availableDatesCount: availableDates.length,
        sampleDates: availableDates.slice(0, 3),
      })
    }

    const monthStart = normalized.dates[0]?.date ? 
      normalized.dates[0].date.substring(0, 7) + '-01' : 
      monthParam || ''

    return NextResponse.json<LimitsResponse>(
      {
        ok: true,
        quote,
        monthStart,
        sessionsByDay: filteredSessionsByDay,
        availableDates,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    )
  } catch (error) {
    // Server-only logging
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATLANTICO_LIMITS] Error:', error)
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch limits',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
