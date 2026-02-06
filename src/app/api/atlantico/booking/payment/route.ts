/**
 * POST /api/atlantico/booking/payment
 *
 * Server-side proxy to Atlántico /payment/ endpoint.
 *
 * - Accepts the same payload as /booking/confirm (JSON or form)
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
import { getBaseUrl } from '@/lib/atlantico/client'

interface PaymentBookingRequest {
  t_id: string
  t_group: string
  language: string
  tourDate: string | null
  sesTime: string | null
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
}

function getUserId(): string | null {
  const raw = process.env.ATLANTICO_USER_ID?.trim()
  if (!raw || raw === '0') return null
  if (!/^\d+$/.test(raw)) return null
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
    return (await request.json()) as PaymentBookingRequest
  }

  const form = await request.formData()

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

export async function POST(request: NextRequest) {
  const body = await parseRequestBody(request)

  const isOnRequest = body.tourDate === null || body.sesTime === null

  const missing: string[] = []

  if (!body.t_id) missing.push('t_id')
  if (!body.t_group) missing.push('t_group')
  if (!body.language) missing.push('language')
  if (!body.adults) missing.push('adults')
  if (!body.name) missing.push('name')
  if (!body.email) missing.push('email')
  if (!body.phone) missing.push('phone')

  if (!isOnRequest) {
    if (!body.tourDate) missing.push('tourDate')
    if (!body.sesTime) missing.push('sesTime')
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

  if (!isOnRequest) {
    if (body.tourDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.tourDate)) {
      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'BAD_REQUEST',
          reason: 'Invalid tourDate format (expected YYYY-MM-DD)',
        },
        { status: 400 }
      )
    }

    if (body.sesTime && !/^\d{2}:\d{2}$/.test(body.sesTime)) {
      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'BAD_REQUEST',
          reason: 'Invalid sesTime format (expected HH:mm)',
        },
        { status: 400 }
      )
    }
  }

  const userId = getUserId()
  if (!userId) {
    const candidates = ['ATLANTICO_USER_ID', 'ATLANTICO_COLLABORATOR', 'ATLANTICO_OFFICE'].filter(
      (v) => process.env[v] !== undefined
    )

    if (process.env.NODE_ENV === 'development') {
      console.error('[ATL_PAYMENT_PROXY] Missing ATLANTICO_USER_ID – candidates present:', candidates)
    }

    return NextResponse.json<ErrorResponse>(
      {
        ok: false,
        code: 'MISSING_ATLANTICO_USER_ID',
        reason: 'ATLANTICO_USER_ID is not configured on the server',
      },
      { status: 500 }
    )
  }

  const baseUrl = getAtlanticoBaseUrl()
  const baseUrlClean = baseUrl.replace(/\/+$/, '')

  // Build form-encoded body with ALL mandatory fields (same as confirm)
  // Do NOT send sesTime when it's "00:00" or missing - omit it entirely
  const formData = new URLSearchParams()
  formData.append('userId', userId)
  formData.append('t_id', String(body.t_id))
  formData.append('t_group', String(body.t_group))
  formData.append('language', String(body.language))
  if (body.tourDate) formData.append('tourDate', body.tourDate)
  // Only append sesTime if it's provided and NOT "00:00"
  const sesTimeValue = body.sesTime && body.sesTime.trim() ? body.sesTime.trim() : null
  if (sesTimeValue && sesTimeValue !== '00:00') {
    formData.append('sesTime', sesTimeValue)
  }
  formData.append('adults', String(body.adults))
  formData.append('childs', String(body.childs ?? 0))
  formData.append('infants', String(body.infants ?? 0))
  formData.append('name', body.name)
  formData.append('email', body.email)
  formData.append('phone', body.phone)
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

  if (process.env.NODE_ENV === 'development') {
    console.log('[ATL_PAYMENT_PROXY]', {
      baseUrl,
      t_id: body.t_id,
      t_group: body.t_group,
      tourDate: body.tourDate,
      sesTime: sesTimeValue || '(omitted)',
      hasHotel: !!body.hotel,
      hasRoom: !!body.room,
      hasMpoint: !!body.mpoint,
      hasMtime: !!body.mtime,
      hasNotes: !!body.notes,
      payloadRedacted: redactedPayload,
    })
  }

  // Robust "tryConfirmThenPayment" strategy:
  // 1) First try POST ${baseUrl}/confirm/ (with trailing slash)
  // 2) If status 404 OR body contains "Object not found" then fallback to POST ${baseUrl}/payment/
  const endpoints = [
    { path: '/confirm/', name: 'confirm' },
    { path: '/payment/', name: 'payment' },
  ]

  let upstreamStatus = 0
  let upstreamContentType: string | null = null
  let upstreamText = ''
  let upstreamHeaders: Headers | null = null
  let usedEndpoint = ''

  // Build headers - do NOT send Authorization if token is undefined
  const headers: HeadersInit = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: '*/*',
  }
  const token = process.env.ATLANTICO_TOKEN
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`
  }

  for (const endpoint of endpoints) {
    const actionUrl = `${baseUrlClean}${endpoint.path}`
    usedEndpoint = endpoint.name

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ATL_PAYMENT_UPSTREAM_REQUEST]', {
          baseUrl,
          path: endpoint.path,
          fullUrl: actionUrl,
          method: 'POST',
          contentType: 'application/x-www-form-urlencoded',
          hasToken: !!token,
          payloadRedacted: redactedPayload,
        })
      }

      const upstream = await fetch(actionUrl, {
        method: 'POST',
        headers,
        body: formData.toString(),
        cache: 'no-store',
        redirect: 'manual',
      })

      upstreamStatus = upstream.status
      upstreamContentType = upstream.headers.get('content-type')
      upstreamHeaders = upstream.headers
      upstreamText = await upstream.text()

      if (process.env.NODE_ENV === 'development') {
        console.log('[ATL_PAYMENT_UPSTREAM_RESPONSE]', {
          baseUrl,
          path: endpoint.path,
          fullUrl: actionUrl,
          status: upstreamStatus,
          contentType: upstreamContentType,
          hasLocation: !!upstream.headers.get('Location'),
          bodyLength: upstreamText.length,
          bodyPreview: upstreamText.substring(0, 200),
          payloadSent: redactedPayload,
        })
      }

      // If confirm/ returns 404 or "Object not found", try payment/ next
      if (endpoint.name === 'confirm') {
        const trimmed = upstreamText.trim().toLowerCase()
        const isNotFound = upstreamStatus === 404 || trimmed.includes('object not found')
        if (isNotFound) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ATL_PAYMENT_FALLBACK]', {
              baseUrl,
              path: endpoint.path,
              reason: isNotFound ? '404 or Object not found' : 'unknown',
              tryingNext: '/payment/',
            })
          }
          continue // Try payment/ next
        }
      }

      // Handle 301/302 redirects: return NextResponse.redirect
      if (upstreamStatus >= 300 && upstreamStatus < 400) {
        const location = upstream.headers.get('Location')
        if (location) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ATL_PAYMENT_REDIRECT]', {
              baseUrl,
              path: endpoint.path,
              status: upstreamStatus,
              location,
            })
          }
          return NextResponse.redirect(location)
        }
      }

      const trimmed = upstreamText.trim()
      const htmlLike = looksLikeHtml(trimmed, upstreamContentType)
      const hasForm = trimmed.includes('<form') || trimmed.includes('getnet')

      // If body contains "<html" or "<form" or "getnet" => return as text/html (pass-through)
      if (htmlLike || hasForm) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ATL_PAYMENT_HTML_RESPONSE]', {
            baseUrl,
            path: endpoint.path,
            status: upstreamStatus,
            contentType: upstreamContentType,
            htmlDetected: true,
          })
        }
        const res = new NextResponse(upstreamText, {
          status: upstreamStatus || 200,
          headers: {
            'Content-Type': upstreamContentType || 'text/html; charset=utf-8',
          },
        })
        // Copy other headers (except content-type which we set above)
        upstreamHeaders.forEach((value, key) => {
          if (key.toLowerCase() !== 'content-type') {
            res.headers.set(key, value)
          }
        })
        return res
      }

      // Check if body is a plain reference number (digits/alphanumeric)
      if (/^[A-Z0-9-]{3,50}$/i.test(trimmed)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ATL_PAYMENT_REFERENCE]', {
            baseUrl,
            path: endpoint.path,
            reference: trimmed,
          })
        }
        return NextResponse.json({ ok: true, reference: trimmed })
      }

      // Check for "-1" or short non-HTML error responses
      if (trimmed === '-1' || (!htmlLike && !hasForm && trimmed.length <= 20)) {
        // If this is confirm/ and we got "-1", try payment/ next
        if (endpoint.name === 'confirm') {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ATL_PAYMENT_FALLBACK]', {
              baseUrl,
              path: endpoint.path,
              reason: 'got -1 or error, trying payment/',
            })
          }
          continue // Try payment/ next
        }

        // If payment/ returns "-1", treat as failure
        if (process.env.NODE_ENV === 'development') {
          console.error('[ATL_PAYMENT_FAILED]', {
            baseUrl,
            path: endpoint.path,
            status: upstreamStatus,
            contentType: upstreamContentType,
            body: trimmed,
            headers: Object.fromEntries(upstreamHeaders.entries()),
          })
        }

        return NextResponse.json<ErrorResponse>(
          {
            ok: false,
            code: 'ATLANTICO_PAYMENT_FAILED',
            reason: 'ATLANTICO_PAYMENT_FAILED',
            upstreamPreview: trimmed.substring(0, 200),
            upstreamStatus,
          },
          { status: 502 }
        )
      }

      // Fallback: return as-is
      const res = new NextResponse(upstreamText, { status: upstreamStatus || 200 })
      upstreamHeaders.forEach((value, key) => {
        res.headers.set(key, value)
      })
      return res
    } catch (error) {
      // If confirm/ fails with network error, try payment/ next
      if (endpoint.name === 'confirm') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ATL_PAYMENT_FALLBACK]', {
            baseUrl,
            path: endpoint.path,
            error: error instanceof Error ? error.message : String(error),
            tryingNext: '/payment/',
          })
        }
        continue // Try payment/ next
      }

      // If payment/ also fails, return error
      if (process.env.NODE_ENV === 'development') {
        console.error('[ATL_PAYMENT_FETCH_ERROR]', {
          baseUrl,
          path: endpoint.path,
          fullUrl: `${baseUrlClean}${endpoint.path}`,
          error: error instanceof Error ? error.message : String(error),
          upstreamStatus,
          upstreamPreview: upstreamText.substring(0, 200),
        })
      }

      return NextResponse.json<ErrorResponse>(
        {
          ok: false,
          code: 'ATLANTICO_PAYMENT_FAILED',
          reason: 'ATLANTICO_PAYMENT_FAILED',
          upstreamPreview:
            upstreamText.substring(0, 200) ||
            (error instanceof Error ? error.message.substring(0, 200) : 'Unknown error'),
          upstreamStatus,
        },
        { status: 502 }
      )
    }
  }

  // If we exhausted all endpoints without success
  return NextResponse.json<ErrorResponse>(
    {
      ok: false,
      code: 'ATLANTICO_PAYMENT_FAILED',
      reason: 'ATLANTICO_PAYMENT_FAILED',
      upstreamPreview: upstreamText.substring(0, 200) || 'No working endpoint found',
      upstreamStatus,
    },
    { status: 502 }
  )
}


