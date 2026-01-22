/**
 * POST /api/atlantico/cancel
 * 
 * Cancels a booking using cancelBooking endpoint
 * 
 * Body parameters (form-urlencoded or JSON):
 * - bookingCode: Booking code (required)
 * - note: Cancellation note (optional)
 * 
 * Returns:
 * - success: boolean
 * - message?: string
 * - error?: string
 * 
 * Cache: NO CACHE (booking operations)
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { atlanticoPost } from '@/lib/atlantico/post'

interface CancelRequest {
  bookingCode: string
  note?: string
}

export async function POST(request: NextRequest) {
  try {
    const config = getAtlanticoConfig()

    if (!config.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: config.error || 'Atlantico API configuration is invalid',
        },
        { status: 500 }
      )
    }

    // Parse request body (support both JSON and form-urlencoded)
    let body: CancelRequest
    const requestContentType = request.headers.get('content-type') || ''
    
    if (requestContentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data
      const formData = await request.formData()
      body = {
        bookingCode: formData.get('bookingCode') as string || '',
        note: formData.get('note') as string || undefined,
      }
    } else {
      // Parse JSON
      body = await request.json()
    }

    // Validate required fields
    if (!body.bookingCode || typeof body.bookingCode !== 'string' || body.bookingCode.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'bookingCode is required',
        },
        { status: 400 }
      )
    }

    // Build endpoint: cancelBooking/{Booking Code}/{Note}
    // Note is optional - if not provided, use empty string or omit
    const note = body.note && body.note.trim() !== '' ? body.note.trim() : ''
    const endpoint = note
      ? `/cancelBooking/${body.bookingCode}/${encodeURIComponent(note)}`
      : `/cancelBooking/${body.bookingCode}`

    // Call Atlantico cancelBooking endpoint
    // Note: atlanticoPost expects form-urlencoded, but cancelBooking is GET-like in URL
    // We'll use GET-style endpoint construction
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return NextResponse.json(
        {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: errorText || 'Failed to cancel booking',
        },
        { status: response.status }
      )
    }

    const responseData = await response.json().catch(() => ({ success: true }))

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[CANCEL] Success:', {
        bookingCode: body.bookingCode,
        note: note || '(none)',
        status: response.status,
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: responseData.message || 'Booking cancelled successfully',
        data: responseData,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate', // NO CACHE for booking operations
        },
      }
    )
  } catch (error) {
    console.error('[CANCEL] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}





