/**
 * POST /api/atlantico/booking/confirm
 * 
 * Confirms a booking with Atlantico API
 * Body: { userId, t_id, t_group, language, tourDate, sesTime, adults, childs, infants, name, email, phone, hotel?, room?, mpoint?, mtime?, notes? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchText, fetchJson } from '@/lib/atlantico/client'
import { loadLimits } from '@/lib/atlantico/client-wrapper'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'

interface ConfirmRequest {
  userId: string
  t_id: string
  t_group: string
  language: string
  tourDate: string // YYYY-MM-DD
  sesTime: string // HH:mm
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
  params.append('tourDate', data.tourDate)
  params.append('sesTime', data.sesTime)
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
 * Extract booking reference from response
 */
function extractReference(responseText: string): string | null {
  const trimmed = responseText.trim()
  
  // Try JSON first
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed)
      return json.reference || json.bookingReference || json.code || json.id || null
    } catch {
      // Not JSON
    }
  }
  
  // Try to find reference-like patterns
  const refMatch = trimmed.match(/(?:reference|code|id)[\s:=]+([A-Z0-9-]+)/i)
  if (refMatch) {
    return refMatch[1]
  }
  
  // If it's a short alphanumeric string, assume it's the reference
  if (/^[A-Z0-9-]{3,20}$/i.test(trimmed)) {
    return trimmed
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
 * Validate tourDate against loadLimits
 */
async function validateTourDate(
  eventId: string,
  language: string,
  tourDate: string
): Promise<{ valid: boolean; reason?: string; sessions?: any[] }> {
  try {
    // Calculate monthStart from tourDate (YYYY-MM-DD -> YYYY-MM-01)
    const monthStart = tourDate.substring(0, 7) + '-01'
    
    // Normalize language
    const normalizedLang = mapLocaleToAtlanticoLang(language)
    
    // Fetch loadLimits
    const limits = await loadLimits(eventId, normalizedLang, monthStart)
    
    // Convert tourDate to YYYYMMDD format
    const dateKeyYYYYMMDD = toYYYYMMDD(tourDate)
    
    // Check if date is in available dates
    const dateList = limits?.dates?.date || []
    const isDateInList = Array.isArray(dateList) && dateList.includes(dateKeyYYYYMMDD)
    
    // Get sessions for this date - support multiple formats
    let sessions: any[] = []
    
    // Format 1: sessionsByDate[YYYYMMDD] or sessions[YYYYMMDD]
    const sessionsObj = limits.sessions ?? limits.sessionsByDate ?? null
    if (sessionsObj && typeof sessionsObj === 'object') {
      sessions = Array.isArray(sessionsObj[dateKeyYYYYMMDD]) 
        ? sessionsObj[dateKeyYYYYMMDD] 
        : []
    }
    
    // Format 2: sessionsByDay[YYYY-MM-DD] (from our normalized endpoint)
    if (sessions.length === 0 && limits.sessionsByDay && typeof limits.sessionsByDay === 'object') {
      sessions = Array.isArray(limits.sessionsByDay[tourDate])
        ? limits.sessionsByDay[tourDate]
        : []
    }
    
    // Check if date has at least one available session or is explicitly available
    const hasAvailableSessions = sessions.some((s: any) => {
      const available = typeof s.available === 'number' ? s.available : 0
      return available > 0
    })
    
    if (!isDateInList && sessions.length === 0 && !hasAvailableSessions) {
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
 */
function validateSesTime(sesTime: string, sessions: any[]): { valid: boolean; reason?: string; allowedTimes?: string[] } {
  if (!sessions || sessions.length === 0) {
    // No sessions - allow '00:00' only
    if (sesTime === '00:00') {
      return { valid: true }
    }
    return { valid: false, reason: 'INVALID_TIME', allowedTimes: ['00:00'] }
  }
  
  // Extract valid times from sessions
  const validSessions = sessions.filter((s: any) => 
    s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
  )
  
  if (validSessions.length === 0) {
    // No valid sessions - allow '00:00' only
    if (sesTime === '00:00') {
      return { valid: true }
    }
    return { valid: false, reason: 'INVALID_TIME', allowedTimes: ['00:00'] }
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
    if (!body.t_id || !body.t_group || !body.language || !body.tourDate || !body.sesTime || !body.adults || !body.name || !body.email || !body.phone) {
      return NextResponse.json<ConfirmResponse>(
        {
          ok: false,
          reason: 'Missing required fields',
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
          reason: 'MISSING_USER_ID',
        },
        { status: 400 }
      )
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.tourDate)) {
      return NextResponse.json<ConfirmResponse>(
        {
          ok: false,
          reason: 'Invalid tourDate format (expected YYYY-MM-DD)',
        },
        { status: 400 }
      )
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(body.sesTime)) {
      return NextResponse.json<ConfirmResponse>(
        {
          ok: false,
          reason: 'Invalid sesTime format (expected HH:mm)',
        },
        { status: 400 }
      )
    }

    // Validate tourDate against loadLimits (IMPORTANT)
    const dateValidation = await validateTourDate(body.t_id, body.language, body.tourDate)
    if (!dateValidation.valid) {
      return NextResponse.json<ConfirmResponse>(
        {
          ok: false,
          reason: dateValidation.reason || 'DATE_NOT_AVAILABLE',
          raw: { tourDate: body.tourDate },
        },
        { status: 409 }
      )
    }

    // Validate sesTime against sessions (CRITICAL)
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

    // Validate pax against available (IMPORTANT)
    const paxValidation = validatePax(
      body.adults,
      body.childs || 0,
      body.infants || 0,
      body.sesTime,
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

    // Build request with server userId (override client userId if provided)
    const confirmData: ConfirmRequest = {
      ...body,
      userId: serverUserId, // Always use server-side userId
    }

    // Build form data
    const formData = buildFormData(confirmData)

    // Call Atlantico confirm endpoint
    let responseText: string
    try {
      responseText = await fetchText('/confirm/', {
        method: 'POST',
        body: formData,
      })
    } catch (error) {
      // Handle upstream errors
      if (process.env.NODE_ENV === 'development') {
        console.error('[ATLANTICO_CONFIRM] Upstream error:', error)
      }
      
      return NextResponse.json<ConfirmResponse>(
        {
          ok: false,
          reason: 'UPSTREAM_ERROR',
          raw: error instanceof Error ? { message: error.message } : { error: 'Unknown error' },
        },
        { status: 502 }
      )
    }

    // Extract reference
    const reference = extractReference(responseText)

    if (reference) {
      return NextResponse.json<ConfirmResponse>({
        ok: true,
        reference,
      })
    } else {
      // No reference found, but response might be success
      // Check if response looks like an error
      const lowerText = responseText.toLowerCase()
      if (lowerText.includes('error') || lowerText.includes('fail') || lowerText.includes('invalid')) {
        return NextResponse.json<ConfirmResponse>({
          ok: false,
          reason: responseText.substring(0, 200),
          raw: responseText,
        })
      }

      // Assume success but no reference format
      return NextResponse.json<ConfirmResponse>({
        ok: true,
        reference: responseText.substring(0, 50), // Use first 50 chars as reference
        raw: responseText,
      })
    }
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
    )
  }
}

