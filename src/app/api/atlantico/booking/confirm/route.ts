/**
 * POST /api/atlantico/booking/confirm
 * 
 * Confirms a booking with Atlantico API
 * Body: { userId, t_id, t_group, language, tourDate, sesTime, adults, childs, infants, name, email, phone, hotel?, room?, mpoint?, mtime?, notes? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/atlantico/client'
import { loadLimits } from '@/lib/atlantico/client-wrapper'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'
import { normalizeLimits } from '@/lib/atlantico/normalizeLimits'

interface ConfirmRequest {
  userId: string
  t_id: string
  t_group: string
  language: string
  tourDate: string | null // YYYY-MM-DD or null for calendarMode === 'none'
  sesTime: string | null // HH:mm or null for calendarMode === 'none'
  adults: number
  childs?: number
  infants?: number
  name: string
  email: string
  phone: string
  hotel?: string
  room?: string
  mpoint?: string
  mtime?: string
  notes?: string
}

interface ConfirmResponse {
  ok: boolean
  reference?: string
  reason?: string
  code?: string // Error code (e.g., 'ATL_DATE_NOT_AVAILABLE')
  raw?: any
}

/**
 * Build form-urlencoded body for Atlantico confirm endpoint
 */
function buildFormData(data: ConfirmRequest): string {
  const params = new URLSearchParams()
  
  params.append('userId', data.userId)
  params.append('t_id', data.t_id)
  params.append('t_group', data.t_group)
  params.append('language', data.language)
  // For calendarMode === 'none': tourDate and sesTime are null (on-request booking)
  // Only append if not null
  if (data.tourDate) params.append('tourDate', data.tourDate)
  if (data.sesTime) params.append('sesTime', data.sesTime)
  params.append('adults', String(data.adults))
  
  if (data.childs !== undefined) {
    params.append('childs', String(data.childs))
  }
  if (data.infants !== undefined) {
    params.append('infants', String(data.infants))
  }
  
  params.append('name', data.name)
  params.append('email', data.email)
  params.append('phone', data.phone)
  
  if (data.hotel) {
    params.append('hotel', data.hotel)
  }
  if (data.room) {
    params.append('room', data.room)
  }
  if (data.mpoint) {
    params.append('mpoint', data.mpoint)
  }
  if (data.mtime) {
    params.append('mtime', data.mtime)
  }
  if (data.notes) {
    params.append('notes', data.notes)
  }
  
  return params.toString()
}

/**
 * Helper: list of candidate upstream confirm paths (configurable + fallbacks)
 */
function getConfirmPaths(): string[] {
  const envPath = process.env.ATLANTICO_CONFIRM_PATH?.trim()
  const list = [
    envPath,
    '/confirmBooking',
    '/bookingConfirm',
    '/confirm',
    '/loadConfirm',
    '/confirmReserva',
    '/confirmReservation',
    '/booking/confirm',
  ].filter(Boolean) as string[]

  // De-duplicate while preserving order
  return Array.from(new Set(list))
}

/**
 * Extract booking reference from response
 */
function extractReference(responseText: string): string | null {
  const trimmed = responseText.trim()
  
  // Try JSON first
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed)
      // Try multiple possible field names
      return json.reference || json.bookingReference || json.locator || json.idBooking || json.bookref || json.ref || json.code || json.id || null
    } catch {
      // Not JSON
    }
  }
  
  // Try to find reference-like patterns (more flexible)
  const refMatch = trimmed.match(/(?:reference|locator|idBooking|bookref|ref|code|id)[\s:=]+([A-Z0-9-]+)/i)
  if (refMatch) {
    return refMatch[1]
  }
  
  // If it's a short alphanumeric string (digits or alphanum), assume it's the reference
  if (/^[A-Z0-9-]{3,50}$/i.test(trimmed)) {
    return trimmed
  }
  
  // Try to extract any alphanumeric sequence that looks like a reference
  const anyRefMatch = trimmed.match(/([A-Z0-9-]{5,50})/i)
  if (anyRefMatch) {
    return anyRefMatch[1]
  }
  
  return null
}

