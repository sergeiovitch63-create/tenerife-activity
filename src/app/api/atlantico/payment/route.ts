/**
 * POST /api/atlantico/payment
 * 
 * Secure payment flow with revalidation, timeout, and multiple response formats
 * 
 * Features:
 * - Revalidation before payment (price + availability)
 * - Handles JSON/HTML/text responses
 * - 15s timeout
 * - SIMULATE mode for QA
 * - DEV logging (sanitized)
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { loadLimits, loadPrices } from '@/lib/atlantico/client-wrapper'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'
import { validatePaymentRequest, type PaymentRequest } from './schema'

const PAYMENT_TIMEOUT_MS = 15000 // 15 seconds
const SIMULATE_MODE = process.env.ATLANTICO_PAYMENT_SIMULATE === 'true'

/**
 * Sanitize sensitive data for logging
 */
function sanitizeForLog(data: any): any {
  if (!data || typeof data !== 'object') return data
  
  const sanitized = { ...data }
  if (sanitized.email) {
    const [local, domain] = sanitized.email.split('@')
    sanitized.email = `${local.substring(0, 2)}***@${domain}`
  }
  if (sanitized.phone) {
    sanitized.phone = sanitized.phone.substring(0, 4) + '***'
  }
  return sanitized
}

/**
 * Check session availability
 */
async function checkSessionAvailability(
  eventCode: string,
  language: string,
  tourDate: string | null,
  sesTime: string | null
): Promise<{ available: boolean; error?: string }> {
  // For calendarMode === 'none': tourDate and sesTime are null (on-request booking)
  if (tourDate === null || sesTime === null) {
    return { available: true } // On-request bookings are always available
  }
  try {
    const limits = await loadLimits(eventCode, language, tourDate)
    
    // CRITICAL: Reject '00:00' - must have valid session time
    if (sesTime === '00:00' || !sesTime || !/^\d{2}:\d{2}$/.test(sesTime)) {
      return { available: false, error: 'Invalid or missing session time (00:00 not allowed)' }
    }
    
    // Check for specific session time
    if (limits.sessionsByDate) {
      const dateKey = tourDate.replace(/-/g, '') // YYYYMMDD
      const sessions = limits.sessionsByDate[dateKey] || limits.sessionsByDate[tourDate]
      
      if (Array.isArray(sessions)) {
        const hasSession = sessions.some((s: any) => {
          const sessionTime = typeof s === 'string' ? s : s.time || s.sesTime
          return sessionTime === sesTime || sessionTime?.includes(sesTime)
        })
        return { 
          available: hasSession, 
          error: hasSession ? undefined : `Session ${sesTime} not available on ${tourDate}` 
        }
      }
    }
    
    // If we can't determine session availability, assume available (graceful degradation)
    return { available: true }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Failed to check availability',
    }
  }
}

/**
 * Revalidate item before payment
 */
async function revalidateBeforePayment(
  item: PaymentRequest
): Promise<{ valid: boolean; code?: 'PRICE_CHANGED' | 'SLOT_UNAVAILABLE'; newPrice?: number; error?: string }> {
  try {
    // CRITICAL: Reject '00:00' - must have valid session time
    if (!item.sesTime || item.sesTime === '00:00' || !/^\d{2}:\d{2}$/.test(item.sesTime)) {
      return {
        valid: false,
        code: 'SLOT_UNAVAILABLE',
        error: 'Invalid or missing session time (00:00 not allowed)',
      }
    }
    
    const sesTimeForCheck = item.sesTime
    
    // 1. Check availability
    const availability = await checkSessionAvailability(
      item.t_id,
      item.language,
      item.tourDate,
      sesTimeForCheck
    )
    
    if (!availability.available) {
      return {
        valid: false,
        code: 'SLOT_UNAVAILABLE',
        error: availability.error || 'Session not available',
      }
    }
    
    // 2. Recalculate prices (skip if tourDate is null for calendarMode === 'none')
    if (!item.tourDate) {
      // For calendarMode === 'none': skip price recalculation
      return { valid: true }
    }
    const prices = await loadPrices(item.t_id, item.tourDate)
    const adultPrice = prices.adult || 0
    const childPrice = prices.child || 0
    const infantPrice = prices.infant || 0
    
    const newTotal = 
      adultPrice * item.adults +
      childPrice * (item.childs || 0) +
      infantPrice * (item.infants || 0)
    
    // Compare with original price if available
    if (item.originalPriceSnapshot) {
      const originalTotal = item.originalPriceSnapshot.total
      const priceDiff = Math.abs(newTotal - originalTotal)
      
      // If price changed significantly (> 0.01), reject
      if (priceDiff > 0.01) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PAYMENT] Price changed:', {
            original: originalTotal,
            new: newTotal,
            diff: priceDiff,
            t_id: item.t_id,
            tourDate: item.tourDate,
          })
        }
        
        return {
          valid: false,
          code: 'PRICE_CHANGED',
          newPrice: newTotal,
          error: `Price changed from ${originalTotal.toFixed(2)} to ${newTotal.toFixed(2)} ${item.currency}`,
        }
      }
    }
    
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      code: 'SLOT_UNAVAILABLE',
      error: error instanceof Error ? error.message : 'Revalidation failed',
    }
  }
}

