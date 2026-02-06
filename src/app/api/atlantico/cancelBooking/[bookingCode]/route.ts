/**
 * POST /api/atlantico/cancelBooking/[bookingCode]
 * 
 * Cancels a booking with Atlantico API
 * Proxies POST request to Atlantico /cancelBooking/{BookingCode}/{Note} endpoint
 * 
 * Route parameters:
 * - bookingCode: Booking reference code (required)
 * 
 * Body parameters (JSON or form-urlencoded):
 * - note: Cancellation note (optional)
 * 
 * Returns:
 * - success: true if cancellation succeeded
 * - message: Success or error message
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { atlanticoPost } from '@/lib/atlantico/post'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingCode: string }> }
) {
  try {
    const { bookingCode } = await params
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

    if (!bookingCode || bookingCode.trim() === '') {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'bookingCode is required',
        },
        { status: 400 }
      )
    }

    // Parse request body for optional note
    let note = ''
    const requestContentType = request.headers.get('content-type') || ''
    
    if (requestContentType.includes('application/json')) {
      const body = await request.json()
      note = body.note || ''
    } else if (requestContentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      note = (formData.get('note') as string) || ''
    }

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[CANCEL_BOOKING] Request:', {
        bookingCode,
        hasNote: !!note,
        noteLength: note.length,
      })
    }

    // Call Atlantico cancelBooking endpoint
    // Format: /cancelBooking/{BookingCode}/{Note}
    // Note is optional, so we append it if provided
    const endpoint = note.trim() 
      ? `/cancelBooking/${encodeURIComponent(bookingCode)}/${encodeURIComponent(note)}`
      : `/cancelBooking/${encodeURIComponent(bookingCode)}/`

    // POST with empty body (or note in body if API requires it)
    const response = await atlanticoPost(endpoint, {})

    // Parse response
    const responseText = await response.text()
    
    // Try to parse as JSON first
    let responseData: any
    try {
      responseData = JSON.parse(responseText)
    } catch {
      // If not JSON, treat as plain text
      responseData = { message: responseText.trim() }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Cancellation failed',
          message: responseData.message || responseData.error || responseText || `HTTP ${response.status}`,
          status: response.status,
        },
        { status: response.status }
      )
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[CANCEL_BOOKING] Success:', {
        bookingCode,
        status: response.status,
        response: responseData,
      })
    }

    return NextResponse.json({
      success: true,
      message: responseData.message || 'Booking cancelled successfully',
      data: responseData,
    })
  } catch (error) {
    console.error('[CANCEL_BOOKING] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Atlantico API configuration')) {
        return NextResponse.json(
          {
            error: 'Configuration error',
            message: error.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          error: 'Failed to cancel booking',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}