/**
 * Validate userId from environment variables
 */
function getUserId(): string | null {
  const userId = process.env.ATLANTICO_USER_ID?.trim()
  if (!userId || userId === '0' || userId === '') {
    return null
  }
  // Check if numeric (userId should be numeric)
  if (!/^\d+$/.test(userId)) {
    return null
  }
  return userId
}

/**
 * Convert date from YYYY-MM-DD to YYYYMMDD format
 */
function toYYYYMMDD(dateISO: string): string {
  return dateISO.replace(/-/g, '')
}

/**
 * Validate tourDate against loadLimits using normalizeLimits (source of truth)
 * CRITICAL: Bloquer tout ajout panier/checkout si selectedDate n'appartient pas à la liste "availableDates" (modes sessions/dates) ou "projectedAvailableDates" (wdays_only).
 */
async function validateTourDate(
  eventId: string,
  language: string,
  tourDate: string,
  calendarMode?: 'sessions' | 'dates' | 'wdays_only' | 'none'
): Promise<{ valid: boolean; reason?: string; sessions?: any[] }> {
  try {
    // Calculate monthStart from tourDate (YYYY-MM-DD -> YYYY-MM-01)
    const monthStart = tourDate.substring(0, 7) + '-01'
    
    // Normalize language
    const normalizedLang = mapLocaleToAtlanticoLang(language)
    
    // Use normalizeLimits (source of truth)
    const { normalized } = await normalizeLimits(eventId, normalizedLang, monthStart)
    
    // Get available dates based on calendar mode
    let availableDates: string[] = []
    if (calendarMode === 'wdays_only') {
      // For wdays_only: use projectedAvailableDates
      availableDates = normalized.projectedAvailableDates || []
    } else {
      // For sessions/dates: use availableDates from sessionsByDay keys
      availableDates = Object.keys(normalized.sessionsByDay).sort()
    }
    
    // CRITICAL: Bloquer si selectedDate n'appartient pas à la liste
    if (!availableDates.includes(tourDate)) {
      return { 
        valid: false, 
        reason: 'DATE_NOT_AVAILABLE', 
        sessions: [] 
      }
    }
    
    // Get sessions for this date from sessionsByDay
    const sessions = normalized.sessionsByDay[tourDate] || []
    
    // For wdays_only: allow if date is in projectedAvailableDates (validation will be done by Atlántico)
    if (calendarMode === 'wdays_only') {
      // Just validate date format and that it's in projectedAvailableDates
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tourDate)) {
        return { valid: false, reason: 'INVALID_DATE_FORMAT', sessions: [] }
      }
      return { valid: true, sessions: [] }
    }
    
    // For sessions/dates: check if date has at least one available session
    const hasAvailableSessions = sessions.some((s: any) => {
      const available = typeof s.available === 'number' ? s.available : 0
      return available > 0
    })
    
    if (sessions.length === 0 && !hasAvailableSessions) {
      return { valid: false, reason: 'DATE_NOT_AVAILABLE', sessions: [] }
    }
    
    return { valid: true, sessions }
  } catch (error) {
    // Log error but don't block (fallback)
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATLANTICO_CONFIRM] Error validating tourDate:', error)
    }
    return { valid: true, sessions: [] } // Fallback: allow if validation fails
  }
}

/**
 * Validate sesTime against available sessions
 * CRITICAL: Never accept '00:00' - must have valid sessions with times
 */
