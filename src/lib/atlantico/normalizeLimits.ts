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
  isSoldOut?: boolean // true if available === 0 (but session time is still valid)
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
  calendarMode: 'sessions' | 'dates' | 'wdays_only' | 'none'
  projectedAvailableDates?: string[] // Only for wdays_only mode
  requiresSessionTime: boolean // true when sessions exist and we can pick an actual time, false when only dates or wdays_only
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
 * Validate session time (only checks time format, NOT availability)
 * A session is valid if it has a valid time, even if sold out
 */
function isValidSessionTime(session: { time?: string }): boolean {
  const time = String(session.time || '').trim()
  if (time === '-' || time === '00:00' || time === '') {
    return false
  }
  return true
}

/**
 * Check if session is sold out (available === 0)
 */
function isSessionSoldOut(available: number): boolean {
  return available === 0
}

/**
 * Extract sessions from limits response
 * Source of truth: dates.sessions (sessions by day)
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

  // PRIORITY 1: dates.sessions (source of truth according to requirements)
  // Structure: { dates: { sessions: { YYYYMMDD: [sessions...] } } }
  if (raw.dates && typeof raw.dates === 'object' && !Array.isArray(raw.dates)) {
    const datesObj = raw.dates
    if (datesObj.sessions && typeof datesObj.sessions === 'object') {
      const sessionsObj = datesObj.sessions
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
        const sessions: Session[] = []

        // Handle array of sessions
        if (Array.isArray(dayData)) {
          for (const session of dayData) {
            const time = String(session.time || session.sesTime || '00:00')
            // Only add if time is valid (don't filter by available)
            if (isValidSessionTime({ time })) {
              const availableParsed = typeof session.available === 'number' ? session.available : typeof session.limit === 'number' ? session.limit - (typeof session.used === 'number' ? session.used : 0) : 0
              const parsedSession: Session = {
                time,
                available: availableParsed,
                isSoldOut: isSessionSoldOut(availableParsed),
                precio: typeof session.precio === 'number' ? session.precio : null,
                bruto: typeof session.bruto === 'number' ? session.bruto : null,
                sessionId: session.sessionId ? String(session.sessionId) : null,
                rcId: session.rcId ? String(session.rcId) : null,
                TipoReservaId: session.TipoReservaId ? String(session.TipoReservaId) : null,
              }
              sessions.push(parsedSession)
            }
          }
        } else if (typeof dayData === 'object') {
          // Single session object
          const time = String(dayData.time || dayData.sesTime || '00:00')
          if (isValidSessionTime({ time })) {
            const availableParsed = typeof dayData.available === 'number' ? dayData.available : typeof dayData.limit === 'number' ? dayData.limit - (typeof dayData.used === 'number' ? dayData.used : 0) : 0
            const parsedSession: Session = {
              time,
              available: availableParsed,
              isSoldOut: isSessionSoldOut(availableParsed),
              precio: typeof dayData.precio === 'number' ? dayData.precio : null,
              bruto: typeof dayData.bruto === 'number' ? dayData.bruto : null,
              sessionId: dayData.sessionId ? String(dayData.sessionId) : null,
              rcId: dayData.rcId ? String(dayData.rcId) : null,
              TipoReservaId: dayData.TipoReservaId ? String(dayData.TipoReservaId) : null,
            }
            sessions.push(parsedSession)
          }
        }

        // Only add date if it has at least 1 valid session
        if (sessions.length > 0) {
          sessionsByDay[ymd] = sessions
        }
      }
    }
  }

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
          const time = String(session.time || session.sesTime || '00:00')
          if (isValidSessionTime({ time })) {
            const availableParsed = typeof session.available === 'number' ? session.available : typeof session.limit === 'number' ? session.limit - (typeof session.used === 'number' ? session.used : 0) : 0
            const parsedSession: Session = {
              time,
              available: availableParsed,
              isSoldOut: isSessionSoldOut(availableParsed),
              precio: typeof session.precio === 'number' ? session.precio : null,
              bruto: typeof session.bruto === 'number' ? session.bruto : null,
              sessionId: session.sessionId ? String(session.sessionId) : null,
              rcId: session.rcId ? String(session.rcId) : null,
              TipoReservaId: session.TipoReservaId ? String(session.TipoReservaId) : null,
            }
            sessions.push(parsedSession)
          }
        }
      } else if (dayData.limit && typeof dayData.limit === 'number') {
        // Single session for the day
        const limit = dayData.limit
        const used = typeof dayData.used === 'number' ? dayData.used : 0
        const time = String(dayData.time || dayData.sesTime || '00:00')
        if (isValidSessionTime({ time })) {
          const availableParsed = limit - used
          const parsedSession: Session = {
            time,
            available: availableParsed,
            isSoldOut: isSessionSoldOut(availableParsed),
            precio: typeof dayData.precio === 'number' ? dayData.precio : null,
            bruto: typeof dayData.bruto === 'number' ? dayData.bruto : null,
            sessionId: dayData.sessionId ? String(dayData.sessionId) : null,
            rcId: dayData.rcId ? String(dayData.rcId) : null,
            TipoReservaId: dayData.TipoReservaId ? String(dayData.TipoReservaId) : null,
          }
          sessions.push(parsedSession)
        }
      }

      // Only add date if it has at least 1 valid session
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

      // Fallback: if no sessions format, use limit/used to mark dates as available
      // Use "00:00" as placeholder time (UI will show "Time to be confirmed")
      if (remaining > 0) {
        const ymd = toYMD(date)
        // Only add if we don't already have sessions for this date from other formats
        if (!sessionsByDay[ymd] || sessionsByDay[ymd].length === 0) {
          sessionsByDay[ymd] = [{
            time: '00:00', // Placeholder - UI should show "Time to be confirmed"
            available: remaining,
            isSoldOut: false,
            precio: null,
            bruto: null,
            sessionId: null,
            rcId: null,
            TipoReservaId: null,
          }]
        }
      }
    }
  }

  return sessionsByDay
}

/**
 * Project wdays onto next 90 days (timezone Tenerife = UTC+0 or UTC+1)
 * Returns array of YYYY-MM-DD dates where dayOfWeek matches wdays and wdays value != 0
 * 
 * wdays format: Array of 7 numbers [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
 * - Index 0 = Monday, Index 6 = Sunday
 * - Value != 0 means the day is available
 * - Value == 0 means the day is closed
 */
