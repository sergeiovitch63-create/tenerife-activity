/**
 * POST /api/atlantico/booking/payment
 *
 * Server-side proxy to Atlántico /payment/ endpoint.
 *
 * - Accepts JSON or form-urlencoded payload
 * - Builds application/x-www-form-urlencoded body with ALL mandatory fields:
 *   userId (from env), t_id, t_group, language, tourDate, sesTime,
 *   adults, childs, infants, name, email, phone, optional hotel/room/mpoint/mtime/notes
 * - Sends POST to ATLANTICO_BASE_URL/payment/
 * - Returns upstream response to the browser so GetNet HTML can render
 *
 * Special handling:
 * - If upstream body is "-1" or short non-HTML → 502 JSON
 *   { ok:false, code:"ATLANTICO_PAYMENT_FAILED", reason:"ATLANTICO_PAYMENT_FAILED", upstreamPreview }
 */

import { NextRequest, NextResponse } from 'next/server'
import { recordAffiliateSaleFromRequest } from '@/lib/affiliate/sales'
import { extractBookingDataFromHtml } from '@/lib/affiliate/redsys'
import { getBaseUrl } from '@/lib/atlantico/client'
import { loadLimits } from '@/lib/atlantico/client-wrapper'

interface PaymentBookingRequest {
  t_id: string
  t_group: string
  language: string
  tourDate: string | null
  sesTime: string | null
  /** Combination (Twin Ticket): second date for Loro Parque */
  tourDate2?: string | null
  /** Date range (car rental): end date */
  tourDateEnd?: string | null
  adults: number
  childs?: number
  infants?: number
  name: string
  email: string
  phone: string
  userId?: string
  hotel?: string
  room?: string
  mpoint?: string
  mtime?: string
  notes?: string
}

type ErrorResponse = {
  ok: false
  code:
    | 'BAD_REQUEST'
    | 'MISSING_ATLANTICO_BASE_URL'
    | 'MISSING_ATLANTICO_USER_ID'
    | 'ATLANTICO_PAYMENT_FAILED'
  reason: string
  missing?: string[]
  upstreamPreview?: string
  upstreamStatus?: number
  message?: string
}

function getUserId(): string | null {
  const raw = process.env.ATLANTICO_USER_ID?.trim()
  if (!raw || raw === '0') return null
  if (!/^\d+$/.test(raw)) return null
  
  // CRITICAL: Force userId to 3645 if it's not already
  // This ensures we always use the correct userId
  if (raw !== '3645') {
    console.error('[ATL_PAYMENT] ❌ CRITICAL: ATLANTICO_USER_ID is not 3645!')
    console.error('[ATL_PAYMENT] Current value:', raw)
    console.error('[ATL_PAYMENT] Please update .env.local with: ATLANTICO_USER_ID=3645')
    console.error('[ATL_PAYMENT] Forcing userId to 3645 for this request...')
    // Force to 3645 to ensure payment works
    return '3645'
  }
  
  return raw
}

// Use getBaseUrl from client.ts to get official domains (never IP:8080)
function getAtlanticoBaseUrl(): string {
  return getBaseUrl()
}

function looksLikeHtml(body: string, contentType: string | null): boolean {
  const ct = (contentType || '').toLowerCase()
  if (ct.includes('text/html')) return true
  const trimmed = body.trim().toLowerCase()
  return (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<form') ||
    trimmed.includes('getnet')
  )
}

