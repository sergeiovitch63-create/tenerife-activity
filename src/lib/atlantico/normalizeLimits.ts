/**
 * Shared normalization functions for loadLimits API response
 * Used by both /api/atlantico/limits and /api/atlantico/calendar
 */

import { parseYYYYMMDD, toYMD, isFutureOrToday } from './date'
import { getBaseUrl } from './client'
import { mapLocaleToAtlanticoLang } from './lang'

export interface Session {
  time: string
  available: number
  precio: number | null
  bruto: number | null
  sessionId: string | null
  rcId: string | null
  TipoReservaId: string | null
}

export interface NormalizedLimits {
  quote: number | null
  wdays: number[]
  dates: Array<{
    limit: number
    date: string
    used: number
  }>
  sessionsByDay: Record<string, Session[]>
}

/**
 * Normalize month to YYYY-MM-01 format
 */
export function normalizeMonth(monthStr: string | null): string {
  if (!monthStr || typeof monthStr !== 'string') {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }

  // If already in YYYY-MM-01 format
  if (/^\d{4}-\d{2}-01$/.test(monthStr)) {
    return monthStr
  }

  // If in YYYY-MM-DD format, extract YYYY-MM and set to 01
  const match = monthStr.match(/^(\d{4}-\d{2})/)
  if (match) {
    return `${match[1]}-01`
  }

  // Try to parse as Date
  try {
    const date = new Date(monthStr)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      return `${year}-${month}-01`
    }
  } catch {
    // Fall through to default
  }

  // Default to current month
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Extract sessions from limits response
 */