export function projectWdaysToDates(wdays: number[]): string[] {
  if (!Array.isArray(wdays) || wdays.length === 0) {
    return []
  }

  const projectedDates: string[] = []
  const today = new Date()
  
  // Tenerife timezone: UTC+0 (winter) or UTC+1 (summer)
  // Use local timezone for simplicity (browser/server will handle it)
  today.setHours(0, 0, 0, 0)

  // Project 90 days forward
  for (let i = 0; i < 90; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    
    // JavaScript dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // wdays array: [0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday]
    const jsDayOfWeek = date.getDay() // 0-6 (0=Sunday)
    const wdaysIndex = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1 // Convert to wdays index (0=Monday, 6=Sunday)
    
    // Check if this day is available (wdays value != 0)
    if (wdaysIndex >= 0 && wdaysIndex < wdays.length && wdays[wdaysIndex] !== 0) {
      projectedDates.push(toYMD(date))
    }
  }

  return projectedDates
}

/**
 * Detect calendar mode from raw response
 */
export function detectCalendarMode(raw: any): 'sessions' | 'dates' | 'wdays_only' | 'none' {
  if (!raw || typeof raw !== 'object') {
    return 'none'
  }

  // Priority 1: dates.sessions exists
  if (raw.dates && typeof raw.dates === 'object' && !Array.isArray(raw.dates)) {
    if (raw.dates.sessions && typeof raw.dates.sessions === 'object') {
      return 'sessions'
    }
  }

  // Priority 2: dates.date is a non-empty array
  if (raw.dates && typeof raw.dates === 'object' && !Array.isArray(raw.dates)) {
    if (Array.isArray(raw.dates.date) && raw.dates.date.length > 0) {
      return 'dates'
    }
  }

  // Priority 3: dates.wdays exists (but no dates.date)
  if (raw.dates && typeof raw.dates === 'object' && !Array.isArray(raw.dates)) {
    if (Array.isArray(raw.dates.wdays) && raw.dates.wdays.length > 0) {
      return 'wdays_only'
    }
  }

  // Fallback: check top-level wdays
  if (Array.isArray(raw.wdays) && raw.wdays.length > 0) {
    return 'wdays_only'
  }

  return 'none'
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

  // Format 0: Nested dates object with date[], limit[], used[] arrays
  // Structure: { dates: { date: ["20260201", ...], limit: [...], used: [...] } }
  if (raw.dates && typeof raw.dates === 'object' && !Array.isArray(raw.dates)) {
    const datesObj = raw.dates
    const dateArray = Array.isArray(datesObj.date) ? datesObj.date : []
    const limits = Array.isArray(datesObj.limit) ? datesObj.limit : []
    const used = Array.isArray(datesObj.used) ? datesObj.used : []

    for (let i = 0; i < dateArray.length; i++) {
      const dateStr = String(dateArray[i])
      const date = parseYYYYMMDD(dateStr)
      if (!date || !isFutureOrToday(date)) {
        continue
      }

      if (date.getFullYear() !== year || date.getMonth() !== monthNum) {
        continue
      }

      // Parse limit and used as numbers (they may come as strings)
      const limit = typeof limits[i] === 'number' 
        ? limits[i] 
        : typeof limits[i] === 'string' 
          ? parseInt(limits[i], 10) || 0 
          : 0
      const usedCount = typeof used[i] === 'number' 
        ? used[i] 
        : typeof used[i] === 'string' 
          ? parseInt(used[i], 10) || 0 
          : 0

      dates.push({
        limit,
        date: toYMD(date),
        used: usedCount,
      })
    }
  }

  // Format 1: Array of dates with limit/used arrays (top-level)
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

      // Parse limit and used as numbers (they may come as strings)
      const limit = typeof limits[i] === 'number' 
        ? limits[i] 
        : typeof limits[i] === 'string' 
          ? parseInt(limits[i], 10) || 0 
          : 0
      const usedCount = typeof used[i] === 'number' 
        ? used[i] 
        : typeof used[i] === 'string' 
          ? parseInt(used[i], 10) || 0 
          : 0

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
  const normalizedLang = language.length === 3 && ['CAS', 'ENG', 'FRA', 'RUS', 'ALE', 'ITA', 'POL'].includes(language.toUpperCase())
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
  // Parse quote: can be number or string
  let quote: number | null = null
  if (typeof raw.quote === 'number') {
    quote = raw.quote
  } else if (typeof raw.quote === 'string' && raw.quote.trim()) {
    const parsed = Number(raw.quote)
    if (!isNaN(parsed)) {
      quote = parsed
    }
  }
  
  const wdays = Array.isArray(raw.dates?.wdays) ? raw.dates.wdays : Array.isArray(raw.wdays) ? raw.wdays : []
  const dates = extractDates(raw, normalizedMonth)
  let sessionsByDay = extractSessions(raw, normalizedMonth)
  
  // Detect calendar mode
  let calendarMode = detectCalendarMode(raw)
  
  // CRITICAL: Projection wdays_only UNIQUEMENT si:
  // a) aucune date précise trouvée (dates.length === 0)
  // b) sessionsByDay vide
  // c) wdays non vide
  // Sinon: ne jamais projeter. On utilise sessionsByDay/dates.
  const hasDates = dates.length > 0
  const hasSessions = Object.keys(sessionsByDay).length > 0
  const hasWdays = wdays.length > 0
  
  // Override calendarMode to wdays_only ONLY if conditions are met
  if (calendarMode === 'wdays_only') {
    if (hasDates || hasSessions) {
      // Don't use wdays_only if we have actual dates/sessions
      // Re-detect mode based on what we actually have
      if (hasSessions) {
        calendarMode = 'sessions'
      } else if (hasDates) {
        calendarMode = 'dates'
      } else {
        calendarMode = 'none'
      }
    }
  }
  
  // CRITICAL: calendarMode MUST never be null - always a valid value
  if (!calendarMode || (calendarMode !== 'sessions' && calendarMode !== 'dates' && calendarMode !== 'wdays_only' && calendarMode !== 'none')) {
    calendarMode = 'none'
  }
  
  // Calculate requiresSessionTime based on calendarMode
  // sessions => requiresSessionTime=true, others => false
  const requiresSessionTime: boolean = calendarMode === 'sessions'
  
  // Project wdays to dates ONLY if wdays_only mode AND no dates/sessions found
  let projectedAvailableDates: string[] | undefined = undefined
  if (calendarMode === 'wdays_only' && !hasDates && !hasSessions && hasWdays) {
    projectedAvailableDates = projectWdaysToDates(wdays)
  }
  
  // DEV: Log if dates.sessions is absent
  if (process.env.NODE_ENV === 'development') {
    const hasDatesSessions = raw?.dates?.sessions && typeof raw.dates.sessions === 'object'
    if (!hasDatesSessions) {
      console.log('[ATLANTICO_PARSING] NO_SESSIONS_FORMAT - dates.sessions absent, using fallback', {
        eventId,
        month: normalizedMonth,
        calendarMode,
        hasDatesDate: Array.isArray(raw?.dates?.date),
        datesDateCount: Array.isArray(raw?.dates?.date) ? raw.dates.date.length : 0,
        sessionsByDayKeys: Object.keys(sessionsByDay).slice(0, 5),
        projectedDatesCount: projectedAvailableDates?.length || 0,
      })
    } else {
      const sessionsKeys = Object.keys(raw.dates.sessions).slice(0, 5)
      console.log('[ATLANTICO_PARSING] dates.sessions found', {
        eventId,
        month: normalizedMonth,
        calendarMode,
        sessionsKeysCount: Object.keys(raw.dates.sessions).length,
        sampleKeys: sessionsKeys,
      })
    }
  }
  
  // Fallback: if no sessions found but we have dates with (limit - used) > 0, create placeholder sessions
  // Only do this if calendarMode is 'dates' (not wdays_only)
  if (calendarMode === 'dates' && Object.keys(sessionsByDay).length === 0 && dates.length > 0) {
    for (const dateData of dates) {
      if (dateData.limit - dateData.used > 0) {
        const ymd = dateData.date
        sessionsByDay[ymd] = [{
          time: '00:00', // Placeholder - UI should show "Time to be confirmed"
          available: dateData.limit - dateData.used,
          isSoldOut: false,
          precio: null,
          bruto: null,
          sessionId: null,
          rcId: null,
          TipoReservaId: null,
        }]
      }
    }
  }

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

  // Calculate availableDates from sessionsByDay keys
  const availableDates = Object.keys(sessionsByDay).sort()
  
  // DEV: Log normalized result
  if (process.env.NODE_ENV === 'development') {
    console.log('[LIMITS_NORMALIZED]', {
      eventId,
      calendarMode,
      requiresSessionTime,
      availableDatesCount: availableDates.length,
      projectedCount: projectedAvailableDates?.length ?? 0,
    })
  }

  return {
    normalized: {
      quote,
      wdays,
      dates,
      sessionsByDay,
      calendarMode,
      requiresSessionTime,
      ...(projectedAvailableDates ? { projectedAvailableDates } : {}),
    },
    raw,
    upstreamStatus,
    upstreamUrl: fullUrl,
  }
}