function validateSesTime(sesTime: string | null, sessions: any[]): { valid: boolean; reason?: string; allowedTimes?: string[] } {
  // For calendarMode === 'none': sesTime is null (on-request booking)
  if (sesTime === null) {
    return { valid: true }
  }
  // CRITICAL: Reject '00:00' completely
  if (sesTime === '00:00') {
    return { valid: false, reason: 'INVALID_TIME_00:00_NOT_ALLOWED' }
  }
  
  if (!sessions || sessions.length === 0) {
    // No sessions - reject (no fallback to '00:00')
    return { valid: false, reason: 'NO_SESSIONS_AVAILABLE' }
  }
  
  // Extract valid times from sessions
  const validSessions = sessions.filter((s: any) => 
    s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
  )
  
  if (validSessions.length === 0) {
    // No valid sessions - reject (no fallback to '00:00')
    return { valid: false, reason: 'NO_VALID_SESSIONS_AVAILABLE' }
  }
  
  // Check if sesTime is in valid sessions
  const allowedTimes = validSessions.map((s: any) => s.time)
  if (!allowedTimes.includes(sesTime)) {
    return { valid: false, reason: 'INVALID_TIME', allowedTimes }
  }
  
  return { valid: true }
}

/**
 * Validate pax against available capacity
 */