export function extractSessions(raw: any, month: string): Record<string, Session[]> {
  const sessionsByDay: Record<string, Session[]> = {}
  
  if (!raw || typeof raw !== 'object') {
    return sessionsByDay
  }

  // Parse month to get year and month
  const monthMatch = month.match(/^(\d{4})-(\d{2})/)
  if (!monthMatch) {
    return sessionsByDay
  }

  const year = parseInt(monthMatch[1], 10)
  const monthNum = parseInt(monthMatch[2], 10) - 1 // JS months are 0-indexed

  // Format 1: Object with date keys (YYYYMMDD format) - top level
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const dateKeys = Object.keys(raw)
      .filter((key) => /^\d{8}$/.test(key)) // Match YYYYMMDD format
      .sort()

    for (const dateKey of dateKeys) {
      const date = parseYYYYMMDD(dateKey)
      if (!date || !isFutureOrToday(date)) {
        continue
      }

      // Check if date is in requested month
      if (date.getFullYear() !== year || date.getMonth() !== monthNum) {
        continue
      }

      const dayData = raw[dateKey]
      if (!dayData || typeof dayData !== 'object') {
        continue
      }

      const ymd = toYMD(date) // Convert YYYYMMDD to YYYY-MM-DD
      const sessions: Session[] = []

      // Check for sessions array
      if (Array.isArray(dayData.sessions)) {
        for (const session of dayData.sessions) {
          sessions.push({
            time: String(session.time || session.sesTime || '00:00'),
            available: typeof session.available === 'number' ? session.available : typeof session.limit === 'number' ? session.limit - (typeof session.used === 'number' ? session.used : 0) : 0,
            precio: typeof session.precio === 'number' ? session.precio : null,
            bruto: typeof session.bruto === 'number' ? session.bruto : null,
            sessionId: session.sessionId ? String(session.sessionId) : null,
            rcId: session.rcId ? String(session.rcId) : null,
            TipoReservaId: session.TipoReservaId ? String(session.TipoReservaId) : null,
          })
        }
      } else if (dayData.limit && typeof dayData.limit === 'number') {
        // Single session for the day
        const limit = dayData.limit
        const used = typeof dayData.used === 'number' ? dayData.used : 0
        sessions.push({
          time: String(dayData.time || dayData.sesTime || '00:00'),
          available: limit - used,
          precio: typeof dayData.precio === 'number' ? dayData.precio : null,
          bruto: typeof dayData.bruto === 'number' ? dayData.bruto : null,
          sessionId: dayData.sessionId ? String(dayData.sessionId) : null,
          rcId: dayData.rcId ? String(dayData.rcId) : null,
          TipoReservaId: dayData.TipoReservaId ? String(dayData.TipoReservaId) : null,
        })
      }

      if (sessions.length > 0) {
        sessionsByDay[ymd] = sessions
      }
    }
  }

  // Format 1b: Nested sessions object (raw.sessions[YYYYMMDD])
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.sessions && typeof raw.sessions === 'object') {
    const sessionsObj = raw.sessions
    const dateKeys = Object.keys(sessionsObj)
      .filter((key) => /^\d{8}$/.test(key)) // Match YYYYMMDD format
      .sort()

    for (const dateKey of dateKeys) {
      const date = parseYYYYMMDD(dateKey)
      if (!date || !isFutureOrToday(date)) {
        continue
      }

      // Check if date is in requested month
      if (date.getFullYear() !== year || date.getMonth() !== monthNum) {
        continue
      }

      const dayData = sessionsObj[dateKey]
      if (!dayData) {
        continue
      }

      const ymd = toYMD(date) // Convert YYYYMMDD to YYYY-MM-DD
      
      // If already have sessions for this date, merge; otherwise create new
      if (!sessionsByDay[ymd]) {
        sessionsByDay[ymd] = []
      }

      // Handle array of sessions
      if (Array.isArray(dayData)) {
        for (const session of dayData) {
          sessionsByDay[ymd].push({
            time: String(session.time || session.sesTime || '00:00'),
            available: typeof session.available === 'number' ? session.available : typeof session.limit === 'number' ? session.limit - (typeof session.used === 'number' ? session.used : 0) : 0,
            precio: typeof session.precio === 'number' ? session.precio : null,
            bruto: typeof session.bruto === 'number' ? session.bruto : null,
            sessionId: session.sessionId ? String(session.sessionId) : null,
            rcId: session.rcId ? String(session.rcId) : null,
            TipoReservaId: session.TipoReservaId ? String(session.TipoReservaId) : null,
          })
        }
      } else if (typeof dayData === 'object') {
        // Single session object
        sessionsByDay[ymd].push({
          time: String(dayData.time || dayData.sesTime || '00:00'),
          available: typeof dayData.available === 'number' ? dayData.available : typeof dayData.limit === 'number' ? dayData.limit - (typeof dayData.used === 'number' ? dayData.used : 0) : 0,
          precio: typeof dayData.precio === 'number' ? dayData.precio : null,
          bruto: typeof dayData.bruto === 'number' ? dayData.bruto : null,
          sessionId: dayData.sessionId ? String(dayData.sessionId) : null,
          rcId: dayData.rcId ? String(dayData.rcId) : null,
          TipoReservaId: dayData.TipoReservaId ? String(dayData.TipoReservaId) : null,
        })
      }
    }
  }

  // Format 1c: Nested sessionsByDate object (raw.sessionsByDate[YYYYMMDD])
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.sessionsByDate && typeof raw.sessionsByDate === 'object') {
    const sessionsByDateObj = raw.sessionsByDate
    const dateKeys = Object.keys(sessionsByDateObj)
      .filter((key) => /^\d{8}$/.test(key)) // Match YYYYMMDD format
      .sort()

    for (const dateKey of dateKeys) {
      const date = parseYYYYMMDD(dateKey)
      if (!date || !isFutureOrToday(date)) {
        continue
      }

      // Check if date is in requested month
      if (date.getFullYear() !== year || date.getMonth() !== monthNum) {
        continue
      }

      const dayData = sessionsByDateObj[dateKey]
      if (!dayData) {
        continue
      }

      const ymd = toYMD(date) // Convert YYYYMMDD to YYYY-MM-DD
      
      // If already have sessions for this date, merge; otherwise create new
      if (!sessionsByDay[ymd]) {
        sessionsByDay[ymd] = []
      }

      // Handle array of sessions
      if (Array.isArray(dayData)) {
        for (const session of dayData) {
          sessionsByDay[ymd].push({
            time: String(session.time || session.sesTime || '00:00'),
            available: typeof session.available === 'number' ? session.available : typeof session.limit === 'number' ? session.limit - (typeof session.used === 'number' ? session.used : 0) : 0,
            precio: typeof session.precio === 'number' ? session.precio : null,
            bruto: typeof session.bruto === 'number' ? session.bruto : null,
            sessionId: session.sessionId ? String(session.sessionId) : null,
            rcId: session.rcId ? String(session.rcId) : null,
            TipoReservaId: session.TipoReservaId ? String(session.TipoReservaId) : null,
          })
        }
      } else if (typeof dayData === 'object') {
        // Single session object
        sessionsByDay[ymd].push({
          time: String(dayData.time || dayData.sesTime || '00:00'),
          available: typeof dayData.available === 'number' ? dayData.available : typeof dayData.limit === 'number' ? dayData.limit - (typeof dayData.used === 'number' ? dayData.used : 0) : 0,
          precio: typeof dayData.precio === 'number' ? dayData.precio : null,
          bruto: typeof dayData.bruto === 'number' ? dayData.bruto : null,
          sessionId: dayData.sessionId ? String(dayData.sessionId) : null,
          rcId: dayData.rcId ? String(dayData.rcId) : null,
          TipoReservaId: dayData.TipoReservaId ? String(dayData.TipoReservaId) : null,
        })
      }
    }
  }

  // Format 2: Array of dates with limit/used arrays
  if (Array.isArray(raw.dates) && Array.isArray(raw.limit)) {
    const dates = raw.dates
    const limits = raw.limit
    const used = raw.used || []

    for (let i = 0; i < dates.length; i++) {
      const dateStr = String(dates[i])
      const date = parseYYYYMMDD(dateStr)
      if (!date || !isFutureOrToday(date)) {
        continue
      }

      // Check if date is in requested month
      if (date.getFullYear() !== year || date.getMonth() !== monthNum) {
        continue
      }

      const limit = typeof limits[i] === 'number' ? limits[i] : 0
      const usedCount = typeof used[i] === 'number' ? used[i] : 0
      const remaining = limit - usedCount

      if (remaining > 0) {
        const ymd = toYMD(date)
        sessionsByDay[ymd] = [{
          time: '00:00',
          available: remaining,
          precio: null,
          bruto: null,
          sessionId: null,
          rcId: null,
          TipoReservaId: null,
        }]
      }
    }
  }

  return sessionsByDay
}