async function parseRequestBody(request: NextRequest): Promise<PaymentBookingRequest> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      return (await request.json()) as PaymentBookingRequest
    } catch (error) {
      throw new Error(`Failed to parse JSON body: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch (error) {
    throw new Error(`Failed to parse form data: ${error instanceof Error ? error.message : String(error)}`)
  }

  const getStr = (name: string): string | null => {
    const v = form.get(name)
    if (v === null) return null
    const s = String(v).trim()
    return s === '' ? null : s
  }

  const getNum = (name: string): number | undefined => {
    const v = form.get(name)
    if (v === null || v === undefined) return undefined
    const n = Number(String(v))
    return Number.isFinite(n) ? n : undefined
  }

  return {
    t_id: getStr('t_id') || '',
    t_group: getStr('t_group') || '',
    language: getStr('language') || '',
    tourDate: getStr('tourDate'),
    sesTime: getStr('sesTime'),
    tourDate2: getStr('tourDate2'),
    tourDateEnd: getStr('tourDateEnd'),
    adults: getNum('adults') ?? 0,
    childs: getNum('childs'),
    infants: getNum('infants'),
    name: getStr('name') || '',
    email: getStr('email') || '',
    phone: getStr('phone') || '',
    userId: getStr('userId') || undefined,
    hotel: getStr('hotel') || undefined,
    room: getStr('room') || undefined,
    mpoint: getStr('mpoint') || undefined,
    mtime: getStr('mtime') || undefined,
    notes: getStr('notes') || undefined,
  }
}

/**
 * GET /api/atlantico/booking/payment
 * 
 * This endpoint only accepts POST requests.
 * Returns an error message if accessed via GET.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json<ErrorResponse>(
    {
      ok: false,
      code: 'BAD_REQUEST',
      reason: 'This endpoint only accepts POST requests. Please submit a booking form with payment data.',
      message: 'Use POST method with form data or JSON payload containing booking information (t_id, t_group, language, tourDate, sesTime, adults, name, email, phone, etc.)',
    },
    { status: 405 }
  )
}

export async function POST(request: NextRequest) {
  let body: PaymentBookingRequest
  try {
    body = await parseRequestBody(request)
  } catch (error) {
    console.error('[ATL_PAYMENT] Failed to parse request body:', error instanceof Error ? error.message : String(error))
    return NextResponse.json<ErrorResponse>(
      {
        ok: false,
        code: 'BAD_REQUEST',
        reason: 'Failed to parse request body. Please ensure the request is properly formatted (JSON or form-urlencoded).',
      },
      { status: 400 }
    )
  }

  // According to PDF section 2.7:
  // - tourDate and sesTime are BOTH null for on-request bookings (calendarMode === 'none')
  // - For wdays_only/dates mode: tourDate is provided, sesTime can be null or "00:00"
  // - For sessions mode: both tourDate and sesTime are provided
  // CRITICAL: isOnRequest is true ONLY when BOTH tourDate AND sesTime are null
  const isOnRequest = body.tourDate === null && body.sesTime === null

  const missing: string[] = []

  // Required fields according to PDF section 2.7
  if (!body.t_id) missing.push('t_id')
  if (!body.t_group) missing.push('t_group')
  if (!body.language) missing.push('language')
  if (!body.adults || body.adults < 1) missing.push('adults')
  if (!body.name || body.name.trim() === '') missing.push('name')
  if (!body.email || body.email.trim() === '') missing.push('email')
  if (!body.phone || body.phone.trim() === '') missing.push('phone')

  // For on-request bookings (calendarMode === 'none'), tourDate and sesTime are optional
  // For other modes, tourDate is required, sesTime can be "00:00" or omitted
  if (!isOnRequest) {
    if (!body.tourDate) missing.push('tourDate')
    // sesTime is optional - can be null, "00:00", or a valid time
  }

  if (missing.length > 0) {
    return NextResponse.json<ErrorResponse>(
      {
        ok: false,
        code: 'BAD_REQUEST',
        reason: 'Missing required fields',
        missing,
      },
      { status: 400 }
    )
  }

  // Validate tourDate format if provided
  // According to PDF, tourDate should be in YYYY-MM-DD format, but we'll accept both formats
  if (body.tourDate) {
    const isISOFormat = /^\d{4}-\d{2}-\d{2}$/.test(body.tourDate)
    const isYYYYMMDDFormat = /^\d{8}$/.test(body.tourDate)
    
    if (!isISOFormat && !isYYYYMMDDFormat) {
      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'BAD_REQUEST',
          reason: 'Invalid tourDate format (expected YYYY-MM-DD or YYYYMMDD)',
        },
        { status: 400 }
      )
    }
  }

  // Validate sesTime format if provided (can be "00:00" according to PDF)
  if (body.sesTime && body.sesTime !== '00:00' && !/^\d{2}:\d{2}$/.test(body.sesTime)) {
    return NextResponse.json<ErrorResponse>(
      {
        ok: false,
        code: 'BAD_REQUEST',
        reason: 'Invalid sesTime format (expected HH:mm or "00:00")',
      },
      { status: 400 }
    )
  }

  let userId = getUserId()
  if (!userId) {
    const candidates = ['ATLANTICO_USER_ID', 'ATLANTICO_COLLABORATOR', 'ATLANTICO_OFFICE'].filter(
      (v) => process.env[v] !== undefined
    )

    console.error('[ATL_PAYMENT_PROXY] ❌ Missing ATLANTICO_USER_ID')
    console.error('[ATL_PAYMENT_PROXY] Candidates present:', candidates)
    console.error('[ATL_PAYMENT_PROXY] Raw value:', process.env.ATLANTICO_USER_ID)
    console.error('[ATL_PAYMENT_PROXY] Using default userId: 3645')
    // Use 3645 as default if not configured
    userId = '3645'
  }
  
  // CRITICAL: Force userId to 3645 - this is the correct userId
  if (userId !== '3645') {
    console.error('[ATL_PAYMENT_PROXY] ❌ CRITICAL: userId is not 3645!')
    console.error('[ATL_PAYMENT_PROXY] Current value from env:', userId)
    console.error('[ATL_PAYMENT_PROXY] Forcing userId to 3645...')
    userId = '3645'
  }
  
  // Log userId for debugging
  console.log('[ATL_PAYMENT_PROXY] ✅ Using userId:', userId, '(Forced to 3645)')

  let baseUrl: string
  let baseUrlClean: string
  try {
    baseUrl = getAtlanticoBaseUrl()
    baseUrlClean = baseUrl.replace(/\/+$/, '')
    // CRITICAL: Log the base URL being used to debug connection issues
    console.log('[ATL_PAYMENT] Using base URL:', baseUrlClean)
  } catch (error) {
    console.error('[ATL_PAYMENT] Failed to get base URL:', error instanceof Error ? error.message : String(error))
    return NextResponse.json<ErrorResponse>(
      {
        ok: false,
        code: 'MISSING_ATLANTICO_BASE_URL',
        reason: 'Failed to get Atlantico base URL. Please check ATLANTICO_BASE_URL or ATLANTICO_ENV environment variables.',
      },
      { status: 500 }
    )
  }
  
  // CRITICAL: Reject IP:port addresses - they cause ECONNREFUSED
  const ipPortPattern = /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/
  if (ipPortPattern.test(baseUrlClean)) {
    console.error('[ATL_PAYMENT] ERROR: Base URL is an IP address:', baseUrlClean)
    console.error('[ATL_PAYMENT] This will cause connection refused errors!')
    console.error('[ATL_PAYMENT] Please set ATLANTICO_ENV=test or ATLANTICO_ENV=prod, or use a valid domain in ATLANTICO_BASE_URL')
    
    return NextResponse.json<ErrorResponse>(
      {
        ok: false,
        code: 'MISSING_ATLANTICO_BASE_URL',
        reason: `Invalid ATLANTICO_BASE_URL: IP addresses are not allowed. Please use ATLANTICO_ENV=test or ATLANTICO_ENV=prod, or set ATLANTICO_BASE_URL to a valid domain (e.g., https://api.atlanticoexcursiones.com)`,
      },
      { status: 500 }
    )
  }

  // CRITICAL: Verify event exists and AUTO-CORRECT t_group if invalid
  // Strategy: Check both eventDetails AND groupDetails to find correct t_group
  let correctedTGroup = body.t_group
  let eventDetails: any = null
  let groupDetailsData: any = null
  
  try {
    // Step 1: Get eventDetails to check t_group
    const eventDetailsUrl = `${baseUrlClean}/eventDetails/${body.t_id}/${body.language}`
    console.log('[ATL_PAYMENT] Step 1: Verifying event details:', eventDetailsUrl)
    
    const eventCheck = await fetch(eventDetailsUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
      cache: 'no-store',
    })
    
    if (eventCheck.ok) {
      const eventData = await eventCheck.text()
      try {
        eventDetails = JSON.parse(eventData)
        const eventGroup = eventDetails.group || eventDetails.groups || eventDetails.groupId || eventDetails.t_group || null
        
        console.log('[ATL_PAYMENT] Event verified:', {
          t_id: body.t_id,
          t_group_provided: body.t_group,
          t_group_from_event: eventGroup,
          match: eventGroup ? String(eventGroup) === String(body.t_group) : 'unknown',
        })
        
        // AUTO-CORRECT t_group from eventDetails
        if (eventGroup && String(eventGroup) !== String(body.t_group) && eventGroup !== 'unknown') {
          console.warn('[ATL_PAYMENT] AUTO-CORRECTING t_group from eventDetails!', {
            provided: body.t_group,
            corrected: eventGroup,
          })
          correctedTGroup = String(eventGroup)
        }
      } catch {
        console.log('[ATL_PAYMENT] Event exists (non-JSON response)')
      }
    }
    
    // Step 2: Verify t_group via groupDetails (more reliable)
    // Try the provided t_group first, then try the corrected one
    const tGroupsToTry = [correctedTGroup, body.t_group].filter((g, i, arr) => arr.indexOf(g) === i)
    
    for (const tGroupToCheck of tGroupsToTry) {
      try {
        const groupDetailsUrl = `${baseUrlClean}/groupDetails/${tGroupToCheck}/${body.language}`
        console.log('[ATL_PAYMENT] Step 2: Verifying groupDetails:', groupDetailsUrl)
        
        const groupCheck = await fetch(groupDetailsUrl, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
          },
          cache: 'no-store',
        })
        
        if (groupCheck.ok) {
          const groupData = await groupCheck.text()
          try {
            groupDetailsData = JSON.parse(groupData)
            const groupIds = groupDetailsData.ids
            
            // Extract event IDs from groupDetails.ids
            let eventIds: string[] = []
            if (groupIds) {
              const idsStr = Array.isArray(groupIds) ? groupIds.join(',') : String(groupIds)
              eventIds = idsStr.split(',').map((id: string) => id.trim()).filter(Boolean)
            }
            
            console.log('[ATL_PAYMENT] GroupDetails verified:', {
              t_group: tGroupToCheck,
              eventIds: eventIds,
              contains_t_id: eventIds.includes(String(body.t_id)),
            })
            
            // If this group contains our t_id, this is the correct t_group
            if (eventIds.includes(String(body.t_id))) {
              if (String(tGroupToCheck) !== String(correctedTGroup)) {
                console.warn('[ATL_PAYMENT] AUTO-CORRECTING t_group from groupDetails!', {
                  previous: correctedTGroup,
                  corrected: tGroupToCheck,
                  reason: 't_id found in groupDetails.ids',
                })
                correctedTGroup = String(tGroupToCheck)
              }
              break // Found correct group, stop checking
            } else {
              console.warn('[ATL_PAYMENT] t_id not found in groupDetails.ids:', {
                t_group: tGroupToCheck,
                t_id: body.t_id,
                available_ids: eventIds,
              })
            }
          } catch {
            // Not JSON, continue
          }
        }
      } catch (error) {
        // Continue to next t_group
        console.warn('[ATL_PAYMENT] Could not verify groupDetails for t_group:', tGroupToCheck)
      }
    }
  } catch (error) {
    console.warn('[ATL_PAYMENT] Could not verify event/group (non-critical):', error instanceof Error ? error.message : String(error))
  }
  
  // Use corrected t_group
  const finalTGroup = correctedTGroup
  
  // CRITICAL: Convert tourDate to YYYYMMDD format early (needed for availability check)
  let tourDateValue: string | null = null
  if (body.tourDate) {
    if (/^\d{8}$/.test(body.tourDate)) {
      tourDateValue = body.tourDate
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(body.tourDate)) {
      tourDateValue = body.tourDate.replace(/-/g, '')
    } else {
      tourDateValue = body.tourDate
    }
  }
  
  // Get sesTime value early (needed for availability check)
  const sesTimeValue = body.sesTime && body.sesTime.trim() ? body.sesTime.trim() : null
  
  // CRITICAL: Check availability before attempting payment (if date is provided)
  // This prevents -1 errors by ensuring the date/time is actually available
  let dateAvailable = true
  let availabilityError: string | null = null
  let availableDates: string[] = []
  let limits: any = null
  let isWdaysOnly = false
  
  if (body.tourDate && !isOnRequest && tourDateValue) {
    try {
      const monthStart = body.tourDate.substring(0, 7) + '-01' // YYYY-MM-01
      limits = await loadLimits(body.t_id, body.language, monthStart)
      
      const dateKey = tourDateValue // Format: YYYYMMDD
      
      // Convert dateKey to YYYY-MM-DD format for comparison
      const dateKeyFormatted = dateKey.length === 8 
        ? `${dateKey.substring(0, 4)}-${dateKey.substring(4, 6)}-${dateKey.substring(6, 8)}`
        : dateKey
      
      // Check if date is available
      // dates.date can be in YYYYMMDD or YYYY-MM-DD format
      const datesArray = limits?.dates?.date || []
      const hasDateInList = Array.isArray(datesArray) && (
        datesArray.includes(dateKey) || // YYYYMMDD format
        datesArray.includes(dateKeyFormatted) // YYYY-MM-DD format
      )
      availableDates = datesArray
      
      console.log('[ATL_PAYMENT] Date format check:', {
        dateKey,
        dateKeyFormatted,
        datesArraySample: datesArray.slice(0, 5),
        hasDateInList,
        checkingBothFormats: true,
      })
      
      // Check sessions for this date
      // Try both date formats (YYYYMMDD and YYYY-MM-DD)
      const sessionsObj = limits?.sessions || limits?.sessionsByDate || {}
      const dateSessions = sessionsObj[dateKey] || sessionsObj[dateKeyFormatted] || sessionsObj[body.tourDate] || []
      const hasSessions = Array.isArray(dateSessions) && dateSessions.length > 0
      
      // Check wdays (weekdays) mode
      const wdays = limits?.dates?.wdays || []
      const hasWdays = Array.isArray(wdays) && wdays.length > 0
      
      // For wdays_only mode, date might not be in dates.date but still be valid
      // Check calendarMode from limits if available
      const calendarMode = limits?.calendarMode || (hasWdays && datesArray.length === 0 ? 'wdays_only' : null)
      isWdaysOnly = calendarMode === 'wdays_only' || (hasWdays && datesArray.length === 0 && !hasSessions)
      
      // For wdays_only mode, if date is in availableDates, it's valid even if not in dates.date
      const isInAvailableDates = limits?.availableDates && Array.isArray(limits.availableDates) && (
        limits.availableDates.includes(dateKey) || limits.availableDates.includes(dateKeyFormatted)
      )
      
      // If date is in availableDates (from our API response), consider it available
      if (isInAvailableDates && !hasDateInList) {
        console.log('[ATL_PAYMENT] Date found in availableDates (wdays_only mode):', {
          dateKey,
          dateKeyFormatted,
          isInAvailableDates,
          calendarMode,
        })
      }
      
      // If we have a specific sesTime, check if it's available
      if (sesTimeValue && sesTimeValue !== '00:00') {
        const hasSession = Array.isArray(dateSessions) && dateSessions.some((s: any) => {
          const sessionTime = typeof s === 'string' ? s : s.time || s.sesTime
          return sessionTime === sesTimeValue
        })
        
        if (!hasSession && dateSessions.length > 0) {
          console.warn('[ATL_PAYMENT] Session time not available, but other sessions exist:', {
            requestedTime: sesTimeValue,
            availableTimes: dateSessions.map((s: any) => typeof s === 'string' ? s : s.time || s.sesTime),
          })
          dateAvailable = false
          availabilityError = `Session time ${sesTimeValue} not available for date ${dateKey}. Available times: ${dateSessions.map((s: any) => typeof s === 'string' ? s : s.time || s.sesTime).join(', ')}`
        }
      }
      
      // CRITICAL: If date is not in list AND no sessions AND not wdays_only, reject
      // Also check if date is in the future and might be too far ahead
      const requestedDate = new Date(
        parseInt(dateKey.substring(0, 4)),
        parseInt(dateKey.substring(4, 6)) - 1,
        parseInt(dateKey.substring(6, 8))
      )
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const isFutureDate = requestedDate > today
      const daysDiff = Math.floor((requestedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      // For wdays_only mode, check availableDates from our API response
      // If date is in availableDates, it's valid even if not in dates.date
      const finalHasDateInList = hasDateInList || isInAvailableDates
      
      if (!finalHasDateInList && !hasSessions && !isWdaysOnly) {
        dateAvailable = false
        const availableDatesStr = datesArray.length > 0 
          ? datesArray.slice(0, 10).join(', ') + (datesArray.length > 10 ? `... (${datesArray.length} total)` : '')
          : (limits?.availableDates && Array.isArray(limits.availableDates) && limits.availableDates.length > 0)
            ? limits.availableDates.slice(0, 10).join(', ') + (limits.availableDates.length > 10 ? `... (${limits.availableDates.length} total)` : '')
            : 'none'
        availabilityError = `Date ${dateKey} (${daysDiff > 0 ? `+${daysDiff} days` : 'past date'}) is not available for event ${body.t_id}. Available dates: ${availableDatesStr}`
      } else if (isWdaysOnly && !finalHasDateInList) {
        // For wdays_only mode, if date is not in availableDates either, it might still be valid
        // But we should warn if it's too far in the future
        if (daysDiff > 60) {
          console.warn('[ATL_PAYMENT] Date is more than 60 days in the future for wdays_only mode:', {
            date: dateKey,
            daysDiff,
          })
        }
        // For wdays_only, allow the date even if not explicitly listed
        console.log('[ATL_PAYMENT] wdays_only mode: allowing date even if not in dates.date:', {
          date: dateKey,
          calendarMode,
          isInAvailableDates,
        })
      }
      
      // Log availability check
      console.log('[ATL_PAYMENT] Availability check:', {
        date: dateKey,
        hasDateInList,
        hasSessions,
        hasWdays,
        isWdaysOnly,
        requestedSesTime: sesTimeValue || 'none',
        availableSessions: Array.isArray(dateSessions) ? dateSessions.map((s: any) => typeof s === 'string' ? s : s.time || s.sesTime) : [],
        availableDates: datesArray.slice(0, 10),
        dateAvailable,
      })
      
      // If date is not available, return error BEFORE attempting payment
      if (!dateAvailable && availabilityError) {
        console.error('========================================')
        console.error('[ATL_PAYMENT] BLOCKED: Date not available')
        console.error('========================================')
        console.error('t_id:', body.t_id)
        console.error('t_group:', finalTGroup)
        console.error('Requested date:', dateKey)
        console.error('Error:', availabilityError)
        console.error('Available dates:', datesArray.slice(0, 20))
        console.error('========================================')
        
        return NextResponse.json<ErrorResponse>(
          {
            ok: false,
            code: 'ATLANTICO_PAYMENT_FAILED',
            reason: availabilityError,
            upstreamPreview: 'Date/time not available (blocked before payment attempt)',
            upstreamStatus: 400,
          },
          { status: 400 }
        )
      }
    } catch (availabilityCheckError) {
      // If we can't check availability, log but continue (might be a temporary API issue)
      console.warn('[ATL_PAYMENT] Could not check availability (non-critical):', availabilityCheckError instanceof Error ? availabilityCheckError.message : String(availabilityCheckError))
      // Don't block payment if availability check fails - let Atlantico API decide
    }
  }

  // Build form-encoded body with ALL mandatory fields for /payment/ endpoint
  // According to PDF section 2.7, all parameters must be sent
  // Use corrected t_group if available
  // tourDateValue is already converted above
  const formData = new URLSearchParams()
  // CRITICAL: Ensure userId is 3645
  if (userId !== '3645') {
    console.error('[ATL_PAYMENT] ❌ CRITICAL ERROR: userId must be 3645! Current:', userId)
  }
  console.log('[ATL_PAYMENT] Sending userId to Atlantico API:', userId)
  formData.append('userId', userId)
  formData.append('t_id', String(body.t_id))
  formData.append('t_group', String(finalTGroup))
  formData.append('language', String(body.language))
  
  // tourDateValue is already converted above, just append it
  // CRITICAL: Ensure tourDate is in YYYYMMDD format (no dashes) as per PDF
  if (tourDateValue) {
    // Double-check format - remove any dashes
    const finalTourDate = tourDateValue.replace(/-/g, '')
    if (finalTourDate.length !== 8 || !/^\d{8}$/.test(finalTourDate)) {
      console.error('[ATL_PAYMENT] ❌ Invalid tourDate format:', {
        original: body.tourDate,
        converted: tourDateValue,
        final: finalTourDate,
        expected: 'YYYYMMDD (8 digits)',
      })
      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'BAD_REQUEST',
          reason: `Invalid tourDate format. Expected YYYYMMDD (8 digits), got: ${finalTourDate}`,
        },
        { status: 400 }
      )
    }
    formData.append('tourDate', finalTourDate)
    console.log('[ATL_PAYMENT] tourDate formatted:', {
      original: body.tourDate,
      final: finalTourDate,
    })
  }

  // Combination (Twin Ticket): second date for Loro Parque
  if (body.tourDate2 && /^\d{4}-\d{2}-\d{2}$/.test(body.tourDate2)) {
    const tourDate2Val = body.tourDate2.replace(/-/g, '')
    formData.append('tourDate2', tourDate2Val)
    console.log('[ATL_PAYMENT] tourDate2 (Loro Parque):', tourDate2Val)
  } else if (body.tourDate2 && /^\d{8}$/.test(body.tourDate2)) {
    formData.append('tourDate2', body.tourDate2)
    console.log('[ATL_PAYMENT] tourDate2 (Loro Parque):', body.tourDate2)
  }

  // Date range (car rental): end date
  if (body.tourDateEnd && /^\d{4}-\d{2}-\d{2}$/.test(body.tourDateEnd)) {
    const tourDateEndVal = body.tourDateEnd.replace(/-/g, '')
    formData.append('tourDateEnd', tourDateEndVal)
    console.log('[ATL_PAYMENT] tourDateEnd (car rental):', tourDateEndVal)
  } else if (body.tourDateEnd && /^\d{8}$/.test(body.tourDateEnd)) {
    formData.append('tourDateEnd', body.tourDateEnd)
    console.log('[ATL_PAYMENT] tourDateEnd (car rental):', body.tourDateEnd)
  }

  // According to PDF section 2.7:
  // - For wdays_only mode: sesTime can be "00:00" OR omitted
  // - For sessions mode: sesTime must be a valid HH:mm time
  // - For on-request (calendarMode: 'none'): sesTime is null and not sent
  // 
  // CRITICAL: For wdays_only mode, we should try WITHOUT sesTime first
  // If that fails with -1, we'll retry with "00:00" in the retry logic
  
  // Get calendarMode from limits if available (from availability check above)
  const detectedCalendarMode = limits?.calendarMode || (isWdaysOnly ? 'wdays_only' : null)
  const isWdaysOnlyMode = detectedCalendarMode === 'wdays_only'
  
  // sesTimeValue is already defined above
  
  if (sesTimeValue && sesTimeValue !== '00:00') {
    // Valid time provided (not "00:00"), send it
    formData.append('sesTime', sesTimeValue)
    console.log('[ATL_PAYMENT] Sending sesTime:', sesTimeValue)
  } else if (sesTimeValue === '00:00') {
    // Client explicitly sent "00:00" - send it
    formData.append('sesTime', '00:00')
    console.log('[ATL_PAYMENT] Sending sesTime="00:00" (explicitly provided)')
  } else if (!isOnRequest && body.tourDate && !isWdaysOnlyMode) {
    // For non-wdays_only bookings without sesTime, send "00:00"
    // This is required by Atlantico API for events without specific session times
    console.log('[ATL_PAYMENT] No sesTime provided, sending "00:00" for date-based booking (non-wdays_only mode)')
    formData.append('sesTime', '00:00')
  } else if (!isOnRequest && body.tourDate && isWdaysOnlyMode) {
    // For wdays_only mode, DON'T send sesTime initially
    // We'll try without it first, and retry with "00:00" if that fails
    console.log('[ATL_PAYMENT] wdays_only mode: NOT sending sesTime (will retry with "00:00" if needed)')
    // Don't append sesTime
  }
  // For on-request bookings (calendarMode: 'none'), don't send sesTime at all
  
  formData.append('adults', String(body.adults))
  formData.append('childs', String(body.childs ?? 0))
  formData.append('infants', String(body.infants ?? 0))
  formData.append('name', body.name.trim())
  formData.append('email', body.email.trim())
  formData.append('phone', body.phone.trim())
  if (body.hotel) formData.append('hotel', body.hotel)
  if (body.room) formData.append('room', body.room)
  if (body.mpoint) formData.append('mpoint', body.mpoint)
  if (body.mtime) formData.append('mtime', body.mtime)
  if (body.notes) formData.append('notes', body.notes)

  // Log exact form-encoded payload (redact email/phone for privacy)
  const formBodyString = formData.toString()
  const redactedPayload = formBodyString
    .replace(/email=[^&]*/gi, 'email=[REDACTED]')
    .replace(/phone=[^&]*/gi, 'phone=[REDACTED]')

  // ALWAYS log full payload for debugging (critical for payment debugging)
  const fullPayloadForLog = formData.toString().replace(/email=[^&]*/gi, 'email=[REDACTED]').replace(/phone=[^&]*/gi, 'phone=[REDACTED]')
  
  // Check if sesTime was added to formData (after all fields are added)
  const sesTimeInPayload = formBodyString.includes('sesTime=')
  
  console.log('========================================')
  console.log('[ATL_PAYMENT_PROXY] Request received:')
  console.log('========================================')
  console.log('Base URL:', baseUrl)
  console.log('✅ User ID:', userId, '(from env:', process.env.ATLANTICO_USER_ID ? 'SET' : 'NOT SET', ')')
  if (userId !== '3645') {
    console.error('❌ ERROR: User ID must be 3645! Current:', userId)
  }
  console.log('t_id:', body.t_id)
  console.log('t_group (original):', body.t_group)
  console.log('t_group (final):', finalTGroup)
  console.log('language:', body.language)
  console.log('tourDate (original):', body.tourDate)
  console.log('tourDate (formatted):', tourDateValue)
  console.log('⚠️ CRITICAL: tourDate format must be YYYYMMDD (no dashes) - Current:', tourDateValue)
  if (tourDateValue && tourDateValue.includes('-')) {
    console.error('❌ ERROR: tourDate contains dashes! Should be YYYYMMDD format')
  }
  console.log('sesTime (value):', sesTimeValue || '(none)')
  console.log('sesTime (in payload):', sesTimeInPayload ? 'YES' : 'NO')
  console.log('isWdaysOnly:', isWdaysOnly)
  console.log('calendarMode:', limits?.calendarMode || 'unknown')
  console.log('isOnRequest:', isOnRequest)
  console.log('adults:', body.adults)
  console.log('childs:', body.childs ?? 0)
  console.log('infants:', body.infants ?? 0)
  console.log('name:', body.name)
  console.log('email:', body.email ? '[REDACTED]' : '(missing)')
  console.log('phone:', body.phone ? '[REDACTED]' : '(missing)')
  console.log('Full payload (form-urlencoded):', fullPayloadForLog)
  console.log('========================================')
  console.log('[ATL_PAYMENT] CRITICAL CHECK:')
  console.log('========================================')
  console.log('✅ userId:', userId ? 'SET' : '❌ MISSING')
  console.log('✅ t_id:', body.t_id ? 'SET' : '❌ MISSING')
  console.log('✅ t_group:', finalTGroup ? 'SET' : '❌ MISSING')
  console.log('✅ language:', body.language ? 'SET' : '❌ MISSING')
  console.log('✅ tourDate:', tourDateValue ? 'SET' : (isOnRequest ? 'OMITTED (on-request)' : '❌ MISSING'))
  console.log('✅ sesTime:', sesTimeInPayload ? 'SENT' : (isOnRequest ? 'OMITTED (on-request)' : (isWdaysOnly ? 'OMITTED (wdays_only)' : '❌ MISSING')))
  console.log('✅ adults:', body.adults >= 1 ? 'SET' : '❌ MISSING')
  console.log('✅ name:', body.name ? 'SET' : '❌ MISSING')
  console.log('✅ email:', body.email ? 'SET' : '❌ MISSING')
  console.log('✅ phone:', body.phone ? 'SET' : '❌ MISSING')
  console.log('========================================')

  // Use exclusively POST ${baseUrl}/payment/ endpoint
  const paymentEndpoint = '/payment/'
  const actionUrl = `${baseUrlClean}${paymentEndpoint}`

  // Build headers - CRITICAL: Use exact Content-Type as per PDF
  // According to PDF, the Content-Type must be application/x-www-form-urlencoded
  const headers: HeadersInit = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Accept': '*/*',
    'User-Agent': 'Tenerife-Activity/1.0',
  }
  const token = process.env.ATLANTICO_TOKEN
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`
  }
  
  // CRITICAL: Log the exact payload being sent
  const finalPayload = formData.toString()
  console.log('[ATL_PAYMENT] Final payload to send:', {
    userId: userId,
    t_id: body.t_id,
    t_group: finalTGroup,
    language: body.language,
    tourDate: tourDateValue || '(none)',
    sesTime: sesTimeInPayload ? 'present' : 'absent',
    adults: body.adults,
    childs: body.childs ?? 0,
    infants: body.infants ?? 0,
    hasName: !!body.name,
    hasEmail: !!body.email,
    hasPhone: !!body.phone,
    payloadLength: finalPayload.length,
    payloadPreview: finalPayload.substring(0, 200),
  })

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ATL_PAYMENT_UPSTREAM_REQUEST]', {
        baseUrl,
        path: paymentEndpoint,
        fullUrl: actionUrl,
        method: 'POST',
        contentType: 'application/x-www-form-urlencoded; charset=utf-8',
        hasToken: !!token,
        payloadRedacted: redactedPayload,
      })
    }

    // CRITICAL: Ensure body is properly encoded
    const requestBody = formData.toString()
    
    // Validate that all required fields are in the payload
    const requiredFields = ['userId', 't_id', 't_group', 'language', 'adults', 'name', 'email', 'phone']
    const missingInPayload: string[] = []
    for (const field of requiredFields) {
      if (!requestBody.includes(`${field}=`)) {
        missingInPayload.push(field)
      }
    }
    
    if (missingInPayload.length > 0) {
      console.error('[ATL_PAYMENT] ❌ CRITICAL: Missing required fields in payload:', missingInPayload)
      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'BAD_REQUEST',
          reason: `Missing required fields in payload: ${missingInPayload.join(', ')}`,
        },
        { status: 400 }
      )
    }
    
    // Ensure tourDate is present if not on-request
    if (!isOnRequest && !requestBody.includes('tourDate=')) {
      console.error('[ATL_PAYMENT] ❌ CRITICAL: tourDate is missing in payload for non-on-request booking')
      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'BAD_REQUEST',
          reason: 'tourDate is required for this booking type',
        },
        { status: 400 }
      )
    }
    
    const upstream = await fetch(actionUrl, {
      method: 'POST',
      headers,
      body: requestBody,
      cache: 'no-store',
      redirect: 'manual',
    })

    const upstreamStatus = upstream.status
    const upstreamContentType = upstream.headers.get('content-type')
    const upstreamHeaders = upstream.headers
    
    // CRITICAL: Handle 400 Bad Request specifically
    if (upstreamStatus === 400) {
      const upstreamText = await upstream.text()
      console.error('========================================')
      console.error('[ATL_PAYMENT] ❌ 400 Bad Request from Atlantico API')
      console.error('========================================')
      console.error('Response body:', upstreamText)
      console.error('Request URL:', actionUrl)
      console.error('Request method: POST')
      console.error('Request headers:', Object.fromEntries(Object.entries(headers)))
      console.error('Request body (first 500 chars):', requestBody.substring(0, 500))
      console.error('Full payload fields:', {
        userId: userId,
        t_id: body.t_id,
        t_group: finalTGroup,
        language: body.language,
        tourDate: tourDateValue || '(none)',
        sesTime: sesTimeInPayload ? 'present' : 'absent',
        adults: body.adults,
        childs: body.childs ?? 0,
        infants: body.infants ?? 0,
        name: body.name ? 'present' : 'missing',
        email: body.email ? 'present' : 'missing',
        phone: body.phone ? 'present' : 'missing',
      })
      console.error('========================================')
      
      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'ATLANTICO_PAYMENT_FAILED',
          reason: `Bad Request (400) from Atlantico API. This usually means invalid parameters or missing required fields. Check server logs for details. Response: ${upstreamText.substring(0, 200)}`,
          upstreamPreview: upstreamText.substring(0, 200),
          upstreamStatus: 400,
        },
        { status: 400 }
      )
    }
    
    const upstreamText = await upstream.text()

    // ALWAYS log response details (even in production for critical debugging)
    console.log('[ATL_PAYMENT_UPSTREAM_RESPONSE]', {
      baseUrl,
      path: paymentEndpoint,
      fullUrl: actionUrl,
      status: upstreamStatus,
      statusText: upstream.statusText,
      contentType: upstreamContentType,
      hasLocation: !!upstream.headers.get('Location'),
      location: upstream.headers.get('Location'),
      bodyLength: upstreamText.length,
      bodyPreview: upstreamText.substring(0, 1000),
      bodyEnd: upstreamText.length > 1000 ? upstreamText.substring(upstreamText.length - 500) : '',
      firstChars: upstreamText.substring(0, 100),
      lastChars: upstreamText.length > 100 ? upstreamText.substring(upstreamText.length - 100) : '',
      allHeaders: Object.fromEntries(upstreamHeaders.entries()),
      payloadSent: redactedPayload,
      isHTML: looksLikeHtml(upstreamText.trim(), upstreamContentType),
      hasForm: upstreamText.includes('<form') || upstreamText.includes('getnet'),
    })

    // Handle 301/302 redirects: return NextResponse.redirect
    if (upstreamStatus >= 300 && upstreamStatus < 400) {
      const location = upstream.headers.get('Location')
      if (location) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ATL_PAYMENT_REDIRECT]', {
            baseUrl,
            path: paymentEndpoint,
            status: upstreamStatus,
            location,
          })
        }
        return NextResponse.redirect(location)
      }
    }

    const trimmed = upstreamText.trim()
    
    // Check if sesTime was in the original payload
    const originalPayloadString = formData.toString()
    const sesTimeInOriginalPayload = originalPayloadString.includes('sesTime=')
    
    // CRITICAL: Check for "-1" error response FIRST (before HTML detection)
    // "-1" is Atlantico's error code meaning invalid parameters or booking failure
    // If we get -1, try different parameter combinations automatically
    if (trimmed === '-1' || trimmed === '-1\n' || trimmed === '-1\r\n') {
      console.error('========================================')
      console.error('[ATL_PAYMENT_ERROR] Atlantico returned -1, attempting auto-fix...')
      console.error('========================================')
      console.error('Original payload had sesTime:', sesTimeInOriginalPayload)
      console.error('sesTime value:', sesTimeValue || '(none)')
      
      // Get calendarMode from limits if available
      const detectedCalendarMode = limits?.calendarMode || (isWdaysOnly ? 'wdays_only' : null)
      const isWdaysOnlyMode = detectedCalendarMode === 'wdays_only'
      
      // Try different parameter combinations according to PDF
      // According to PDF section 2.7, different events may require different parameter formats
      const retryVariants = [
        // Variant 1: For wdays_only mode, try WITH sesTime="00:00" if we didn't send it
        isWdaysOnlyMode && !sesTimeInOriginalPayload && body.tourDate ? { addSesTime00: true } : null,
        // Variant 2: Remove sesTime completely (if we sent "00:00" and it failed)
        sesTimeValue === '00:00' || sesTimeInOriginalPayload ? { removeSesTime: true } : null,
        // Variant 3: Try with original t_group if we corrected it
        correctedTGroup !== body.t_group ? { useOriginalTGroup: true } : null,
        // Variant 4: Ensure tourDate is in YYYYMMDD format (not YYYY-MM-DD)
        tourDateValue && tourDateValue.includes('-') ? { fixTourDateFormat: true } : null,
        // Variant 5: Try without tourDate (on-request booking) - only if not wdays_only
        body.tourDate && !isWdaysOnlyMode ? { removeTourDate: true } : null,
      ].filter(Boolean) as Array<{ removeSesTime?: boolean; removeTourDate?: boolean; useOriginalTGroup?: boolean; addSesTime00?: boolean; fixTourDateFormat?: boolean }>
      
      // If no variants to try, or if we've already tried, return error
      if (retryVariants.length === 0) {
        const fullPayload = formData.toString().replace(/email=[^&]*/gi, 'email=[REDACTED]').replace(/phone=[^&]*/gi, 'phone=[REDACTED]')
        
        console.error('[ATL_PAYMENT_ERROR] No retry variants available, returning error')
        console.error('t_id:', body.t_id)
        console.error('t_group (used):', finalTGroup)
        console.error('t_group (original):', body.t_group)
        console.error('tourDate:', tourDateValue)
        console.error('sesTime:', sesTimeValue || '(none)')
        console.error('Full payload:', fullPayload)
        
        return NextResponse.json<ErrorResponse>(
          {
            ok: false,
            code: 'ATLANTICO_PAYMENT_FAILED',
            reason: 'Payment request rejected by Atlantico API (returned -1). Possible causes: invalid parameters, date/time not available, or missing required fields. Check server logs for details.',
            upstreamPreview: '-1 (Atlantico error code)',
            upstreamStatus,
          },
          { status: 400 }
        )
      }
      
      // Try each variant
      for (const variant of retryVariants) {
        console.log('[ATL_PAYMENT_RETRY] Trying variant:', variant)
        
        const retryFormData = new URLSearchParams()
        retryFormData.append('userId', userId)
        retryFormData.append('t_id', String(body.t_id))
        retryFormData.append('t_group', String(variant.useOriginalTGroup ? body.t_group : finalTGroup))
        retryFormData.append('language', String(body.language))
        
        if (!variant.removeTourDate && tourDateValue) {
          // CRITICAL: Ensure tourDate is always in YYYYMMDD format (no dashes)
          let retryTourDate = tourDateValue
          if (variant.fixTourDateFormat || retryTourDate.includes('-')) {
            retryTourDate = retryTourDate.replace(/-/g, '')
            console.log('[ATL_PAYMENT_RETRY] Fixed tourDate format:', {
              original: tourDateValue,
              fixed: retryTourDate,
            })
          }
          retryFormData.append('tourDate', retryTourDate)
        }
        
        if (variant.addSesTime00) {
          // Explicitly add sesTime="00:00"
          retryFormData.append('sesTime', '00:00')
        } else if (!variant.removeSesTime) {
          // Keep original sesTime logic
          if (sesTimeValue && sesTimeValue !== '00:00') {
            retryFormData.append('sesTime', sesTimeValue)
          } else if (sesTimeValue === '00:00' && !isOnRequest && body.tourDate) {
            retryFormData.append('sesTime', '00:00')
          }
        }
        // If removeSesTime is true, don't add sesTime at all
        
        retryFormData.append('adults', String(body.adults))
        retryFormData.append('childs', String(body.childs ?? 0))
        retryFormData.append('infants', String(body.infants ?? 0))
        retryFormData.append('name', body.name.trim())
        retryFormData.append('email', body.email.trim())
        retryFormData.append('phone', body.phone.trim())
        if (body.hotel) retryFormData.append('hotel', body.hotel)
        if (body.room) retryFormData.append('room', body.room)
        if (body.mpoint) retryFormData.append('mpoint', body.mpoint)
        if (body.mtime) retryFormData.append('mtime', body.mtime)
        if (body.notes) retryFormData.append('notes', body.notes)
        
        try {
          const retryResponse = await fetch(actionUrl, {
            method: 'POST',
            headers,
            body: retryFormData.toString(),
            cache: 'no-store',
            redirect: 'manual',
          })
          
          const retryText = await retryResponse.text()
          const retryTrimmed = retryText.trim()
          
          console.log('[ATL_PAYMENT_RETRY] Variant result:', {
            variant,
            status: retryResponse.status,
            isError: retryTrimmed === '-1',
            isHTML: looksLikeHtml(retryTrimmed, retryResponse.headers.get('content-type')),
            bodyLength: retryText.length,
            preview: retryText.substring(0, 200),
          })
          
          // If this variant succeeded (not -1), use it
          if (retryTrimmed !== '-1' && retryTrimmed !== '-1\n' && retryTrimmed !== '-1\r\n') {
            console.log('[ATL_PAYMENT_RETRY] SUCCESS with variant:', variant)

            // Affiliate tracking on retry success (same hook as main path).
            try {
              const booking = extractBookingDataFromHtml(retryText)
              if (booking) {
                const result = await recordAffiliateSaleFromRequest(request, {
                  bookingReference: booking.order,
                  amount: booking.amount,
                  activityName: booking.productDescription,
                  activityDate: tourDateValue,
                })
                console.log('[ATL_PAYMENT_AFFILIATE] (retry)', { ...result, order: booking.order, amount: booking.amount })
              }
            } catch (affiliateErr) {
              console.warn('[ATL_PAYMENT_AFFILIATE] retry hook error', affiliateErr)
            }

            // Handle redirect
            if (retryResponse.status >= 300 && retryResponse.status < 400) {
              const location = retryResponse.headers.get('Location')
              if (location) {
                return NextResponse.redirect(location)
              }
            }
            
            // Return HTML response
            const contentType = retryResponse.headers.get('content-type')?.includes('html')
              ? retryResponse.headers.get('content-type')!
              : 'text/html; charset=utf-8'
            
            const res = new NextResponse(retryText, {
              status: retryResponse.status || 200,
              headers: {
                'Content-Type': contentType,
              },
            })
            
            retryResponse.headers.forEach((value, key) => {
              const lowerKey = key.toLowerCase()
              if (lowerKey !== 'content-type' && 
                  lowerKey !== 'x-frame-options' && 
                  lowerKey !== 'content-security-policy' &&
                  lowerKey !== 'x-content-type-options') {
                res.headers.set(key, value)
              }
            })
            
            return res
          }
        } catch (retryError) {
          console.warn('[ATL_PAYMENT_RETRY] Variant failed:', variant, retryError instanceof Error ? retryError.message : String(retryError))
          continue
        }
      }
      
      // All variants failed, return original error with DETAILED diagnostics
      const fullPayload = formData.toString().replace(/email=[^&]*/gi, 'email=[REDACTED]').replace(/phone=[^&]*/gi, 'phone=[REDACTED]')
      
      console.error('========================================')
      console.error('[ATL_PAYMENT_ERROR] All retry variants failed')
      console.error('========================================')
      console.error('DIAGNOSTIC COMPLET:')
      console.error('  userId:', userId, '(env:', process.env.ATLANTICO_USER_ID ? 'SET' : 'NOT SET', ')')
      if (userId !== '3645') {
        console.error('  ❌ ERROR: User ID must be 3645! Current:', userId)
      }
      console.error('  t_id:', body.t_id)
      console.error('  t_group (original):', body.t_group)
      console.error('  t_group (final):', finalTGroup)
      console.error('  language:', body.language)
      console.error('  tourDate (original):', body.tourDate)
      console.error('  tourDate (formatted):', tourDateValue)
      console.error('  sesTime (value):', sesTimeValue || '(none)')
      console.error('  sesTime (in original payload):', sesTimeInOriginalPayload)
      console.error('  isWdaysOnly:', isWdaysOnly)
      console.error('  calendarMode:', limits?.calendarMode || 'unknown')
      console.error('  isOnRequest:', isOnRequest)
      console.error('  adults:', body.adults)
      console.error('  childs:', body.childs ?? 0)
      console.error('  infants:', body.infants ?? 0)
      console.error('  name:', body.name)
      console.error('  email:', body.email ? '[REDACTED]' : '(missing)')
      console.error('  phone:', body.phone ? '[REDACTED]' : '(missing)')
      console.error('')
      console.error('PAYLOAD EXACT ENVOYÉ (form-urlencoded):')
      console.error('  ', fullPayload)
      console.error('')
      console.error('VARIANTES TESTÉES:')
      retryVariants.forEach((v, i) => {
        console.error(`  ${i + 1}.`, JSON.stringify(v))
      })
      console.error('')
      console.error('POSSIBLES CAUSES:')
      console.error('  1. userId incorrect ou non autorisé')
      console.error('  2. t_group ne correspond pas au t_id')
      console.error('  3. Date non disponible (même si dans availableDates)')
      console.error('  4. Format de date incorrect (doit être YYYYMMDD)')
      console.error('  5. Paramètre manquant ou mal formaté')
      console.error('  6. API Atlantico nécessite un paramètre supplémentaire')
      console.error('  7. Problème de quota ou limite pour ce userId')
      console.error('========================================')
      
      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'ATLANTICO_PAYMENT_FAILED',
          reason: 'Payment request rejected by Atlantico API (returned -1). Tried multiple parameter combinations but all failed. Possible causes: invalid parameters, date/time not available, or missing required fields. Check server logs for details.',
          upstreamPreview: '-1 (Atlantico error code)',
          upstreamStatus,
        },
        { status: 400 }
      )
    }
    
    const htmlLike = looksLikeHtml(trimmed, upstreamContentType)
    const hasForm = trimmed.includes('<form') || trimmed.includes('getnet')
    const hasPaymentKeywords = trimmed.toLowerCase().includes('payment') || 
                                trimmed.toLowerCase().includes('gateway') || 
                                trimmed.toLowerCase().includes('card') ||
                                trimmed.toLowerCase().includes('getnet')

    // If response is empty or blank, return error
    if (!trimmed || trimmed.length === 0) {
      console.error('[ATL_PAYMENT_EMPTY_RESPONSE]', {
        baseUrl,
        path: paymentEndpoint,
        status: upstreamStatus,
        contentType: upstreamContentType,
        allHeaders: Object.fromEntries(upstreamHeaders.entries()),
        requestPayload: redactedPayload,
      })

      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'ATLANTICO_PAYMENT_FAILED',
          reason: 'Empty response from payment gateway',
          upstreamPreview: 'Response body is empty',
          upstreamStatus,
        },
        { status: 502 }
      )
    }

    // CRITICAL: If body contains ANY HTML-like content, return as HTML
    // This includes: <html, <form, getnet, payment, gateway, card, or any HTML tags
    // BUT: Exclude "-1" which is an error code, not HTML
    const mightBeHTML = (htmlLike || hasForm || hasPaymentKeywords || 
                        trimmed.includes('<') || trimmed.includes('<!') ||
                        (upstreamContentType && upstreamContentType.includes('html'))) &&
                        trimmed !== '-1' // Exclude error code
    
    // CRITICAL: If status is 200 and we have content, assume it's HTML (GetNet form from PDF)
    // The PDF says /payment/ returns HTML form, so we should always treat 200 responses as HTML
    // BUT: Only if it's not "-1" error code
    const shouldReturnAsHTML = mightBeHTML || (upstreamStatus === 200 && upstreamText.length > 0 && trimmed !== '-1')
    
    if (shouldReturnAsHTML) {
      // Affiliate tracking: extract Redsys booking ref + amount from the HTML form and
      // record a pending conversion BEFORE piping to the browser. Non-blocking on failure.
      try {
        const booking = extractBookingDataFromHtml(upstreamText)
        if (booking) {
          const result = await recordAffiliateSaleFromRequest(request, {
            bookingReference: booking.order,
            amount: booking.amount,
            activityName: booking.productDescription,
            activityDate: tourDateValue,
          })
          console.log('[ATL_PAYMENT_AFFILIATE]', { ...result, order: booking.order, amount: booking.amount })
        }
      } catch (affiliateErr) {
        console.warn('[ATL_PAYMENT_AFFILIATE] hook error', affiliateErr)
      }

      console.log('[ATL_PAYMENT_HTML_RESPONSE] Returning HTML to browser:', {
        baseUrl,
        path: paymentEndpoint,
        status: upstreamStatus,
        contentType: upstreamContentType,
        htmlDetected: htmlLike,
        hasForm,
        hasPaymentKeywords,
        bodyLength: upstreamText.length,
        bodyPreview: upstreamText.substring(0, 1000),
        detectionReason: htmlLike ? 'htmlLike' : hasForm ? 'hasForm' : hasPaymentKeywords ? 'hasPaymentKeywords' : 'status200_assumed',
        firstChars: upstreamText.substring(0, 200),
      })
      
      // CRITICAL: Always return as HTML if it might be HTML
      // Ensure proper Content-Type for HTML
      const contentType = upstreamContentType?.includes('html') 
        ? upstreamContentType 
        : 'text/html; charset=utf-8'
      
      // Create response with HTML content
      // CRITICAL: Remove ALL security headers that might block the payment form
      // Also ensure the HTML is properly formatted for browser display
      const res = new NextResponse(upstreamText, {
        status: upstreamStatus || 200,
        headers: {
          'Content-Type': contentType,
          // CRITICAL: Don't set any security headers that might block form submission
          // Remove X-Frame-Options, Content-Security-Policy, etc.
          // Allow the form to submit to RedSys payment gateway
        },
      })
      
      // CRITICAL: Log that we're returning HTML
      console.log('[ATL_PAYMENT_HTML_RESPONSE] Returning HTML response to browser:', {
        status: res.status,
        contentType: res.headers.get('content-type'),
        bodyLength: upstreamText.length,
        hasForm: upstreamText.includes('<form'),
        hasAutoSubmit: upstreamText.includes('document.forms[0].submit()'),
      })
      
      // Copy other headers (except security headers and compression headers that cause issues)
      upstreamHeaders.forEach((value, key) => {
        const lowerKey = key.toLowerCase()
        // Don't copy security headers that might block GetNet
        // CRITICAL: Don't copy content-encoding (gzip) - Next.js will handle compression automatically
        // Copying it causes ERR_CONTENT_DECODING_FAILED because the body is already decompressed
        if (lowerKey !== 'content-type' && 
            lowerKey !== 'x-frame-options' && 
            lowerKey !== 'content-security-policy' &&
            lowerKey !== 'x-content-type-options' &&
            lowerKey !== 'content-encoding' && // Don't copy gzip/deflate - body is already decompressed
            lowerKey !== 'content-length') { // Content-Length will be wrong after decompression
          res.headers.set(key, value)
        }
      })
      
      console.log('[ATL_PAYMENT_HTML_RESPONSE] Response created:', {
        contentType: res.headers.get('content-type'),
        status: res.status,
        bodyLength: upstreamText.length,
        headersCount: Array.from(res.headers.keys()).length,
        allHeaders: Object.fromEntries(res.headers.entries()),
        hasForm: upstreamText.includes('<form'),
        hasAutoSubmit: upstreamText.includes('document.forms[0].submit()'),
        first100Chars: upstreamText.substring(0, 100),
      })
      
      // CRITICAL: Ensure the response is treated as HTML by the browser
      // Remove any Next.js specific headers that might interfere
      res.headers.delete('x-middleware-rewrite')
      res.headers.delete('x-middleware-redirect')
      res.headers.delete('x-nextjs-rewrite')
      res.headers.delete('x-nextjs-redirect')
      
      // CRITICAL: Remove compression headers to prevent ERR_CONTENT_DECODING_FAILED
      // The body is already decompressed by fetch, so we must not indicate it's compressed
      res.headers.delete('content-encoding')
      res.headers.delete('content-length') // Will be recalculated by Next.js
      
      // Set correct content-length for the decompressed body
      res.headers.set('content-length', String(Buffer.byteLength(upstreamText, 'utf8')))
      
      return res
    }

    // Check if body is a plain reference number (digits/alphanumeric)
    if (/^[A-Z0-9-]{3,50}$/i.test(trimmed)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ATL_PAYMENT_REFERENCE]', {
          baseUrl,
          path: paymentEndpoint,
          reference: trimmed,
        })
      }
      const affiliateSale = await recordAffiliateSaleFromRequest(request, {
        bookingReference: trimmed,
        activityDate: tourDateValue,
      })
      if (process.env.NODE_ENV === 'development') {
        console.log('[ATL_PAYMENT_AFFILIATE]', affiliateSale)
      }
      return NextResponse.json({ ok: true, reference: trimmed })
    }

    // Check for other short non-HTML error responses (already handled "-1" above)
    if (!htmlLike && !hasForm && trimmed.length <= 20 && trimmed !== '-1') {
      console.error('[ATL_PAYMENT_FAILED] Short error response:', {
        baseUrl,
        path: paymentEndpoint,
        status: upstreamStatus,
        contentType: upstreamContentType,
        body: trimmed,
        headers: Object.fromEntries(upstreamHeaders.entries()),
        payloadSent: redactedPayload,
      })

      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'ATLANTICO_PAYMENT_FAILED',
          reason: `Payment request failed: ${trimmed}`,
          upstreamPreview: trimmed.substring(0, 200),
          upstreamStatus,
        },
        { status: 502 }
      )
    }

    // Fallback: If status is 200 and body is not empty, assume it might be HTML
    // According to PDF, /payment/ should return HTML form (GetNet)
    console.log('[ATL_PAYMENT_FALLBACK_RESPONSE] Treating as potential HTML:', {
      baseUrl,
      path: paymentEndpoint,
      status: upstreamStatus,
      contentType: upstreamContentType,
      bodyLength: upstreamText.length,
      bodyPreview: upstreamText.substring(0, 1000),
      isHTML: htmlLike,
      hasForm: hasForm,
      hasPaymentKeywords,
      first200Chars: upstreamText.substring(0, 200),
    })
    
    // CRITICAL: If status is 200 and we have content, assume it's HTML (GetNet form)
    // This is a safety net - the PDF says /payment/ returns HTML
    const shouldTreatAsHTML = upstreamStatus === 200 && upstreamText.length > 0
    
    const contentType = shouldTreatAsHTML 
      ? (upstreamContentType?.includes('html') ? upstreamContentType : 'text/html; charset=utf-8')
      : (upstreamContentType || 'text/plain; charset=utf-8')
    
    console.log('[ATL_PAYMENT_FALLBACK_RESPONSE] Returning with:', {
      contentType,
      status: upstreamStatus,
      bodyLength: upstreamText.length,
      shouldTreatAsHTML,
    })
    
    const res = new NextResponse(upstreamText, { 
      status: upstreamStatus || 200,
      headers: {
        'Content-Type': contentType,
        // Remove security headers
        'X-Frame-Options': 'ALLOWALL',
      },
    })
    
    upstreamHeaders.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      if (lowerKey !== 'content-type' && 
          lowerKey !== 'x-frame-options' && 
          lowerKey !== 'content-security-policy' &&
          lowerKey !== 'x-content-type-options') {
        res.headers.set(key, value)
      }
    })
    
    return res
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATL_PAYMENT_FETCH_ERROR]', {
        baseUrl,
        path: paymentEndpoint,
        fullUrl: actionUrl,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return NextResponse.json<ErrorResponse>(
      {
        ok: false,
        code: 'ATLANTICO_PAYMENT_FAILED',
        reason: 'ATLANTICO_PAYMENT_FAILED',
        upstreamPreview:
          (error instanceof Error ? error.message.substring(0, 200) : 'Unknown error'),
      },
      { status: 502 }
    )
  }
}