function validatePax(
  adults: number,
  childs: number,
  infants: number,
  sesTime: string,
  sessions: any[]
): { valid: boolean; reason?: string; available?: number; paxTotal?: number } {
  const paxTotal = adults + (childs || 0) + (infants || 0)
  
  if (paxTotal <= 0) {
    return { valid: false, reason: 'INVALID_PAX', paxTotal }
  }
  
  if (!sessions || sessions.length === 0) {
    // No sessions - can't validate, allow (fallback)
    return { valid: true }
  }
  
  // Find session matching sesTime
  const session = sessions.find((s: any) => s.time === sesTime)
  if (!session) {
    // Session not found - can't validate, allow (fallback)
    return { valid: true }
  }
  
  const available = typeof session.available === 'number' ? session.available : null
  if (available !== null && paxTotal > available) {
    return { valid: false, reason: 'NOT_ENOUGH_AVAILABILITY', available, paxTotal }
  }
  
  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ConfirmRequest

    // Validate required fields
    // For calendarMode === 'none': tourDate and sesTime can be null
    const isOnRequest = body.tourDate === null || body.sesTime === null
    
    if (!body.t_id || !body.t_group || !body.language || !body.adults || !body.name || !body.email || !body.phone) {
      return NextResponse.json<ConfirmResponse>(
        {
          ok: false,
          reason: 'Missing required fields',
          message: 't_id, t_group, language, adults, name, email, and phone are required',
        },
        { status: 400 }
      )
    }
    
    // For non-on-request bookings: tourDate and sesTime are required
    if (!isOnRequest && (!body.tourDate || !body.sesTime)) {
      return NextResponse.json<ConfirmResponse>(
        {
          ok: false,
          reason: 'Missing date/time fields',
          message: 'tourDate and sesTime are required for bookings with calendar',
        },
        { status: 400 }
      )
    }

    // Validate userId (URGENT)
    const serverUserId = getUserId()
    if (!serverUserId) {
      // Log candidate env vars (without secrets)
      const candidateVars = [
        'ATLANTICO_USER_ID',
        'ATLANTICO_COLLABORATOR',
        'ATLANTICO_OFFICE',
      ].filter(v => process.env[v] !== undefined)
      
      if (process.env.NODE_ENV === 'development') {
        console.error('[ATLANTICO_CONFIRM] Missing userId. Candidate env vars:', candidateVars)
      }
      
      return NextResponse.json<ConfirmResponse>(
        {
          ok: false,
          reason: 'MISSING_ATLANTICO_USER_ID',
        },
        { status: 500 }
      )
    }
    
    // DEV log: userId loaded
    if (process.env.NODE_ENV === 'development') {
      console.log('[ATL_USER_ID]', serverUserId)
    }
    
    // Check if this is an on-request booking (calendarMode === 'none')
    if (isOnRequest) {
      // For calendarMode === 'none': no date/time validation needed
      if (process.env.NODE_ENV === 'development') {
        console.log('[ATL_ON_REQUEST]', {
          eventId: body.t_id,
          groupId: body.t_group,
          pax: { adults: body.adults, childs: body.childs || 0, infants: body.infants || 0 },
        })
      }
      
      // Skip all date/time validations for on-request bookings
      // Proceed directly to confirm call
    } else {
      // For bookings with date/time: validate format and availability
      
      // Validate date format
      if (body.tourDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.tourDate)) {
        return NextResponse.json<ConfirmResponse>(
          {
            ok: false,
            reason: 'Invalid tourDate format (expected YYYY-MM-DD)',
          },
          { status: 400 }
        )
      }

      // Validate time format
      if (body.sesTime && !/^\d{2}:\d{2}$/.test(body.sesTime)) {
        return NextResponse.json<ConfirmResponse>(
          {
            ok: false,
            reason: 'Invalid sesTime format (expected HH:mm)',
          },
          { status: 400 }
        )
      }
      
      // Check calendarMode to determine validation rules
      const monthStart = body.tourDate!.substring(0, 7) + '-01'
      const normalizedLang = mapLocaleToAtlanticoLang(body.language)
      let calendarMode: 'sessions' | 'dates' | 'wdays_only' | 'none' = 'sessions'
      
      try {
      const limits = await loadLimits(body.t_id, normalizedLang, monthStart)
      // Detect calendarMode from limits
      const hasWdays = Array.isArray(limits?.dates?.wdays) && limits.dates.wdays.length > 0
      const dateList = limits?.dates?.date ?? []
      const hasDatesArray = Array.isArray(dateList) && dateList.length > 0
      const sessionsObj = limits.sessions ?? limits.sessionsByDate ?? null
      const hasSessions = sessionsObj && typeof sessionsObj === 'object' && Object.keys(sessionsObj).length > 0
      
      if (hasSessions) {
        calendarMode = 'sessions'
      } else if (hasDatesArray) {
        calendarMode = 'dates'
      } else if (hasWdays && !hasDatesArray && !hasSessions) {
        calendarMode = 'wdays_only'
      } else {
        calendarMode = 'none'
      }
    } catch (error) {
      // Fallback to sessions mode if can't determine
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ATLANTICO_CONFIRM] Failed to detect calendarMode, using default:', error)
      }
    }
    
    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[ATL_CONFIRM]', {
        calendarMode,
        t_id: body.t_id,
        t_group: body.t_group,
        tourDate: body.tourDate,
        sesTime: body.sesTime,
        notes: body.notes ? body.notes.substring(0, 100) : undefined,
      })
    }
    
    // Determine requiresSessionTime from calendarMode
    // sessions => requiresSessionTime=true, others => false
    const requiresSessionTime = calendarMode === 'sessions'
    
    // CRITICAL: Validation requiresSessionTime + sesTime
    // Si requiresSessionTime === true et sesTime absent/00:00 -> retourner 400 {code:'MISSING_TIME'}
    if (requiresSessionTime) {
      if (!body.sesTime || body.sesTime === '00:00' || body.sesTime.trim() === '') {
        return NextResponse.json<ConfirmResponse>(
          {
            ok: false,
            code: 'MISSING_TIME',
            reason: 'MISSING_TIME',
            message: 'Session time is required for this booking type',
          },
          { status: 400 }
        )
      }
    }
    
    // If requiresSessionTime === false, "00:00" is allowed (PDF compliance: "sesTime: in case there is no session time add 00:00")
    // If requiresSessionTime === true, "00:00" is NOT allowed (already checked above)

    // Validate tourDate against loadLimits (IMPORTANT)
    // For requiresSessionTime === false: skip strict validation (allow if date format is valid)
    const dateValidation = await validateTourDate(body.t_id, body.language, body.tourDate!, calendarMode)
    if (!dateValidation.valid) {
      // If Atlántico returns 409, pass it through with code
      return NextResponse.json<ConfirmResponse>(
        {
          ok: false,
          code: 'DATE_NOT_AVAILABLE',
          reason: dateValidation.reason || 'DATE_NOT_AVAILABLE',
          message: 'Selected date is not available',
          raw: { tourDate: body.tourDate },
        },
        { status: 409 }
      )
    }

    // Validate sesTime against sessions (CRITICAL)
    // For requiresSessionTime === false: allow "00:00" without session validation
    if (requiresSessionTime && body.sesTime) {
      const timeValidation = validateSesTime(body.sesTime, dateValidation.sessions || [])
      if (!timeValidation.valid) {
        return NextResponse.json<ConfirmResponse>(
          {
            ok: false,
            reason: timeValidation.reason || 'INVALID_TIME',
            raw: { 
              sesTime: body.sesTime,
              allowedTimes: timeValidation.allowedTimes,
            },
          },
          { status: 409 }
        )
      }
    }

      // Validate pax against available (IMPORTANT)
      // For on-request bookings: skip pax validation (no date/time)
      const paxValidation = isOnRequest 
        ? { valid: true }
        : validatePax(
            body.adults,
            body.childs || 0,
            body.infants || 0,
            body.sesTime!,
            dateValidation.sessions || []
          )
      if (!paxValidation.valid) {
        return NextResponse.json<ConfirmResponse>(
          {
            ok: false,
            reason: paxValidation.reason || 'NOT_ENOUGH_AVAILABILITY',
            raw: {
              available: paxValidation.available,
              paxTotal: paxValidation.paxTotal,
            },
          },
          { status: 409 }
        )
      }
    }

    // Build request with server userId (override client userId if provided)
    // IMPORTANT: handle sesTime based on calendarMode / requiresSessionTime rules
    // - For sessions mode: NEVER send "00:00" (must be a real session time)
    // - For wdays_only and other non-session modes: allow "00:00" (per Atlantico spec)
    let calendarModeForPayload: 'sessions' | 'dates' | 'wdays_only' | 'none' = 'none'
    let requiresSessionTimeForPayload = false
    if (!isOnRequest && body.tourDate) {
      // Recompute minimal calendarMode/requiresSessionTime in a safe way
      const monthStart = body.tourDate.substring(0, 7) + '-01'
      const normalizedLang = mapLocaleToAtlanticoLang(body.language)
      try {
        const limits = await loadLimits(body.t_id, normalizedLang, monthStart)
        const hasWdays = Array.isArray(limits?.dates?.wdays) && limits.dates.wdays.length > 0
        const dateList = limits?.dates?.date ?? []
        const hasDatesArray = Array.isArray(dateList) && dateList.length > 0
        const sessionsObj = limits.sessions ?? limits.sessionsByDate ?? null
        const hasSessions = sessionsObj && typeof sessionsObj === 'object' && Object.keys(sessionsObj).length > 0

        if (hasSessions) {
          calendarModeForPayload = 'sessions'
        } else if (hasDatesArray) {
          calendarModeForPayload = 'dates'
        } else if (hasWdays && !hasDatesArray && !hasSessions) {
          calendarModeForPayload = 'wdays_only'
        } else {
          calendarModeForPayload = 'none'
        }
      } catch {
        // Fallback: keep defaults, don't block
      }
      requiresSessionTimeForPayload = calendarModeForPayload === 'sessions'
    }

    const originalSesTime = body.sesTime
    let finalSesTime: string | null = null

    if (calendarModeForPayload === 'sessions' || requiresSessionTimeForPayload) {
      // Sessions-based: require a real time, never "00:00"
      if (originalSesTime && originalSesTime !== '00:00') {
        finalSesTime = originalSesTime
      } else {
        finalSesTime = null
      }
    } else {
      // wdays_only / dates / none: allow "00:00" or any upstream-expected value
      finalSesTime = originalSesTime || null
    }

    const confirmData: ConfirmRequest = {
      ...body,
      userId: String(serverUserId), // Always use server-side userId, force string
      sesTime: finalSesTime,
    }

    // DEV log: payload keys
    if (process.env.NODE_ENV === 'development') {
      console.log('[ATL_CONFIRM_PAYLOAD_KEYS]', Object.keys(confirmData))
    }

    // Build form data
    const formData = buildFormData(confirmData)

    // Call Atlantico confirm endpoint with multi-path fallback
    const baseUrl = getBaseUrl()
    const paths = getConfirmPaths()
    const attempted: Array<{
      path: string
      attemptedUrl: string
      status: number
      contentType: string | null
      preview: string
    }> = []

    let successfulResponseText: string | null = null
    let successfulUrl: string | null = null

    for (const path of paths) {
      const fullUrl = `${baseUrl}${path}`
      let upstreamStatus = 0
      let upstreamContentType: string | null = null
      let responseText = ''

      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: '*/*',
          ...(process.env.ATLANTICO_TOKEN ? { Authorization: `Bearer ${process.env.ATLANTICO_TOKEN}` } : {}),
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[ATL_CONFIRM_UPSTREAM]', {
            baseUrl,
            path,
            fullUrl,
            method: 'POST',
            headers: {
              'Content-Type': headers['Content-Type'],
              Accept: headers['Accept'],
              Authorization: headers['Authorization'] ? '***redacted***' : undefined,
            },
            payloadKeys: Object.keys(confirmData),
          })
        }

        const response = await fetch(fullUrl, {
          method: 'POST',
          headers,
          body: formData,
          cache: 'no-store',
        })

        upstreamStatus = response.status
        upstreamContentType = response.headers.get('content-type')
        responseText = await response.text()

        const preview = responseText.substring(0, 200)

        if (process.env.NODE_ENV === 'development') {
          console.log('[ATL_CONFIRM_UPSTREAM]', {
            baseUrl,
            path,
            fullUrl,
            status: upstreamStatus,
            contentType: upstreamContentType,
            first200: preview,
          })
          console.log('[ATL_CONFIRM_RAW]', {
            status: upstreamStatus,
            first500: responseText.substring(0, 500),
          })
        }

        const contentType = (upstreamContentType || '').toLowerCase()
        const startsWithHtml =
          responseText.trim().toLowerCase().startsWith('<html') ||
          responseText.trim().toLowerCase().startsWith('<!doctype') ||
          responseText.trim().toLowerCase().startsWith('<?xml')
        const isHtml = contentType.includes('text/html') || startsWithHtml

        attempted.push({
          path,
          attemptedUrl: fullUrl,
          status: upstreamStatus,
          contentType: upstreamContentType,
          preview,
        })

        // Treat HTML or non-200 as "bad endpoint" → continue to next path
        if (upstreamStatus !== 200 || isHtml) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[ATLANTICO_CONFIRM] Upstream endpoint rejected', {
              path,
              fullUrl,
              status: upstreamStatus,
              contentType: upstreamContentType,
              preview,
            })
          }
          continue
        }

        // Found a 200 non-HTML response → use this one
        successfulResponseText = responseText
        successfulUrl = fullUrl
        break
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[ATLANTICO_CONFIRM] Upstream error on path', {
            path,
            fullUrl,
            error: error instanceof Error ? error.message : String(error),
          })
        }

        attempted.push({
          path,
          attemptedUrl: fullUrl,
          status: upstreamStatus || 0,
          contentType: upstreamContentType || null,
          preview:
            responseText.substring(0, 200) ||
            (error instanceof Error ? error.message.substring(0, 200) : 'Unknown error'),
        })

        // Try next path
        continue
      }
    }

    if (!successfulResponseText) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[ATLANTICO_CONFIRM] All confirm paths failed', {
          baseUrl,
          attempts: attempted,
        })
      }

      const payload: any = {
        ok: false,
        reason: 'NO_WORKING_CONFIRM_ENDPOINT',
      }

      // Only expose detailed attempts in development
      if (process.env.NODE_ENV === 'development') {
        payload.attempts = attempted
      }

      // IMPORTANT: never block checkout with 502 when confirm endpoint is unavailable.
      // Let the frontend treat this as "on request" booking.
      return NextResponse.json(payload, { status: 200 })
    }

    // Extract reference from successful response
    const reference = extractReference(successfulResponseText)

    return NextResponse.json(
      {
        ok: true,
        reference: reference || null,
        rawPreview: successfulResponseText.substring(0, 500),
        upstreamUrl: successfulUrl,
      },
      { status: 200 }
    )
  } catch (error) {
    // Server-only logging
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATLANTICO_CONFIRM] Error:', error)
    }

    return NextResponse.json<ConfirmResponse>(
      {
        ok: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