/**
 * Extract dates array from limits response
 */
export function extractDates(raw: any, month: string): Array<{ limit: number; date: string; used: number }> {
  const dates: Array<{ limit: number; date: string; used: number }> = []
  
  if (!raw || typeof raw !== 'object') {
    return dates
  }

  // Parse month
  const monthMatch = month.match(/^(\d{4})-(\d{2})/)
  if (!monthMatch) {
    return dates
  }

  const year = parseInt(monthMatch[1], 10)
  const monthNum = parseInt(monthMatch[2], 10) - 1

  // Format 1: Array of dates with limit/used arrays
  if (Array.isArray(raw.dates) && Array.isArray(raw.limit)) {
    const dateArray = raw.dates
    const limits = raw.limit
    const used = raw.used || []

    for (let i = 0; i < dateArray.length; i++) {
      const dateStr = String(dateArray[i])
      const date = parseYYYYMMDD(dateStr)
      if (!date || !isFutureOrToday(date)) {
        continue
      }

      if (date.getFullYear() !== year || date.getMonth() !== monthNum) {
        continue
      }

      const limit = typeof limits[i] === 'number' ? limits[i] : 0
      const usedCount = typeof used[i] === 'number' ? used[i] : 0

      dates.push({
        limit,
        date: toYMD(date),
        used: usedCount,
      })
    }
  }

  // Format 2: Object with date keys
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const dateKeys = Object.keys(raw)
      .filter((key) => /^\d{8}$/.test(key))
      .sort()

    for (const dateKey of dateKeys) {
      const date = parseYYYYMMDD(dateKey)
      if (!date || !isFutureOrToday(date)) {
        continue
      }

      if (date.getFullYear() !== year || date.getMonth() !== monthNum) {
        continue
      }

      const dayData = raw[dateKey]
      const limit = typeof dayData?.limit === 'number' ? dayData.limit : 0
      const used = typeof dayData?.used === 'number' ? dayData.used : 0

      dates.push({
        limit,
        date: toYMD(date),
        used,
      })
    }
  }

  return dates.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Fetch and normalize loadLimits response
 * This is the single source of truth for limits normalization
 */
