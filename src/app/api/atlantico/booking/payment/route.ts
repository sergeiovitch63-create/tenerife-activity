/**
 * POST /api/atlantico/booking/payment
 * 
 * Processes payment for a booking with Atlantico API
 * Body: { userId, t_id, t_group, language, tourDate, sesTime, adults, childs, infants, name, email, phone, hotel?, room?, mpoint?, mtime?, notes? }
 * Returns redirect URL if payment gateway is provided
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchText } from '@/lib/atlantico/client'

interface PaymentRequest {
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

interface PaymentResponse {
  ok: boolean
  redirectUrl?: string
  reason?: string
  raw?: any
}

/**
 * Build form-urlencoded body for Atlantico payment endpoint
 */
function buildFormData(data: PaymentRequest): string {
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
 * Extract redirect URL from response
 * Atlantico may return:
 * - JSON with redirectUrl/url field
 * - HTML with redirect/meta refresh
 * - Plain URL string
 */
function extractRedirectUrl(responseText: string): string | null {
  const trimmed = responseText.trim()
  
  // Try JSON first
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed)
      return json.redirectUrl || json.url || json.redirect || json.gatewayUrl || null
    } catch {
      // Not JSON
    }
  }
  
  // Try to find URL in HTML meta refresh
  const metaRefreshMatch = trimmed.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'>]+)/i)
  if (metaRefreshMatch) {
    return metaRefreshMatch[1]
  }
  
  // Try to find URL in JavaScript redirect
  const jsRedirectMatch = trimmed.match(/(?:window\.location|location\.href)\s*=\s*["']([^"']+)["']/i)
  if (jsRedirectMatch) {
    return jsRedirectMatch[1]
  }
  
  // Try to find URL pattern (http:// or https://)
  const urlMatch = trimmed.match(/(https?:\/\/[^\s<>"']+)/i)
  if (urlMatch) {
    return urlMatch[1]
  }
  
  // If it's a single URL-like string, return it
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
    return trimmed
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PaymentRequest

    // Validate required fields
    if (!body.userId || !body.t_id || !body.t_group || !body.language || !body.tourDate || !body.sesTime || !body.adults || !body.name || !body.email || !body.phone) {
      return NextResponse.json<PaymentResponse>(
        {
          ok: false,
          reason: 'Missing required fields',
        },
        { status: 400 }
      )
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.tourDate)) {
      return NextResponse.json<PaymentResponse>(
        {
          ok: false,
          reason: 'Invalid tourDate format (expected YYYY-MM-DD)',
        },
        { status: 400 }
      )
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(body.sesTime)) {
      return NextResponse.json<PaymentResponse>(
        {
          ok: false,
          reason: 'Invalid sesTime format (expected HH:mm)',
        },
        { status: 400 }
      )
    }

    // Build form data
    const formData = buildFormData(body)

    // Call Atlantico payment endpoint
    const responseText = await fetchText('/payment/', {
      method: 'POST',
      body: formData,
    })

    // Extract redirect URL
    const redirectUrl = extractRedirectUrl(responseText)

    if (redirectUrl) {
      return NextResponse.json<PaymentResponse>({
        ok: true,
        redirectUrl,
      })
    } else {
      // No redirect URL found
      const lowerText = responseText.toLowerCase()
      if (lowerText.includes('error') || lowerText.includes('fail') || lowerText.includes('invalid')) {
        return NextResponse.json<PaymentResponse>({
          ok: false,
          reason: responseText.substring(0, 200),
          raw: responseText,
        })
      }

      // Response doesn't look like an error but no redirect URL
      return NextResponse.json<PaymentResponse>({
        ok: false,
        reason: 'No redirect URL found in response',
        raw: responseText,
      })
    }
  } catch (error) {
    // Server-only logging
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATLANTICO_PAYMENT] Error:', error)
    }

    return NextResponse.json<PaymentResponse>(
      {
        ok: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