/**
 * Extract redirect URL from various response formats
 */
function extractRedirectUrl(responseText: string, contentType: string): string | null {
  // Try JSON first
  if (contentType.includes('application/json')) {
    try {
      const data = JSON.parse(responseText)
      if (data && typeof data === 'object') {
        return data.redirectUrl || data.url || data.location || data.redirect || null
      }
    } catch {
      // Not valid JSON
    }
  }
  
  // Try HTML form action
  const formActionMatch = responseText.match(/<form[^>]+action=["']([^"']+)["']/i)
  if (formActionMatch && formActionMatch[1]) {
    return formActionMatch[1]
  }
  
  // Try window.location
  const windowLocationMatch = responseText.match(/window\.location\s*=\s*["']([^"']+)["']/i)
  if (windowLocationMatch && windowLocationMatch[1]) {
    return windowLocationMatch[1]
  }
  
  // Try meta refresh
  const metaRefreshMatch = responseText.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"';]+)/i)
  if (metaRefreshMatch && metaRefreshMatch[1]) {
    return metaRefreshMatch[1]
  }
  
  // Try URL regex (http/https)
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi
  const urlMatches = responseText.match(urlRegex)
  if (urlMatches && urlMatches.length > 0) {
    // Prefer gateway URLs
    const gatewayUrls = urlMatches.filter(u => 
      /(gateway|payment|pay|checkout|secure)/i.test(u)
    )
    return gatewayUrls[0] || urlMatches[0]
  }
  
  return null
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const config = getAtlanticoConfig()

    if (!config.isValid) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: config.error || 'Atlantico API configuration is invalid',
        },
        { status: 500 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    
    // Validate request
    const validation = validatePaymentRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Invalid payment request',
          details: validation.errors,
        },
        { status: 400 }
      )
    }
    
    const validatedBody = body as PaymentRequest

    // Validate userId
    let serverUserId = process.env.ATLANTICO_USER_ID?.trim()
    if (!serverUserId || serverUserId === '0') {
      console.error('[PAYMENT] ❌ ATLANTICO_USER_ID is missing or invalid:', {
        value: serverUserId,
        envSet: !!process.env.ATLANTICO_USER_ID,
      })
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'Missing ATLANTICO_USER_ID environment variable. Please set ATLANTICO_USER_ID=3645 in your .env.local file.',
        },
        { status: 500 }
      )
    }
    
    // CRITICAL: Force userId to 3645 if it's not already
    // This ensures we always use the correct userId
    if (serverUserId !== '3645') {
      console.error('[PAYMENT] ❌ CRITICAL: ATLANTICO_USER_ID is not 3645!')
      console.error('[PAYMENT] Current value:', serverUserId)
      console.error('[PAYMENT] Please update .env.local with: ATLANTICO_USER_ID=3645')
      console.error('[PAYMENT] Forcing userId to 3645 for this request...')
      serverUserId = '3645'
    }
    
    // Log userId for debugging
    console.log('[PAYMENT] ✅ Using userId:', serverUserId, '(Expected: 3645)')

    // DEV logging (sanitized)
    if (process.env.NODE_ENV === 'development') {
      console.log('[PAYMENT] Request received:', {
        t_id: validatedBody.t_id,
        t_group: validatedBody.t_group,
        tourDate: validatedBody.tourDate,
        sesTime: validatedBody.sesTime,
        adults: validatedBody.adults,
        customer: sanitizeForLog({
          name: validatedBody.name,
          email: validatedBody.email,
          phone: validatedBody.phone,
        }),
      })
    }

    // SIMULATE mode: return success without calling Atlántico
    if (SIMULATE_MODE) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PAYMENT] SIMULATE mode: skipping Atlántico API call')
      }
      
      // Get locale from request body or headers, or default to 'en'
      const locale = validatedBody.language || request.headers.get('x-locale') || 'en'
      // Normalize locale (remove uppercase if present)
      const normalizedLocale = locale.toLowerCase().split('-')[0]
      
      return NextResponse.json({
        success: true,
        redirectUrl: `/${normalizedLocale}/checkout/success?sim=1`,
        simulated: true,
      })
    }

    // Revalidation before payment (OBLIGATORY)
    const revalidation = await revalidateBeforePayment(validatedBody)
    
    if (!revalidation.valid) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PAYMENT] Revalidation failed:', {
          code: revalidation.code,
          error: revalidation.error,
          t_id: validatedBody.t_id,
          tourDate: validatedBody.tourDate,
          sesTime: validatedBody.sesTime,
        })
      }
      
      return NextResponse.json(
        {
          error: 'Revalidation failed',
          code: revalidation.code,
          message: revalidation.error || 'Item is no longer available',
          ...(revalidation.newPrice && { newPrice: revalidation.newPrice }),
        },
        { status: 409 }
      )
    }

    // Convert language to Atlantico payment gateway format (CAS/ENG/FRA/RUS/ALE/ITA per PDF page 9-10)
    // The language in validatedBody should already be mapped by checkout page
    const normalizedLang = validatedBody.language

    // CRITICAL: Reject '00:00' - must have valid session time
    if (!validatedBody.sesTime || validatedBody.sesTime === '00:00' || !/^\d{2}:\d{2}$/.test(validatedBody.sesTime)) {
      return NextResponse.json(
        {
          error: 'Invalid session time',
          message: 'Invalid or missing session time (00:00 not allowed)',
        },
        { status: 400 }
      )
    }

    const sesTime = validatedBody.sesTime

    // DEV log - payment request details (sanitized)
    if (process.env.NODE_ENV === 'development') {
      console.log('[PAYMENT] Request payload:', {
        t_group: validatedBody.t_group,
        t_id: validatedBody.t_id,
        language: normalizedLang,
        tourDate: validatedBody.tourDate,
        sesTime: sesTime,
        adults: validatedBody.adults,
        childs: validatedBody.childs || 0,
        infants: validatedBody.infants || 0,
      })
    }

    // Build form data for POST (UTF-8 encoding)
    // Required params per Atlantico API PDF: userId, t_id, t_group, language, tourDate, sesTime, adults, childs, infants, name, email, phone
    const formData = new URLSearchParams()
    // CRITICAL: Ensure userId is sent as string and is 3645
    if (process.env.NODE_ENV === 'development') {
      console.log('[PAYMENT] Sending userId to Atlantico API:', serverUserId)
      if (serverUserId !== '3645') {
        console.error('[PAYMENT] ❌ ERROR: userId is not 3645! Current:', serverUserId)
      }
    }
    formData.append('userId', String(serverUserId))
    formData.append('t_id', String(validatedBody.t_id))
    formData.append('t_group', String(validatedBody.t_group))
    formData.append('language', normalizedLang)
    // For calendarMode === 'none': tourDate and sesTime are null (on-request booking)
    // CRITICAL: Convert tourDate to YYYYMMDD format (required by Atlantico API)
    if (validatedBody.tourDate) {
      let tourDateFormatted = validatedBody.tourDate
      // Convert YYYY-MM-DD to YYYYMMDD if needed
      if (/^\d{4}-\d{2}-\d{2}$/.test(tourDateFormatted)) {
        tourDateFormatted = tourDateFormatted.replace(/-/g, '')
      }
      formData.append('tourDate', tourDateFormatted)
    }
    if (sesTime) formData.append('sesTime', sesTime)
    formData.append('adults', String(validatedBody.adults))
    formData.append('childs', String(validatedBody.childs || 0))
    formData.append('infants', String(validatedBody.infants || 0))
    formData.append('name', validatedBody.name)
    formData.append('email', validatedBody.email)
    formData.append('phone', validatedBody.phone)
    
    // Add optional fields
    if (validatedBody.hotel) formData.append('hotel', validatedBody.hotel)
    if (validatedBody.room) formData.append('room', validatedBody.room)
    if (validatedBody.mpoint) formData.append('mpoint', validatedBody.mpoint)
    if (validatedBody.mtime) formData.append('mtime', validatedBody.mtime)
    if (validatedBody.notes) formData.append('notes', validatedBody.notes)

    // Call Atlántico /payment/ endpoint with timeout
    const baseUrl = config.baseUrl
    const url = `${baseUrl}/payment/`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PAYMENT_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          ...(config.token && { Authorization: `Bearer ${config.token}` }),
        },
        body: formData.toString(),
        redirect: 'manual', // Don't follow redirects automatically
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const status = response.status
      const contentType = response.headers.get('content-type') || ''
      const locationHeader = response.headers.get('Location')
      
      // Get response body as text
      const responseText = await response.text()
      
      // DEV logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[PAYMENT] Response received:', {
          status,
          contentType,
          locationHeader: locationHeader || 'none',
          bodyLength: responseText.length,
          bodyPreview: responseText.substring(0, 200),
          hasRedirectUrl: !!locationHeader || !!extractRedirectUrl(responseText, contentType),
          isHTML: contentType.includes('text/html'),
        })
      }

      // Check for application error "-1"
      if (response.ok && (responseText.trim() === '-1' || responseText.trim() === '-1\n')) {
        return NextResponse.json(
          {
            error: 'Payment application error',
            message: 'Payment gateway returned "-1" (invalid parameters or configuration)',
          },
          { status: 400 }
        )
      }

      // Priority 1: Check for redirect headers
      if ([301, 302, 303, 307, 308].includes(status) && locationHeader) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PAYMENT] ✅ Redirect header found:', {
            status,
            redirectUrl: locationHeader,
            path: 'Location header',
          })
        }
        return NextResponse.json({
          success: true,
          redirectUrl: locationHeader,
        })
      }

      // Priority 2: Extract URL from response body
      const redirectUrl = extractRedirectUrl(responseText, contentType)
      
      if (redirectUrl) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PAYMENT] ✅ URL extracted from body:', {
            redirectUrl,
            contentType,
            path: contentType.includes('json') ? 'JSON' : contentType.includes('html') ? 'HTML' : 'text',
          })
        }
        return NextResponse.json({
          success: true,
          redirectUrl,
        })
      }

      // Priority 3: If HTML, return it for processing page
      if (response.ok && contentType.includes('text/html')) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PAYMENT] ✅ HTML response detected:', {
            bodyLength: responseText.length,
            path: 'processing page',
          })
        }
        return NextResponse.json({
          success: true,
          html: responseText,
        })
      }

      // No redirect URL found
      return NextResponse.json(
        {
          error: 'Payment gateway redirect URL not found',
          message: `HTTP ${status}: No redirect URL could be extracted from the response`,
        },
        { status: status === 200 ? 502 : status }
      )
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'Payment timeout',
            message: `Request timed out after ${PAYMENT_TIMEOUT_MS}ms`,
          },
          { status: 504 }
        )
      }
      
      throw fetchError
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    
    if (process.env.NODE_ENV === 'development') {
      console.error('[PAYMENT] Error:', {
        duration: `${duration}ms`,
        error: errorMsg,
      })
    }

    return NextResponse.json(
      {
        error: 'Payment initiation failed',
        message: errorMsg,
      },
      { status: 500 }
    )
  }
}
