/**
 * POST /api/atlantico/revalidate
 * 
 * Revalidates cart items by checking availability and recalculating prices
 * 
 * Input: { items: CartItem[] }
 * Output: { items: RevalidatedItem[], errors: ValidationError[] }
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import type { CartItem, PriceSnapshot } from '@/lib/cart/types'
import { generateCartItemKey } from '@/lib/cart/types'
import { loadLimits, loadPrices } from '@/lib/atlantico/client-wrapper'
import { parseLoadPricesResponse } from '@/lib/atlantico/prices'

interface RevalidatedItem extends CartItem {
  revalidated: true
  priceChanged: boolean
  priceDiff?: number
  available: boolean
  availabilityError?: string
  availabilityReason?: 'time_not_found' | 'no_capacity' | 'no_sessions' | 'date_not_available'
  availableTimes?: string[]
  availableDates?: string[] // For no_sessions recovery: alternative dates with availability
  newPriceSnapshot?: PriceSnapshot
  calendarMode?: 'sessions' | 'dates' | 'wdays_only' | 'none' // Calendar mode from limits
}

interface ValidationError {
  itemKey: string
  error: string
  field?: string
}

interface RevalidateRequest {
  items: CartItem[]
}

interface RevalidateResponse {
  items: RevalidatedItem[]
  errors: ValidationError[]
  hasPriceChanges: boolean
  hasAvailabilityIssues: boolean
}

/**
 * Convert date from YYYY-MM-DD to YYYYMMDD format
 */
function toYYYYMMDD(dateISO: string): string {
  return dateISO.replaceAll('-', '')
}

/**
 * Normalize session time to HH:mm format
 */
