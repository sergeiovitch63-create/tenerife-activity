/**
 * GET /api/atlantico/prices/[eventId]?date=YYYY-MM-DD
 *
 * Atlántico source of truth: loadPrices/{eventId}/{YYYY-MM-DD}/{office?}
 * - office is OPTIONAL (read from env ATLANTICO_OFFICE_ID when present)
 * - response body can be:
 *   1) TEXT separated by "|" (legacy format): "ADULT|CHILD|INFANT|..."
 *   2) JSON object (new format): { VPVA, VPVC, VPVOS, COMA, COMC, COMOS }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'

type PricesOk = {
  ok: true
  type: 'per_person' | 'per_day'
  adultPrice?: number
  childPrice?: number
  infantPrice?: number
  tiers?: Array<{ days: number; price: number }>
  currency: 'EUR'
  raw?: any
}

type PricesError = { ok: false; raw?: any; reason: string }

function parseNumber(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null) return null
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : null
  }
  const n = Number.parseFloat(String(v).trim())
  return Number.isFinite(n) ? n : null
}

function splitParts(raw: string): string[] {
  return raw.split('|').map((p) => p.trim()).filter(Boolean)
}

function parsePerPersonFromString(parts: string[]): { adult: number; child: number; infant: number } | null {
  // ADULT|CHILD|INFANT|... (can have more fields)
  if (parts.length < 3) return null
  const adult = parseNumber(parts[0])
  const child = parseNumber(parts[1])
  const infant = parseNumber(parts[2])
  if (adult === null || child === null || infant === null) return null
  return { adult, child, infant }
}

function parsePerPersonFromObject(raw: any): { adult: number; child: number; infant: number } | null {
  // JSON formats we've seen:
  // - { VPVA, VPVC, VPVOS, COMA, COMC, COMOS } (documented variant)
  // - { PVPA, PVPC, PVPOS, COMA, COMC, COMOS } (observed in production)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  
  // Check if this looks like the new format (has VPVA/VPVC/VPVOS or PVPA/PVPC/PVPOS keys)
  const hasAdultKey = 'VPVA' in raw || 'vpva' in raw || 'PVPA' in raw || 'pvpa' in raw
  const hasChildKey = 'VPVC' in raw || 'vpvc' in raw || 'PVPC' in raw || 'pvpc' in raw
  const hasInfantKey = 'VPVOS' in raw || 'vpvos' in raw || 'PVPOS' in raw || 'pvpos' in raw
  
  if (hasAdultKey || hasChildKey || hasInfantKey) {
    const adult = parseNumber(raw.VPVA ?? raw.vpva ?? raw.PVPA ?? raw.pvpa)
    const child = parseNumber(raw.VPVC ?? raw.vpvc ?? raw.PVPC ?? raw.pvpc)
    // Infant/other can legitimately be 0.00 in the API; default to 0 when missing/unparseable.
    const infant = parseNumber(raw.VPVOS ?? raw.vpvos ?? raw.PVPOS ?? raw.pvpos ?? '0')
    
    // At least adult price must be valid
    if (adult !== null) {
      return {
        adult,
        child: child ?? 0,
        infant: infant ?? 0,
      }
    }
  }
  
  return null
}

function parsePerDay(parts: string[]): Array<{ days: number; price: number }> | null {
  // DAYS|PRICE|COMM|DAYS|PRICE|COMM|... (multiple of 3)
  if (parts.length < 3 || parts.length % 3 !== 0) return null
  const tiers: Array<{ days: number; price: number }> = []
  for (let i = 0; i < parts.length; i += 3) {
    const days = parseNumber(parts[i])
    const price = parseNumber(parts[i + 1])
    if (days === null || price === null) continue
    tiers.push({ days, price })
  }
  return tiers.length > 0 ? tiers : null
}

function isIntString(v: string | undefined): boolean {
  if (!v) return false
  return /^-?\d+$/.test(v.trim())
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse<PricesOk | PricesError>> {
  try {
    const { eventId } = await params
    const { searchParams } = request.nextUrl
    const date = searchParams.get('date')
    const isDev = process.env.NODE_ENV === 'development'

    const config = getAtlanticoConfig()
    if (!config.isValid) {
      return NextResponse.json<PricesError>({ ok: false, reason: 'Invalid Atlantico config' }, { status: 500 })
    }

    if (!eventId) {
      return NextResponse.json<PricesError>({ ok: false, reason: 'Missing eventId' }, { status: 400 })
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json<PricesError>({ ok: false, reason: 'Invalid date (expected YYYY-MM-DD)' }, { status: 400 })
    }

    const office = process.env.ATLANTICO_OFFICE_ID?.trim()
    const endpoint = office ? `/loadPrices/${eventId}/${date}/${office}` : `/loadPrices/${eventId}/${date}`
    const response = await fetchAtlantico(endpoint, { revalidate: 30 })
    if (!response.ok) {
      if (isDev) {
        console.warn('[ATL_PRICES] loadPrices failed', { eventId, date, hasOffice: !!office, status: response.status })
      }
      return NextResponse.json<PricesError>(
        { ok: false, reason: `HTTP ${response.status}: ${response.statusText}` },
        { status: response.status }
      )
    }

    // IMPORTANT: Always read body as text ONCE, then normalize by content (do not rely on content-type)
    const contentType = response.headers.get('content-type') || ''
    const bodyText = await response.text()

    let raw: any = bodyText
    const t = bodyText.trim()

    // A) If it looks like JSON (starts with { or [ and ends with } or ]) try JSON.parse
    if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
      try {
        raw = JSON.parse(t)
      } catch {
        // keep raw as text
      }
    }

    // B) Double-encoded JSON string case: "\"{...}\""
    if (typeof raw === 'string') {
      const s = raw.trim()
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        try {
          const once = JSON.parse(s)
          if (typeof once === 'string') {
            const tt = once.trim()
            if ((tt.startsWith('{') && tt.endsWith('}')) || (tt.startsWith('[') && tt.endsWith(']'))) {
              raw = JSON.parse(tt)
            } else {
              raw = once
            }
          } else {
            raw = once
          }
        } catch {
          // keep as string
        }
      }
    }

    // DEV logging (body preview + normalized shape)
    if (isDev) {
      const rawKeys = raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw) : null
      console.log('[ATL_PRICES_DEBUG]', {
        eventId,
        date,
        contentType,
        bodyPreview: bodyText.slice(0, 120),
        normalizedType: typeof raw,
        rawKeys,
      })
    }

    // Empty response check
    if (!raw || (typeof raw === 'string' && raw.trim().length === 0)) {
      return NextResponse.json<PricesError>({ ok: false, raw, reason: 'Empty pricing response' })
    }

    // Format 1: New JSON object format with VPVA/VPVC/VPVOS
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const perPersonFromObject = parsePerPersonFromObject(raw)
      if (perPersonFromObject) {
        if (isDev) {
          console.log('[ATL_PRICES_DEBUG] parsed JSON format', {
            eventId,
            date,
            adultPrice: perPersonFromObject.adult,
            childPrice: perPersonFromObject.child,
            infantPrice: perPersonFromObject.infant,
          })
        }
        return NextResponse.json<PricesOk>({
          ok: true,
          type: 'per_person',
          adultPrice: perPersonFromObject.adult,
          childPrice: perPersonFromObject.child,
          infantPrice: perPersonFromObject.infant,
          currency: 'EUR',
          raw,
        })
      }
    }

    // Format 2: Legacy string format (pipe-separated)
    if (typeof raw === 'string') {
      const parts = splitParts(raw)
      
      if (parts.length === 0) {
        return NextResponse.json<PricesError>({ ok: false, raw, reason: 'Empty pricing response' })
      }

      // Per-day detection: first token is an integer (days) and pattern repeats as (days, price, comm)
      const looksPerDay = isIntString(parts[0]) && parts.length >= 3 && parts.length % 3 === 0
      if (looksPerDay) {
        const tiers = parsePerDay(parts)
        if (tiers) {
          if (isDev) {
            console.log('[ATL_PRICES_DEBUG] parsed per-day format', { eventId, date, tiersCount: tiers.length })
          }
          return NextResponse.json<PricesOk>({
            ok: true,
            type: 'per_day',
            tiers,
            currency: 'EUR',
            raw,
          })
        }
      }

      // Per-person string format
      const perPersonFromString = parsePerPersonFromString(parts)
      if (perPersonFromString) {
        if (isDev) {
          console.log('[ATL_PRICES_DEBUG] parsed string format', {
            eventId,
            date,
            adultPrice: perPersonFromString.adult,
            childPrice: perPersonFromString.child,
            infantPrice: perPersonFromString.infant,
          })
        }
        return NextResponse.json<PricesOk>({
          ok: true,
          type: 'per_person',
          adultPrice: perPersonFromString.adult,
          childPrice: perPersonFromString.child,
          infantPrice: perPersonFromString.infant,
          currency: 'EUR',
          raw,
        })
      }
    }

    // Unparseable format
    if (isDev) {
      console.warn('[ATL_PRICES] Unparseable pricing response', {
        eventId,
        date,
        hasOffice: !!office,
        raw: typeof raw === 'string' ? raw.substring(0, 200) : raw,
      })
    }
    return NextResponse.json<PricesError>({ ok: false, raw, reason: 'Unsupported pricing format' })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATL_PRICES] Error:', error)
    }
    return NextResponse.json<PricesError>(
      { ok: false, reason: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


