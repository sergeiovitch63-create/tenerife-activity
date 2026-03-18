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

/**
 * Project wdays onto dates for a specific month (event 840 only).
 * wdays format: [1=Monday, 2=Tuesday, ..., 7=Sunday]
 */
function projectWdaysForMonth(monthStart: string, wdays: number[]): string[] {
  if (!Array.isArray(wdays) || wdays.length === 0) return []
  const match = monthStart.match(/^(\d{4})-(\d{2})/)
  if (!match) return []
  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: string[] = []
  const lastDay = new Date(year, month + 1, 0).getDate()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const startDay = isCurrentMonth ? today.getDate() : 1
  for (let day = startDay; day <= lastDay; day++) {
    const d = new Date(year, month, day)
    const jsDow = d.getDay()
    const wday = jsDow === 0 ? 7 : jsDow
    if (wdays.includes(wday) && d >= today) {
      result.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    }
  }
  return result.sort()
}

// Mark route as dynamic (uses searchParams)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  calendarMode: 'sessions' | 'dates' | 'wdays_only' | 'none'
  projectedAvailableDates?: string[] // Only for wdays_only mode
  requiresSessionTime: boolean // true when sessions exist and we can pick an actual time, false when only dates or wdays_only
  availabilityMode?: 'NORMAL' | 'NO_SCHEDULE_PUBLISHED' // Deprecated: use calendarMode instead
  // Debug fields (only when debug=1)
  debug?: {
    upstreamUrl: string
    hasUpstreamSessions: boolean
    fallbackTimesCount: number | null
    sampleSessionsByDayKeys: string[]
    sampleFirst3RawDates: string[]
    sampleFirst3ComputedAvailableDates: string[]
    hasWdays: boolean
    hasDatesArray: boolean
    hasSessionsByDate: boolean
    counts: {
      totalDates: number
      availableDates: number
      datesWithSessions: number
    }
  }
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

    // Check for debug parameters
    const debug = searchParams.get('debug') === '1'
    const rawMode = searchParams.get('raw') === '1'

    // Verify eventId exists in Atlantico (optional check, only if raw mode)
    if (rawMode) {
      try {
        const { getBaseUrl } = await import('@/lib/atlantico/client')
        const baseUrl = getBaseUrl()
        const eventDetailsUrl = `${baseUrl}/eventDetails/${eventId}/ENG`
        const eventDetailsResponse = await fetch(eventDetailsUrl, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
          },
          cache: 'no-store',
        })
        
        if (!eventDetailsResponse.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: 'Invalid event ID',
              reason: 'INVALID_EVENT_ID_FOR_ATLANTICO',
              message: `Event ID ${eventId} not found in Atlantico (eventDetails returned ${eventDetailsResponse.status})`,
            },
            { status: 404 }
          )
        }
      } catch (error) {
        // If eventDetails check fails, continue anyway (might be network issue)
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ATLANTICO_LIMITS] EventDetails check failed:', error)
        }
      }
    }

    // Use shared normalizeLimits function (single source of truth)
    const { normalized, upstreamStatus, upstreamUrl, raw } = await normalizeLimits(eventId, lang, monthParam || '')
    const { quote, sessionsByDay, dates, calendarMode: normalizedCalendarMode, projectedAvailableDates, requiresSessionTime: normalizedRequiresSessionTime } = normalized

    // CRITICAL: calendarMode MUST be a non-null string (fallback to 'none' if missing)
    const calendarMode: 'sessions' | 'dates' | 'wdays_only' | 'none' = normalizedCalendarMode || 'none'
    
    // CRITICAL: requiresSessionTime MUST be calculated from calendarMode (rule: only 'sessions' requires time)
    const requiresSessionTime: boolean = normalizedRequiresSessionTime !== undefined 
      ? normalizedRequiresSessionTime 
      : (calendarMode === 'sessions')

    // If wdays_only mode, return with projected dates
    if (calendarMode === 'wdays_only') {
      const monthStart = monthParam || (() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      })()
      
      const hasDatesDate = Array.isArray(raw?.dates?.date) && raw.dates.date.length > 0
      const hasSessions = raw?.dates?.sessions && typeof raw.dates.sessions === 'object'
      const projectedCount = projectedAvailableDates?.length || 0
      
      // DEV log
      if (process.env.NODE_ENV === 'development') {
        console.log('[LIMITS]', {
          eventId,
          calendarMode,
          hasDatesDate,
          hasSessions,
          projectedCount,
          upstreamStatus,
        })
      }
      
      const debugInfo = debug ? {
        upstreamUrl,
        hasUpstreamSessions: false,
        fallbackTimesCount: null,
        sampleSessionsByDayKeys: [],
        sampleFirst3RawDates: [],
        sampleFirst3ComputedAvailableDates: projectedAvailableDates?.slice(0, 3) || [],
        hasWdays: Array.isArray(raw?.dates?.wdays) && raw.dates.wdays.length > 0,
        hasDatesArray: hasDatesDate,
        hasSessionsByDate: false,
        hasSessionsByDay: false,
        hasDates: false,
        counts: {
          totalDates: 0,
          availableDates: projectedCount,
          datesWithSessions: 0,
        },
      } : undefined
      
      return NextResponse.json<LimitsResponse>(
        {
          ok: true,
          quote: quote,
          monthStart,
          sessionsByDay: {},
          availableDates: projectedAvailableDates || [],
          calendarMode: 'wdays_only',
          projectedAvailableDates: projectedAvailableDates || [],
          requiresSessionTime: false, // wdays_only never requires session time
          availabilityMode: 'NO_SCHEDULE_PUBLISHED', // Deprecated, use calendarMode
          ...(debugInfo ? { debug: debugInfo } : {}),
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
          },
        }
      )
    }

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

    // Calculate availableDates from dates array where (limit - used) > 0
    // When limit is 0, use top-level quote as effective limit (Atlantico format for events like 840)
    const quoteVal = quote ?? 0
    const availableDatesFromLimits = dates
      .filter(d => {
        const limit = d.limit || 0
        const used = d.used || 0
        const effectiveLimit = limit > 0 ? limit : quoteVal
        return (effectiveLimit - used) > 0
      })
      .map(d => d.date)
      .sort()

    // Also include dates from sessionsByDay (in case they have sessions but no explicit limit/used)
    const availableDatesFromSessions = Object.keys(filteredSessionsByDay)
    
    // Merge and deduplicate
    let availableDates = Array.from(new Set([...availableDatesFromLimits, ...availableDatesFromSessions])).sort()

    // When API returns wdays but sparse date array, project all matching weekdays in month
    // Fallback when API ne renvoie pas wdays
    const WDAYS_FALLBACK: Record<string, number[]> = {
      '810': [5], '1066': [5],
      '1676': [5], '1679': [5], '1677': [5],
      '1819': [3, 6], '1820': [3, 6],
      '1827': [2, 4], '1828': [2, 4], '1829': [2, 4], '1830': [2, 4],
      '1831': [1, 2, 3, 4, 5, 6, 7], '1832': [1, 2, 3, 4, 5, 6, 7],
    }
    const wdaysFromApi = Array.isArray(raw?.dates?.wdays) ? raw.dates.wdays : []
    const wdaysToUse =
      wdaysFromApi.length > 0 ? wdaysFromApi : (WDAYS_FALLBACK[eventId] ?? [])
    if (wdaysToUse.length > 0) {
      const monthStart = monthParam || (() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      })()
      const projected = projectWdaysForMonth(monthStart, wdaysToUse)
      if (projected.length > 0) {
        availableDates = Array.from(new Set([...availableDates, ...projected])).sort()
      }
    }
    // Safety net: if availableDates still empty for known WDAYS_FALLBACK events, force projection
    if (availableDates.length === 0 && WDAYS_FALLBACK[eventId]) {
      const monthStart = monthParam || (() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      })()
      const projected = projectWdaysForMonth(monthStart, WDAYS_FALLBACK[eventId])
      if (projected.length > 0) {
        availableDates = projected
      }
    }

    // Calculate debug info
    const hasDatesDate = Array.isArray(raw?.dates?.date) && raw.dates.date.length > 0
    const hasSessions = raw?.dates?.sessions && typeof raw.dates.sessions === 'object'
    const hasWdays = Array.isArray(raw?.dates?.wdays) && raw.dates.wdays.length > 0
    const hasSessionsByDate = typeof raw?.sessionsByDate === 'object' && raw.sessionsByDate !== null && Object.keys(raw.sessionsByDate).length > 0
    
    // Fallback: if sessionsByDay is empty but we have availableDates, fetch times from event-details
    const hasUpstreamSessions = Object.keys(filteredSessionsByDay).length > 0
    let fallbackTimesCount: number | null = null
    
    if (!hasUpstreamSessions && availableDates.length > 0) {
      try {
        // Build internal API URL (use request URL as base)
        const baseUrl = request.nextUrl.origin
        const eventDetailsUrl = `${baseUrl}/api/atlantico/event-details?eventId=${encodeURIComponent(eventId)}&lang=ENG`
        
        // Fetch event details to get times
        const eventDetailsResponse = await fetch(eventDetailsUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          cache: 'no-store',
        })
        
        if (eventDetailsResponse.ok) {
          const eventDetails = await eventDetailsResponse.json()
          const times = Array.isArray(eventDetails.times) ? eventDetails.times : []
          
          // Filter invalid times: null, "", "00:00"
          const validTimes = times
            .map((t: unknown) => String(t || '').trim())
            .filter((t: string) => t !== '' && t !== '00:00' && t !== 'null')
            .slice(0, 20) // Limit to 20 times max per date
          
          fallbackTimesCount = validTimes.length
          
          if (validTimes.length > 0) {
            // Map each available date to these times
            // Use available count from dates array; when limit is 0 or no dateData (projected), use quote
            for (const date of availableDates) {
              const dateData = dates.find(d => d.date === date)
              const limit = dateData?.limit ?? 0
              const used = dateData?.used ?? 0
              const effectiveLimit = limit > 0 ? limit : quoteVal
              const available = effectiveLimit - used

              // Only add if available > 0
              if (available > 0) {
                filteredSessionsByDay[date] = validTimes.map((time: string) => ({
                  time,
                  available,
                }))
              }
            }
          }
        }
      } catch (error) {
        // Silently fail - sessionsByDay stays empty, but availableDates remains correct
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ATLANTICO_LIMITS] Fallback to event-details failed:', error)
        }
      }
    }

    // CRITICAL: monthStart MUST be a valid YYYY-MM-01 string (never empty)
    const monthStart = (() => {
      if (normalized.dates && normalized.dates.length > 0 && normalized.dates[0]?.date) {
        const firstDate = normalized.dates[0].date
        if (firstDate && firstDate.length >= 7) {
          return firstDate.substring(0, 7) + '-01'
        }
      }
      if (monthParam) {
        return monthParam
      }
      // Fallback: current month
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    })()

    // Prepare debug information if requested
    const debugInfo = debug ? {
      upstreamUrl,
      hasUpstreamSessions,
      fallbackTimesCount,
      sampleSessionsByDayKeys: Object.keys(filteredSessionsByDay).slice(0, 3),
      sampleFirst3RawDates: (() => {
        // Get raw dates from upstream response
        if (raw?.dates && typeof raw.dates === 'object' && Array.isArray(raw.dates.date)) {
          return raw.dates.date.slice(0, 3).map((d: unknown) => String(d))
        }
        // Fallback: convert normalized dates back to YYYYMMDD
        return dates.slice(0, 3).map((d: { date: string }) => d.date.replace(/-/g, ''))
      })(),
      sampleFirst3ComputedAvailableDates: availableDates.slice(0, 3),
      hasWdays,
      hasDatesArray: hasDatesDate,
      hasSessionsByDate,
      counts: {
        totalDates: dates.length,
        availableDates: availableDates.length,
        datesWithSessions: Object.keys(filteredSessionsByDay).length,
      },
    } : undefined

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      const projectedCount = projectedAvailableDates?.length || 0
      console.log('[LIMITS]', {
        eventId,
        calendarMode,
        hasDatesDate,
        hasSessions,
        projectedCount,
        availableDatesCount: availableDates.length,
        sessionsByDayCount: Object.keys(filteredSessionsByDay).length,
        upstreamStatus,
      })
    }

    // Build response
    // CRITICAL: Both calendarMode and requiresSessionTime MUST be present (never undefined/null)
    // calendarMode is already guaranteed to be non-null (set at top of function)
    // requiresSessionTime is already calculated from calendarMode (set at top of function)
    
    const responseData: LimitsResponse & { rawAtlantico?: any; normalized?: any } = {
      ok: true,
      quote: quote ?? null,
      monthStart: monthStart, // ALWAYS valid YYYY-MM-01 string (calculated above with fallbacks)
      sessionsByDay: filteredSessionsByDay,
      availableDates: availableDates || [],
      calendarMode: calendarMode, // ALWAYS present, never null/undefined (guaranteed at top with fallback to 'none')
      requiresSessionTime: requiresSessionTime, // ALWAYS present, never undefined (calculated from calendarMode: only 'sessions' = true)
      ...(projectedAvailableDates ? { projectedAvailableDates } : {}),
      availabilityMode: (calendarMode === 'none') ? 'NO_SCHEDULE_PUBLISHED' : 'NORMAL', // Deprecated, use calendarMode (wdays_only already handled above)
      ...(debugInfo ? { debug: debugInfo } : {}),
    }
    
    // If raw mode, include raw Atlantico response and normalized data
    if (rawMode) {
      responseData.rawAtlantico = raw
      responseData.normalized = {
        quote,
        monthStart,
        sessionsByDay: filteredSessionsByDay,
        availableDates,
        dates,
      }
    }

    return NextResponse.json<LimitsResponse>(
      responseData,
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

    // CRITICAL: Even on error, return a valid response structure with calendarMode and requiresSessionTime
    // This prevents "Failed to fetch limits" from blocking the frontend
    const { searchParams } = request.nextUrl
    const eventId = searchParams.get('eventId')
    const monthParam = searchParams.get('month')
    const fallbackMonthStart = monthParam || (() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    })()

    // On error: still project dates for events with WDAYS_FALLBACK (e.g. 810, 1066)
    const WDAYS_FALLBACK_ON_ERROR: Record<string, number[]> = {
      '810': [5], '1066': [5],
      '1827': [2, 4], '1828': [2, 4], '1829': [2, 4], '1830': [2, 4],
    }
    const wdays = eventId ? (WDAYS_FALLBACK_ON_ERROR[eventId] ?? []) : []
    const errorAvailableDates = wdays.length > 0
      ? projectWdaysForMonth(fallbackMonthStart, wdays)
      : []

    return NextResponse.json<LimitsResponse>(
      {
        ok: true,
        quote: null,
        monthStart: fallbackMonthStart,
        sessionsByDay: {},
        availableDates: errorAvailableDates,
        calendarMode: 'none', // Safe default - ALWAYS present, never null
        requiresSessionTime: false, // 'none' mode never requires session time - ALWAYS present
        availabilityMode: 'NO_SCHEDULE_PUBLISHED',
      },
      { status: 200 } // Return 200 even on error to prevent frontend blocking
    )
  }
}