function normalizeSessionTime(sesTime: string | null | undefined): string {
  if (!sesTime || sesTime.trim() === '') {
    return '00:00'
  }
  
  // Remove whitespace
  const cleaned = sesTime.trim()
  
  // If already in HH:mm format, return as-is
  if (/^\d{2}:\d{2}$/.test(cleaned)) {
    return cleaned
  }
  
  // Try to parse formats like "9:5", "0:0", "09:05", etc.
  const parts = cleaned.split(':')
  if (parts.length === 2) {
    const hours = parts[0].padStart(2, '0')
    const minutes = parts[1].padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  // Fallback to 00:00 if can't parse
  return '00:00'
}

/**
 * Extract available times from limits response
 * Returns array of time strings
 * IMPORTANT: Always access sessions via sessions[toYYYYMMDD(tourDate)]
 * CRITICAL: Only return valid times (not "00:00", not empty)
 */
function extractAvailableTimes(limits: any, tourDate: string | null): string[] {
  if (!tourDate) return []
  const sessionsKey = toYYYYMMDD(tourDate) // Always use YYYYMMDD format
  const times: string[] = []
  
  // Support both sessions and sessionsByDate formats (PDF mentions sessions["YYYYMMDD"])
  const sessionsObj = limits.sessions ?? limits.sessionsByDate
  if (sessionsObj && typeof sessionsObj === 'object') {
    // Always access via sessionsKey (YYYYMMDD format)
    const sessions = sessionsObj[sessionsKey]
    
    if (Array.isArray(sessions) && sessions.length > 0) {
      sessions.forEach((s: any) => {
        const sessionTime = typeof s === 'string' ? s : s.time || s.sesTime
        if (sessionTime && typeof sessionTime === 'string' && sessionTime.trim() !== '') {
          const normalized = normalizeSessionTime(sessionTime)
          // Only add valid times (not "00:00", not empty)
          if (normalized !== '00:00' && normalized !== '' && !times.includes(normalized)) {
            times.push(normalized)
          }
        }
      })
    }
  }
  
  // Also check sessionsByDay format (from normalizeLimits)
  if (limits.sessionsByDay && typeof limits.sessionsByDay === 'object') {
    const ymdDate = tourDate // YYYY-MM-DD format
    const daySessions = limits.sessionsByDay[ymdDate]
    if (Array.isArray(daySessions) && daySessions.length > 0) {
      daySessions.forEach((s: any) => {
        const sessionTime = typeof s === 'string' ? s : s.time || s.sesTime
        if (sessionTime && typeof sessionTime === 'string' && sessionTime.trim() !== '') {
          const normalized = normalizeSessionTime(sessionTime)
          if (normalized !== '00:00' && normalized !== '' && !times.includes(normalized)) {
            times.push(normalized)
          }
        }
      })
    }
  }
  
  return times.sort()
}

/**
 * Extract session details (sessionId, TipoReservaId, rcId) for a specific time
 * IMPORTANT: Always access sessions via sessions[toYYYYMMDD(tourDate)]
 */
function extractSessionDetails(limits: any, tourDate: string | null, sesTime: string | null): { sessionId?: string; TipoReservaId?: string; rcId?: string } {
  if (!tourDate || !sesTime) return {}
  const sessionsKey = toYYYYMMDD(tourDate) // Always use YYYYMMDD format
  const normalizedSesTime = normalizeSessionTime(sesTime)
  
  // Support both sessions and sessionsByDate formats (PDF mentions sessions["YYYYMMDD"])
  const sessionsObj = limits.sessions ?? limits.sessionsByDate
  if (sessionsObj && typeof sessionsObj === 'object') {
    // Always access via sessionsKey (YYYYMMDD format)
    const sessions = sessionsObj[sessionsKey]
    
    if (Array.isArray(sessions) && sessions.length > 0) {
      for (const s of sessions) {
        if (typeof s === 'object' && s !== null) {
          const sessionTime = s.time || s.sesTime || s.hora
          const normalizedSessionTime = normalizeSessionTime(sessionTime)
          
          if (normalizedSessionTime === normalizedSesTime || sessionTime === normalizedSesTime) {
            return {
              sessionId: s.sessionId != null ? String(s.sessionId) : undefined,
              TipoReservaId: s.TipoReservaId != null ? String(s.TipoReservaId) : 
                            s.tipoReservaId != null ? String(s.tipoReservaId) :
                            s.tipo_reserva_id != null ? String(s.tipo_reserva_id) : undefined,
              rcId: s.rcId != null ? String(s.rcId) :
                    s.rc_id != null ? String(s.rc_id) :
                    s.RcId != null ? String(s.RcId) : undefined,
            }
          }
        }
      }
    }
  }
  
  return {}
}

/**
 * Extract available dates from limits response (dates with at least 1 valid time slot)
 */
function extractAvailableDates(limits: any): string[] {
  const dates: string[] = []
  const seen = new Set<string>()
  
  if (limits.sessionsByDate && typeof limits.sessionsByDate === 'object') {
    const sessionsByDate = limits.sessionsByDate as Record<string, unknown>
    for (const dateStr of Object.keys(sessionsByDate)) {
      let normalizedDateStr: string | null = null
      
      // Convert YYYYMMDD to YYYY-MM-DD
      if (/^\d{8}$/.test(dateStr)) {
        const yearStr = dateStr.substring(0, 4)
        const monthStr = dateStr.substring(4, 6)
        const dayStr = dateStr.substring(6, 8)
        normalizedDateStr = `${yearStr}-${monthStr}-${dayStr}`
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        normalizedDateStr = dateStr
      }
      
      if (normalizedDateStr && !seen.has(normalizedDateStr)) {
        const sessions = sessionsByDate[dateStr]
        // Only include dates with at least 1 valid time slot (not "00:00")
        if (Array.isArray(sessions) && sessions.length > 0) {
          const hasValidTimeSlot = sessions.some((s: any) => {
            const time = typeof s === 'string' ? s : s.time || s.sesTime || s.hora
            return time && time !== '00:00' && time.trim() !== ''
          })
          
          if (hasValidTimeSlot) {
            dates.push(normalizedDateStr)
            seen.add(normalizedDateStr)
          }
        }
      }
    }
  }
  
  return dates.sort()
}

/**
 * Fetch available dates for the next 60 days for a given event
 * Returns up to 30 dates that have at least 1 valid time slot
 */
async function fetchAvailableDates(
  eventCode: string,
  language: string,
  startDate: string // YYYY-MM-DD
): Promise<string[]> {
  const allDates: string[] = []
  const seen = new Set<string>()
  
  // Calculate start and end dates (next 60 days)
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + 60)
  
  // Fetch limits for current month and next month
  const monthsToFetch: string[] = []
  const currentMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`
  monthsToFetch.push(currentMonth)
  
  // Add next month if needed
  const nextMonth = new Date(start)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
  if (nextMonth <= end) {
    monthsToFetch.push(nextMonthStr)
  }
  
  // Fetch limits for each month
  for (const monthStart of monthsToFetch) {
    try {
      const limits = await loadLimits(eventCode, language, monthStart)
      const dates = extractAvailableDates(limits)
      
      // Filter dates within the 60-day window and not in the past
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      for (const dateStr of dates) {
        const date = new Date(dateStr)
        date.setHours(0, 0, 0, 0)
        
        if (date >= today && date <= end && !seen.has(dateStr)) {
          allDates.push(dateStr)
          seen.add(dateStr)
        }
      }
    } catch (error) {
      // Continue with other months if one fails
      console.error(`[REVALIDATE] Error fetching limits for ${monthStart}:`, error)
    }
  }
  
  // Sort and limit to 30 dates
  return allDates.sort().slice(0, 30)
}

/**
 * Check if a session time is available for a given date
 * Auto-selects first available session if sesTime is not provided or invalid
 */
async function checkSessionAvailability(
  eventCode: string,
  language: string,
  tourDate: string | null,
  sesTime: string | null
): Promise<{ available: boolean; error?: string; reason?: 'time_not_found' | 'no_capacity' | 'no_sessions' | 'date_not_available'; availableTimes?: string[]; availableDates?: string[]; sessionId?: string; TipoReservaId?: string; rcId?: string; selectedSesTime?: string }> {
  try {
    // For calendarMode === 'none': tourDate and sesTime are null (on-request booking)
    if (tourDate === null || sesTime === null) {
      return { available: true } // On-request bookings are always available
    }
    
    // Calculate monthStart from tourDate (YYYY-MM-DD -> YYYY-MM-01)
    const monthStart = tourDate.substring(0, 7) + '-01'
    
    // Normalize sesTime first
    const normalizedSesTime = normalizeSessionTime(sesTime)
    
    // Fetch loadLimits for the correct month
    const limits = await loadLimits(eventCode, language, monthStart)
    
    // IMPORTANT: Always access sessions via sessionsByDate[toYYYYMMDD(tourDate)]
    const sessionsKey = toYYYYMMDD(tourDate)
    // Support both sessions and sessionsByDate formats (PDF mentions sessions["YYYYMMDD"])
    const sessionsObj = limits.sessions ?? limits.sessionsByDate ?? null
    const hasSessions = sessionsObj && typeof sessionsObj === 'object' && Object.keys(sessionsObj).length > 0
    
    // Check for wdays_only mode: has wdays but no dates.date and no sessions
    const hasWdays = Array.isArray(limits?.dates?.wdays) && limits.dates.wdays.length > 0
    const dateList = limits?.dates?.date ?? []
    const hasDatesArray = Array.isArray(dateList) && dateList.length > 0
    const isWdaysOnly = hasWdays && !hasDatesArray && !hasSessions
    
    // Check date availability from dates.date array
    const isDateInList = Array.isArray(dateList) && dateList.includes(sessionsKey)
    
    // Build availableDateKeys for logging
    let availableDateKeys: string[] = []
    if (hasSessions) {
      availableDateKeys = Object.keys(sessionsObj).filter(key => /^\d{8}$/.test(key))
    } else if (Array.isArray(dateList)) {
      availableDateKeys = dateList.map(d => String(d)).filter(d => /^\d{8}$/.test(d))
    }
    
    // [LIMITS_TRUTH] log
    if (process.env.NODE_ENV === 'development') {
      console.log('[LIMITS_TRUTH] revalidate/route.ts', {
        eventId: eventCode,
        monthStart,
        hasSessions,
        datesCount: availableDateKeys.length,
        datesSample: availableDateKeys.slice(0, 10),
        datesDateCount: dateList.length,
        sessionsObjKeysCount: hasSessions ? Object.keys(sessionsObj).length : 0,
      })
    }
    
    // DEV log (server only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[REVALIDATE_DEBUG]', {
        eventId: eventCode,
        tourDate,
        key: sessionsKey,
        hasSessions,
        sessionsKeysCount: hasSessions ? Object.keys(sessionsObj).length : 0,
        isDateInList,
        selectedSesTime: normalizedSesTime,
      })
    }
    
    // CAS A: hasSessions === true (events with sessions)
    if (hasSessions) {
      const daySessions = Array.isArray(sessionsObj[sessionsKey]) ? sessionsObj[sessionsKey] : []
      const sessionsCount = daySessions.length
      
      // Extract available times for recovery UI (ALWAYS extract, even if current sesTime is invalid)
      const availableTimes = extractAvailableTimes(limits, tourDate)
      
      // CRITICAL: If no sessions for this day => no_sessions
      if (sessionsCount === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[REVALIDATE] No sessions found:', {
            tourDate,
            sessionsKey,
            sessionsCount,
          })
        }
        return {
          available: false,
          error: `No sessions available on ${tourDate}`,
          reason: 'no_sessions',
          availableTimes: [], // No times available
          availableDates: [], // Will be populated by caller
          selectedSesTime: '00:00',
        }
      }
      
      // Auto-select first available session
      let selectedSesTime: string = normalizedSesTime
      let sessionToUse: any = null
      
      // Filter out invalid sessions (00:00, empty, etc.)
      const validSessions = daySessions.filter((s: any) => {
        const sessionTime = typeof s === 'string' ? s : s.time || s.sesTime
        const normalizedSessionTime = normalizeSessionTime(sessionTime)
        return normalizedSessionTime !== '00:00' && sessionTime && sessionTime.trim() !== ''
      })
      
      // If no valid sessions found, return error with available times
      if (validSessions.length === 0) {
        return {
          available: false,
          error: `No valid sessions available on ${tourDate}`,
          reason: 'no_sessions',
          availableTimes: [], // No valid times
          selectedSesTime: '00:00',
        }
      }
      
      // If client already has a sesTime and it matches a valid session, keep it
      if (normalizedSesTime !== '00:00' && normalizedSesTime !== '') {
        sessionToUse = validSessions.find((s: any) => {
          const sessionTime = typeof s === 'string' ? s : s.time || s.sesTime
          const normalizedSessionTime = normalizeSessionTime(sessionTime)
          return normalizedSessionTime === normalizedSesTime || 
                 sessionTime === normalizedSesTime ||
                 sessionTime?.includes(normalizedSesTime)
        })
        
        if (!sessionToUse) {
          // Client's sesTime doesn't match any valid session, auto-select first available
          sessionToUse = validSessions.find((s: any) => Number(s.available ?? "0") > 0) ?? validSessions[0]
          selectedSesTime = typeof sessionToUse === 'string' ? sessionToUse : (sessionToUse?.time || sessionToUse?.sesTime || '00:00')
          selectedSesTime = normalizeSessionTime(selectedSesTime)
          
          // If still "00:00", this is an error
          if (selectedSesTime === '00:00') {
            return {
              available: false,
              error: `Time is required for this booking`,
              reason: 'time_not_found',
              availableTimes, // Return available times for recovery UI
              selectedSesTime: '00:00',
            }
          }
        } else {
          // Keep the matching session time
          selectedSesTime = normalizedSesTime
        }
      } else {
        // No sesTime provided or "00:00", auto-select first available session
        sessionToUse = validSessions.find((s: any) => Number(s.available ?? "0") > 0) ?? validSessions[0]
        selectedSesTime = typeof sessionToUse === 'string' ? sessionToUse : (sessionToUse?.time || sessionToUse?.sesTime || '00:00')
        selectedSesTime = normalizeSessionTime(selectedSesTime)
        
        // If still "00:00", this is an error
        if (selectedSesTime === '00:00') {
          return {
            available: false,
            error: `Time is required for this booking`,
            reason: 'time_not_found',
            availableTimes, // Return available times for recovery UI
            selectedSesTime: '00:00',
          }
        }
      }
      
      // Extract session details for the selected session
      const sessionDetails = selectedSesTime !== '00:00' ? extractSessionDetails(limits, tourDate, selectedSesTime) : {}
      
      // Session found and auto-selected - return with session details
      return { 
        available: true, 
        availableTimes, 
        selectedSesTime,
        ...sessionDetails 
      }
    }
    
    // CAS B: wdays_only mode - according to PDF, sesTime can be "00:00" if no session time
    if (isWdaysOnly) {
      // For wdays_only: according to PDF section 2.7, sesTime can be "00:00" if there's no session time
      // We allow the booking to proceed with "00:00" for wdays_only mode
      // The availability will be confirmed by Atlantico
      return {
        available: true,
        availableTimes: [], // No times from loadLimits in wdays_only
        selectedSesTime: normalizedSesTime || '00:00', // Allow "00:00" for wdays_only
        // No session details for wdays_only
      }
    }
    
    // CAS C: hasSessions === false (sessionless events)
    // Check if date is in dates.date array
    if (!isDateInList) {
      return {
        available: false,
        error: `Date ${tourDate} is not available`,
        reason: 'date_not_available',
        availableTimes: [],
        availableDates: [],
        selectedSesTime: '00:00',
      }
    }
    
    // Date is available but no sessions -> sessionless event
    // FORCER sesTime="00:00" et available=true
    return {
      available: true,
      availableTimes: [], // No times for sessionless events
      selectedSesTime: '00:00', // Always "00:00" for sessionless
      // No session details for sessionless events
    }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Failed to check availability',
      reason: 'no_sessions',
      availableTimes: [],
      availableDates: [],
      selectedSesTime: '00:00',
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RevalidateRequest = await request.json()
    
    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'items array is required',
        },
        { status: 400 }
      )
    }
    
    const items = body.items
    const revalidatedItems: RevalidatedItem[] = []
    const errors: ValidationError[] = []
    let hasPriceChanges = false
    let hasAvailabilityIssues = false
    
    // Revalidate each item
    for (const item of items) {
      try {
        // DEV log: item being revalidated
        if (process.env.NODE_ENV === 'development') {
          console.log('[REVALIDATE] Item:', {
            t_group: item.t_group,
            t_id: item.t_id,
            tourDate: item.tourDate,
            sesTime: item.sesTime,
            adults: item.adults,
            childs: item.childs,
            infants: item.infants,
            language: item.language,
          })
        }
        
        // 1. Check availability (both dates for combinations)
        const availability = await checkSessionAvailability(
          item.t_id,
          item.language,
          item.tourDate,
          item.sesTime
        )
        let availability2: Awaited<ReturnType<typeof checkSessionAvailability>> | null = null
        if (item.isCombination && item.tourDate2) {
          availability2 = await checkSessionAvailability(
            item.t_id,
            item.language,
            item.tourDate2,
            item.sesTime || '00:00'
          )
          if (!availability2.available) {
            // Merge failure: second date unavailable
            availability.available = false
            availability.error = availability2.error || `Date ${item.tourDate2} (Loro Parque) not available`
            availability.reason = availability2.reason
          }
        }
        
        // DEV log: loadLimits response
        if (process.env.NODE_ENV === 'development') {
          console.log('[REVALIDATE] Availability check:', {
            t_id: item.t_id,
            tourDate: item.tourDate,
            sesTime: item.sesTime,
            available: availability.available,
            reason: availability.reason,
            availableTimesCount: availability.availableTimes?.length || 0,
            availableTimes: availability.availableTimes?.slice(0, 20) || [],
          })
        }
        
        // DEV log: decision
        if (!availability.available && process.env.NODE_ENV === 'development') {
          console.log('[REVALIDATE] SLOT_UNAVAILABLE decision:', {
            t_id: item.t_id,
            tourDate: item.tourDate,
            sesTime: item.sesTime,
            reason: availability.reason || 'unknown',
            availableTimes: availability.availableTimes || [],
          })
        }
        
        // If no_sessions or date_not_available, fetch available dates for recovery
        let availableDates: string[] = []
        if (!availability.available && (availability.reason === 'no_sessions' || availability.reason === 'date_not_available')) {
          try {
            // For calendarMode === 'none': skip availability recovery (on-request booking)
            if (!item.tourDate) {
              // Skip recovery for on-request bookings
            } else if (availability.reason === 'date_not_available') {
              // For date_not_available (sessionless), get dates from dates.date
              const limits = await loadLimits(item.t_id, item.language, item.tourDate)
              const dateList = limits?.dates?.date ?? []
              if (Array.isArray(dateList) && dateList.length > 0) {
                // Convert YYYYMMDD to YYYY-MM-DD and sort
                availableDates = dateList
                  .map(d => {
                    const dateStr = String(d)
                    if (/^\d{8}$/.test(dateStr)) {
                      const year = dateStr.substring(0, 4)
                      const month = dateStr.substring(4, 6)
                      const day = dateStr.substring(6, 8)
                      return `${year}-${month}-${day}`
                    }
                    return null
                  })
                  .filter((d): d is string => d !== null)
                  .sort()
              }
            } else if (item.tourDate) {
              // For no_sessions, use existing logic (only if tourDate is not null)
              availableDates = await fetchAvailableDates(item.t_id, item.language, item.tourDate)
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.log('[REVALIDATE] Fetched availableDates:', {
                t_id: item.t_id,
                tourDate: item.tourDate,
                reason: availability.reason,
                availableDatesCount: availableDates.length,
                availableDates: availableDates.slice(0, 10),
              })
            }
          } catch (error) {
            console.error('[REVALIDATE] Error fetching availableDates:', error)
            // Continue without availableDates
          }
        }
        
        if (!availability.available) {
          hasAvailabilityIssues = true
          errors.push({
            itemKey: item.itemKey,
            error: availability.error || 'Session not available',
            field: availability.reason === 'no_sessions' ? 'tourDate' : 'sesTime',
          })
        }
        
        // 2. Recalculate prices
        let newPriceSnapshot: PriceSnapshot | null = null
        let priceChanged = false
        let priceDiff = 0
        
        try {
          // For calendarMode === 'none': skip price recalculation (on-request booking)
          if (!item.tourDate) {
            // Skip price recalculation for on-request bookings
          } else {
            const prices = await loadPrices(item.t_id, item.tourDate)
            
            // Calculate new total
            const adultPrice = prices.adult || 0
            const childPrice = prices.child || 0
            const infantPrice = prices.infant || 0
            
            const newTotal = 
              adultPrice * item.adults +
              childPrice * (item.childs || 0) +
              infantPrice * (item.infants || 0)
            
            newPriceSnapshot = {
              adult: adultPrice,
              child: childPrice,
              infant: infantPrice,
              total: newTotal,
            }
            
            // Compare with original
            const originalTotal = item.priceSnapshot.total
            priceDiff = newTotal - originalTotal
            priceChanged = Math.abs(priceDiff) > 0.01 // Allow small floating point differences
            
            if (priceChanged) {
              hasPriceChanges = true
            }
          }
        } catch (priceError) {
          errors.push({
            itemKey: item.itemKey,
            error: priceError instanceof Error ? priceError.message : 'Failed to load prices',
            field: 'price',
          })
          // Use original price snapshot if recalculation fails
          newPriceSnapshot = item.priceSnapshot
        }
        
        // Build revalidated item
        // Update sesTime if auto-selected, and update sessionId, TipoReservaId, and rcId if available from limits
        // Auto-correct tourDate if date_not_available and we have availableDates
        let finalTourDate = item.tourDate
        if (!availability.available && availability.reason === 'date_not_available' && availableDates.length > 0) {
          // Replace with first available date (sorted)
          finalTourDate = availableDates[0]
          if (process.env.NODE_ENV === 'development') {
            console.log('[REVALIDATE] Auto-correcting date:', {
              t_id: item.t_id,
              oldDate: item.tourDate,
              newDate: finalTourDate,
            })
          }
        }
        
        const finalSesTime = availability.selectedSesTime && availability.selectedSesTime !== '00:00' 
          ? availability.selectedSesTime 
          : (item.sesTime || '00:00')
        
        const revalidated: RevalidatedItem = {
          ...item,
          tourDate: finalTourDate, // Update tourDate if auto-corrected
          sesTime: finalSesTime, // Update sesTime with auto-selected value
          revalidated: true,
          priceChanged,
          priceDiff: priceChanged ? priceDiff : undefined,
          available: availability.available,
          availabilityError: availability.error,
          availabilityReason: availability.reason,
          availableTimes: availability.availableTimes,
          availableDates: (availability.reason === 'no_sessions' || availability.reason === 'date_not_available') ? availableDates : undefined,
          newPriceSnapshot: newPriceSnapshot || item.priceSnapshot,
          // Update sessionId, TipoReservaId, and rcId if available from limits
          ...(availability.sessionId !== undefined && { sessionId: availability.sessionId }),
          ...(availability.TipoReservaId !== undefined && { TipoReservaId: availability.TipoReservaId }),
          ...(availability.rcId !== undefined && { rcId: availability.rcId }),
        }
        
        // Update itemKey if sesTime or tourDate changed
        if (finalSesTime !== item.sesTime || finalTourDate !== item.tourDate) {
          revalidated.itemKey = generateCartItemKey({
            t_group: item.t_group,
            t_id: item.t_id,
            tourDate: finalTourDate,
            sesTime: finalSesTime,
            tourDate2: item.tourDate2,
            tourDateEnd: item.tourDateEnd,
          })
        }
        
        revalidatedItems.push(revalidated)
      } catch (itemError) {
        errors.push({
          itemKey: item.itemKey,
          error: itemError instanceof Error ? itemError.message : 'Revalidation failed',
        })
      }
    }
    
    const response: RevalidateResponse = {
      items: revalidatedItems,
      errors,
      hasPriceChanges,
      hasAvailabilityIssues,
    }
    
    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[REVALIDATE] Result:', {
        itemsCount: items.length,
        revalidatedCount: revalidatedItems.length,
        errorsCount: errors.length,
        hasPriceChanges,
        hasAvailabilityIssues,
      })
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('[REVALIDATE] Error:', error)
    
    return NextResponse.json(
      {
        error: 'Revalidation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}




