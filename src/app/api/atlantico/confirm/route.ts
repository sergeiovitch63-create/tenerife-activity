/**
 * POST /api/atlantico/confirm
 * 
 * Confirms a booking with Atlantico API
 * Proxies POST request to Atlantico /confirm/ endpoint
 * 
 * Body parameters (form-urlencoded):
 * - t_id: Event ID / Code (required)
 * - t_group: Tour Group ID (required)
 * - language: Language code (required, e.g., 'ENG', 'FRA')
 * - tourDate: Date in format YYYY-MM-DD (required)
 * - sesTime: Session time in format HH:mm (required, or "00:00" if no session)
 * - adults: Number of adults (required, >= 1)
 * - childs: Number of children (optional, default: 0)
 * - infants: Number of infants (optional, default: 0)
 * - name: Customer name (required)
 * - email: Customer email (required)
 * - phone: Customer phone (required)
 * - [optional fields]: pickup fields, etc.
 * 
 * Returns:
 * - bookingReference: Booking reference code from Atlantico
 * - OR error message if confirmation failed
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { atlanticoPost } from '@/lib/atlantico/post'

interface ConfirmRequest {
  t_id: string
  t_group: string
  language: string
  tourDate: string // YYYY-MM-DD
  sesTime: string // HH:mm or "00:00"
  adults: number
  childs?: number
  infants?: number
  name: string
  email: string
  phone: string
  [key: string]: any // Allow additional optional fields
}

export async function POST(request: NextRequest) {
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

    // Parse request body (support both JSON and form-urlencoded)
    let body: ConfirmRequest
    const requestContentType = request.headers.get('content-type') || ''
    
    if (requestContentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data
      const formData = await request.formData()
      body = {
        t_id: formData.get('t_id') as string || '',
        t_group: formData.get('t_group') as string || '',
        language: formData.get('language') as string || '',
        tourDate: formData.get('tourDate') as string || '',
        sesTime: formData.get('sesTime') as string || '00:00',
        adults: parseInt(formData.get('adults') as string || '0', 10),
        childs: parseInt(formData.get('childs') as string || '0', 10),
        infants: parseInt(formData.get('infants') as string || '0', 10),
        name: formData.get('name') as string || '',
        email: formData.get('email') as string || '',
        phone: formData.get('phone') as string || '',
      }
      
      // Add optional fields if present
      const optionalFields = ['pickup', 'pickupPoint', 'pickupTime', 'notes']
      for (const field of optionalFields) {
        const value = formData.get(field)
        if (value) {
          body[field] = value as string
        }
      }
    } else {
      // Parse JSON
      body = await request.json()
    }

    // Validate required fields
    const requiredFields = ['t_id', 't_group', 'language', 'tourDate', 'sesTime', 'adults', 'name', 'email', 'phone']
    const missingFields = requiredFields.filter(field => !body[field] || (typeof body[field] === 'string' && body[field].trim() === ''))
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (body.adults < 1) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'At least 1 adult is required',
        },
        { status: 400 }
      )
    }

    // Prepare data for Atlantico API
    const atlanticoData: Record<string, string | number> = {
      t_id: body.t_id,
      t_group: body.t_group,
      language: body.language.toUpperCase(),
      tourDate: body.tourDate,
      sesTime: body.sesTime,
      adults: body.adults,
      childs: body.childs || 0,
      infants: body.infants || 0,
      name: body.name,
      email: body.email,
      phone: body.phone,
    }

    // Add optional fields if present
    if (body.pickup) atlanticoData.pickup = body.pickup
    if (body.pickupPoint) atlanticoData.pickupPoint = body.pickupPoint
    if (body.pickupTime) atlanticoData.pickupTime = body.pickupTime
    if (body.notes) atlanticoData.notes = body.notes

    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[CONFIRM] Request:', {
        t_id: atlanticoData.t_id,
        t_group: atlanticoData.t_group,
        language: atlanticoData.language,
        tourDate: atlanticoData.tourDate,
        sesTime: atlanticoData.sesTime,
        adults: atlanticoData.adults,
        childs: atlanticoData.childs,
        infants: atlanticoData.infants,
        name: atlanticoData.name,
        email: `${(atlanticoData.email as string).substring(0, 3)}***`,
        phone: `${(atlanticoData.phone as string).substring(0, 3)}***`,
      })
    }

    // Call Atlantico confirm endpoint
    const response = await atlanticoPost('/confirm/', atlanticoData)

    // Parse response
    const responseText = await response.text()
    
    // Try to parse as JSON first
    let responseData: any
    try {
      responseData = JSON.parse(responseText)
    } catch {
      // If not JSON, treat as plain text (booking reference might be plain text)
      responseData = { bookingReference: responseText.trim() }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Confirmation failed',
          message: responseData.message || responseData.error || responseText || `HTTP ${response.status}`,
          status: response.status,
        },
        { status: response.status }
      )
    }

    // Extract booking reference from response
    // Response format may vary - try common fields
    const bookingReference = 
      responseData.bookingReference ||
      responseData.bookingCode ||
      responseData.reference ||
      responseData.code ||
      responseData.id ||
      responseText.trim()

    if (process.env.NODE_ENV === 'development') {
      console.log('[CONFIRM] Success:', {
        bookingReference,
        status: response.status,
      })
    }

    return NextResponse.json({
      success: true,
      bookingReference,
      data: responseData,
    })
  } catch (error) {
    console.error('[CONFIRM] Error:', error)

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
          error: 'Failed to confirm booking',
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











