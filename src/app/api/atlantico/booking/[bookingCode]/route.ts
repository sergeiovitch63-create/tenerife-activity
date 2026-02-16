/**
 * GET /api/atlantico/booking/[bookingCode]
 * 
 * Retrieves booking details from Atlantico API
 * 
 * Route parameters:
 * - bookingCode: Booking reference code (required)
 * 
 * Returns:
 * - success: boolean
 * - booking?: Booking details object
 * - error?: string
 * 
 * Cache: NO CACHE (booking operations are real-time)
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getBaseUrl } from '@/lib/atlantico/client'

interface BookingDetails {
  bookingCode: string
  status?: string
  tourDate?: string
  sesTime?: string
  adults?: number
  childs?: number
  infants?: number
  name?: string
  email?: string
  phone?: string
  t_id?: string
  t_group?: string
  reference?: string
  [key: string]: any // Allow additional fields from Atlantico
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingCode: string }> }
) {
  try {
    const { bookingCode } = await params

    if (!bookingCode || bookingCode.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'bookingCode is required',
        },
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl()
    const baseUrlClean = baseUrl.replace(/\/+$/, '')

    // Try multiple possible endpoints for booking details
    // Atlantico API might use different endpoints:
    // - /booking/{bookingCode}
    // - /bookingDetails/{bookingCode}
    // - /getBooking/{bookingCode}
    // - /bookingInfo/{bookingCode}
    const possibleEndpoints = [
      `/booking/${encodeURIComponent(bookingCode)}`,
      `/bookingDetails/${encodeURIComponent(bookingCode)}`,
      `/getBooking/${encodeURIComponent(bookingCode)}`,
      `/bookingInfo/${encodeURIComponent(bookingCode)}`,
    ]

    const headers: HeadersInit = {
      Accept: 'application/json',
    }
    const token = process.env.ATLANTICO_TOKEN
    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`
    }

    let lastError: Error | null = null
    let lastResponse: Response | null = null

    for (const endpoint of possibleEndpoints) {
      const fullUrl = `${baseUrlClean}${endpoint}`

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ATL_BOOKING_DETAILS] Trying endpoint:', {
            endpoint,
            fullUrl,
            bookingCode,
          })
        }

        const response = await fetch(fullUrl, {
          method: 'GET',
          headers,
          cache: 'no-store',
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''
          
          if (contentType.includes('application/json')) {
            const data = await response.json()
            
            if (process.env.NODE_ENV === 'development') {
              console.log('[ATL_BOOKING_DETAILS] Success:', {
                endpoint,
                bookingCode,
                hasData: !!data,
              })
            }

            // Normalize response to our BookingDetails format
            const booking: BookingDetails = {
              bookingCode,
              ...data,
              // Map common field names
              reference: data.reference || data.bookingReference || data.code || bookingCode,
              status: data.status || data.bookingStatus || data.state,
              tourDate: data.tourDate || data.date || data.bookingDate,
              sesTime: data.sesTime || data.time || data.sessionTime,
              adults: data.adults || data.adult || 0,
              childs: data.childs || data.child || 0,
              infants: data.infants || data.infant || 0,
              name: data.name || data.customerName || data.clientName,
              email: data.email || data.customerEmail || data.clientEmail,
              phone: data.phone || data.customerPhone || data.clientPhone,
              t_id: data.t_id || data.eventId || data.eventCode,
              t_group: data.t_group || data.groupId || data.groupCode,
            }

            return NextResponse.json(
              {
                success: true,
                booking,
              },
              {
                headers: {
                  'Cache-Control': 'no-store, no-cache, must-revalidate',
                },
              }
            )
          } else {
            // If not JSON, try to parse as text
            const text = await response.text()
            
            // If it's a simple reference or error message
            if (text.trim() === bookingCode || /^[A-Z0-9-]{3,50}$/i.test(text.trim())) {
              return NextResponse.json(
                {
                  success: true,
                  booking: {
                    bookingCode: text.trim(),
                    reference: text.trim(),
                  } as BookingDetails,
                },
                {
                  headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                  },
                }
              )
            }

            // If response is not JSON and not a simple code, try next endpoint
            continue
          }
        } else if (response.status === 404) {
          // 404 means endpoint doesn't exist, try next one
          continue
        } else {
          // Other error status, save for potential error response
          lastResponse = response
          continue
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        // Try next endpoint
        continue
      }
    }

    // If we get here, all endpoints failed
    if (lastResponse && lastResponse.status !== 404) {
      const errorText = await lastResponse.text().catch(() => '')
      return NextResponse.json(
        {
          success: false,
          error: `HTTP ${lastResponse.status}: ${lastResponse.statusText}`,
          message: errorText || 'Failed to retrieve booking details',
        },
        { status: lastResponse.status }
      )
    }

    // All endpoints returned 404 or failed
    return NextResponse.json(
      {
        success: false,
        error: 'Booking not found or endpoint not available',
        message: `Could not find booking details for code: ${bookingCode}. The booking details endpoint may not be available in the Atlantico API.`,
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('[ATL_BOOKING_DETAILS] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}