export async function normalizeLimits(
  eventId: string,
  language: string,
  month: string
): Promise<{
  normalized: NormalizedLimits
  raw: any
  upstreamStatus: number
  upstreamUrl: string
}> {
  // Normalize month
  const normalizedMonth = normalizeMonth(month)
  
  // Normalize language
  const normalizedLang = language.length === 3 && ['CAS', 'ENG', 'FRA', 'RUS', 'ALE', 'ITA'].includes(language.toUpperCase())
    ? language.toUpperCase()
    : mapLocaleToAtlanticoLang(language)

  // Build endpoint
  const endpoint = `/loadLimits/${eventId}/${normalizedLang}/${normalizedMonth}`
  const baseUrl = getBaseUrl()
  const fullUrl = `${baseUrl}${endpoint}`

  // DEV: Log request (server-side only) - ONE CLEAR LINE
  if (process.env.NODE_ENV === 'development') {
    console.log('[ATLANTICO_UPSTREAM]', {
      baseUrl,
      fullUrl,
      eventId,
      lang: normalizedLang,
      monthStart: normalizedMonth,
    })
  }

  let raw: any
  let upstreamStatus: number = 0
  let upstreamResponseText: string | null = null

  try {
    // Fetch with direct fetch to capture status code
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        ...(process.env.ATLANTICO_TOKEN ? { 'Authorization': `Bearer ${process.env.ATLANTICO_TOKEN}` } : {}),
      },
      cache: 'no-store',
    })

    upstreamStatus = response.status
    upstreamResponseText = await response.text()

    // DEV: Log response status and preview (server-side only) - ONE CLEAR LINE
    if (process.env.NODE_ENV === 'development') {
      const responsePreview = upstreamResponseText ? upstreamResponseText.substring(0, 150) : 'no response'
      console.log('[ATLANTICO_UPSTREAM_RESPONSE]', {
        fullUrl,
        eventId,
        upstreamStatus,
        responsePreview,
      })
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Parse JSON
    const trimmed = upstreamResponseText.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        raw = JSON.parse(trimmed)
      } catch {
        // Fall through
      }
    }

    // If not JSON, try double-encoded JSON string
    if (!raw && trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        const once = JSON.parse(trimmed)
        if (typeof once === 'string') {
          const tt = once.trim()
          if ((tt.startsWith('{') && tt.endsWith('}')) || (tt.startsWith('[') && tt.endsWith(']'))) {
            raw = JSON.parse(tt)
          }
        } else {
          raw = once
        }
      } catch {
        // Fall through
      }
    }

    if (!raw) {
      throw new Error('Response is not valid JSON')
    }
  } catch (error) {
    // DEV: Log error (server-side only)
    if (process.env.NODE_ENV === 'development') {
      console.error('[NORMALIZE_LIMITS] Fetch error:', {
        baseUrl,
        endpoint,
        fullUrl,
        eventId,
        language: normalizedLang,
        month: normalizedMonth,
        upstreamStatus,
        error: error instanceof Error ? error.message : String(error),
        responsePreview: upstreamResponseText ? upstreamResponseText.substring(0, 200) : null,
      })
    }
    throw error
  }

  // Extract data
  const quote = typeof raw.quote === 'number' ? raw.quote : null
  const wdays = Array.isArray(raw.dates?.wdays) ? raw.dates.wdays : Array.isArray(raw.wdays) ? raw.wdays : []
  const dates = extractDates(raw, normalizedMonth)
  const sessionsByDay = extractSessions(raw, normalizedMonth)

  // DEV: Detailed debug log (server-side only) - ONE CLEAR LINE with key metrics
  if (process.env.NODE_ENV === 'development') {
    // Analyze structure
    const hasSessions = raw && typeof raw === 'object' && 'sessions' in raw
    const hasSessionsByDay = raw && typeof raw === 'object' && 'sessionsByDay' in raw
    const hasSessionsByDate = raw && typeof raw === 'object' && 'sessionsByDate' in raw
    
    // Find session keys (any format) - count YYYYMMDD keys
    const sessionKeys: string[] = []
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const allKeys = Object.keys(raw)
      // Look for YYYYMMDD keys (top-level)
      const dateKeys = allKeys.filter(key => /^\d{8}$/.test(key))
      sessionKeys.push(...dateKeys)
      
      // Also check nested structures
      if (raw.sessions && typeof raw.sessions === 'object') {
        const nestedKeys = Object.keys(raw.sessions).filter(key => /^\d{8}$/.test(key))
        sessionKeys.push(...nestedKeys)
      }
      if (raw.sessionsByDate && typeof raw.sessionsByDate === 'object') {
        const nestedKeys = Object.keys(raw.sessionsByDate).filter(key => /^\d{8}$/.test(key))
        sessionKeys.push(...nestedKeys)
      }
    }

    const responsePreview = upstreamResponseText 
      ? upstreamResponseText.substring(0, 150) 
      : JSON.stringify(raw).substring(0, 150)

    // ONE CLEAR LINE with key metrics
    console.log('[ATLANTICO_PARSING]', {
      fullUrl,
      eventId,
      upstreamStatus,
      sessionKeysFound: sessionKeys.length,
      availableDatesCount: Object.keys(sessionsByDay).length,
      hasSessions: hasSessions || hasSessionsByDate,
      responsePreview,
      sessionKeysSample: sessionKeys.slice(0, 3),
    })

    // Additional log if sessionsByDay is empty but upstream returned 200
    if (Object.keys(sessionsByDay).length === 0 && upstreamStatus === 200) {
      console.warn('[ATLANTICO_EMPTY]', {
        fullUrl,
        eventId,
        upstreamStatus,
        sessionKeysFound: sessionKeys.length,
        rawTopKeys: raw && typeof raw === 'object' ? Object.keys(raw).slice(0, 10) : [],
        hasSessions,
        hasSessionsByDate,
        responsePreview,
      })
    }
  }

  return {
    normalized: {
      quote,
      wdays,
      dates,
      sessionsByDay,
    },
    raw,
    upstreamStatus,
    upstreamUrl: fullUrl,
  }
}

