/**
 * GET /api/atlantico/prices?eventId=&date=YYYY-MM-DD&office?
 * 
 * Fetches prices from Atlantico API and returns normalized JSON
 * Parses according to pProd value (0 = per person, 2 = per day)
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchText, fetchJson } from '@/lib/atlantico/client'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'

interface PricesPerPersonResponse {
  type: 'per_person'
  adult: number | null
  child: number | null
  infant: number | null
}

interface PricesPerDayResponse {
  type: 'per_day'
  tiers: Array<{ days: number; price: number }>
}

interface PricesUnknownResponse {
  type: 'unknown'
  raw: any
}

type PricesResponse = PricesPerPersonResponse | PricesPerDayResponse | PricesUnknownResponse

/**
 * Get pProd from event details or accept as query param
 */
async function getPProd(eventId: string, lang: string, pProdParam?: string | null): Promise<'0' | '1' | '2' | '3' | null> {
  // If pProd provided in query, use it
  if (pProdParam && ['0', '1', '2', '3'].includes(pProdParam)) {
    return pProdParam as '0' | '1' | '2' | '3'
  }

  // Otherwise fetch from eventDetails
  try {
    const eventDetails = await fetchJson(`/eventDetails/${eventId}/${lang}`)
    const pProd = eventDetails?.pProd
    if (pProd && ['0', '1', '2', '3'].includes(String(pProd))) {
      return String(pProd) as '0' | '1' | '2' | '3'
    }
  } catch {
    // Silent fail, will use default parsing
  }

  return null
}

/**
 * Parse per-person prices from pipe-separated string
 * Format: "adult|child|infant|adultComm|childComm|infantComm"
 */
function parsePerPerson(text: string): PricesPerPersonResponse | null {
  const parts = text.split('|').map((p) => p.trim()).filter(Boolean)
  
  if (parts.length < 3) {
    return null
  }

  const adult = parseFloat(parts[0])
  const child = parseFloat(parts[1])
  const infant = parseFloat(parts[2])

  if (isNaN(adult) || adult <= 0) {
    return null
  }

  return {
    type: 'per_person',
    adult: isNaN(adult) ? null : adult,
    child: isNaN(child) ? null : child,
    infant: isNaN(infant) ? null : infant,
  }
}

/**
 * Parse per-day prices from pipe-separated string
 * Format: "days|price|comm|days|price|comm..."
 */
function parsePerDay(text: string): PricesPerDayResponse | null {
  const parts = text.split('|').map((p) => p.trim()).filter(Boolean)
  
  if (parts.length < 3 || parts.length % 3 !== 0) {
    return null
  }

  const tiers: Array<{ days: number; price: number }> = []
  
  for (let i = 0; i < parts.length; i += 3) {
    const days = parseFloat(parts[i])
    const price = parseFloat(parts[i + 1])
    
    if (!isNaN(days) && !isNaN(price) && days > 0 && price > 0) {
      tiers.push({ days, price })
    }
  }

  if (tiers.length === 0) {
    return null
  }

  return {
    type: 'per_day',
    tiers,
  }
}

/**
 * Parse per-day prices from JSON (car rental / per_day events)
 * Handles: { tiers: [{days, price}...] } or { PVP, PVPA, price, priceA } as daily rate
 */
function parsePerDayFromJson(raw: any): PricesPerDayResponse | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }
  // Try explicit tiers array
  if (Array.isArray(raw.tiers) && raw.tiers.length > 0) {
    const tiers: Array<{ days: number; price: number }> = []
    for (const t of raw.tiers) {
      const days = typeof t?.days === 'number' ? t.days : typeof t?.upToDays === 'number' ? t.upToDays : parseFloat(String(t?.days ?? t?.upToDays ?? 1))
      const price = typeof t?.price === 'number' ? t.price : parseFloat(String(t?.price ?? 0))
      if (!isNaN(days) && days > 0 && !isNaN(price) && price > 0) {
        tiers.push({ days, price })
      }
    }
    if (tiers.length > 0) {
      return { type: 'per_day', tiers }
    }
  }
  // Try single daily rate: PVP, PVPA, price, priceA
  const val = raw.PVP ?? raw.pvp ?? raw.PVPA ?? raw.pvpa ?? raw.price ?? raw.priceA ?? raw.PVPOS
  const num = typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) : NaN
  if (!isNaN(num) && num > 0) {
    return { type: 'per_day', tiers: [{ days: 1, price: num }] }
  }
  return null
}

/**
 * Parse JSON response for per-person prices
 */
function parsePerPersonFromJson(raw: any): PricesPerPersonResponse | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }

  // Check for VPVA/VPVC/VPVOS or PVPA/PVPC/PVPOS keys
  const adult = raw.VPVA ?? raw.vpva ?? raw.PVPA ?? raw.pvpa ?? null
  const child = raw.VPVC ?? raw.vpvc ?? raw.PVPC ?? raw.pvpc ?? null
  const infant = raw.VPVOS ?? raw.vpvos ?? raw.PVPOS ?? raw.pvpos ?? null

  if (adult === null && child === null && infant === null) {
    return null
  }

  const adultNum = typeof adult === 'number' ? adult : typeof adult === 'string' ? parseFloat(adult) : null
  const childNum = typeof child === 'number' ? child : typeof child === 'string' ? parseFloat(child) : null
  const infantNum = typeof infant === 'number' ? infant : typeof infant === 'string' ? parseFloat(infant) : null

  if (adultNum === null || isNaN(adultNum) || adultNum <= 0) {
    return null
  }

  return {
    type: 'per_person',
    adult: adultNum,
    child: childNum && !isNaN(childNum) ? childNum : null,
    infant: infantNum && !isNaN(infantNum) ? infantNum : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const eventCode = searchParams.get('eventCode')
    const eventId = searchParams.get('eventId')
    const date = searchParams.get('date')
    const office = searchParams.get('office')
    const lang = searchParams.get('lang') || 'ENG'
    const pProdParam = searchParams.get('pProd')

    if (!date || (!eventId && !eventCode)) {
      return NextResponse.json(
        {
          error: 'Missing parameters',
          message: 'eventId/eventCode and date are required',
        },
        { status: 400 }
      )
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        {
          error: 'Invalid date format',
          message: 'Date must be in YYYY-MM-DD format',
        },
        { status: 400 }
      )
    }

    const effectiveEventId = eventId ?? eventCode ?? ''

    // Normalize language - use proper mapping (CAS/ENG/FRA/RUS/ALE/ITA)
    // If lang is already in correct format, use it; otherwise map from locale
    const normalizedLang = lang.length === 3 && ['CAS', 'ENG', 'FRA', 'RUS', 'ALE', 'ITA'].includes(lang.toUpperCase())
      ? lang.toUpperCase()
      : mapLocaleToAtlanticoLang(lang)

    // Get pProd
    const pProd = await getPProd(effectiveEventId, normalizedLang, pProdParam)

    // Build endpoint
    const endpoint = office
      ? `/loadPrices/${effectiveEventId}/${date}/${office}`
      : `/loadPrices/${effectiveEventId}/${date}`

    // Fetch prices (always as text first, then parse)
    const text = await fetchText(endpoint)

    // New v2 mode: return raw + pProd exactly as requested.
    if (eventCode) {
      return NextResponse.json(
        { raw: text.trim(), pProd: pProd ?? '0' },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    // Try to parse as JSON first
    let raw: any = text
    const trimmed = text.trim()
    
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        raw = JSON.parse(trimmed)
      } catch {
        // Keep as text
      }
    }

    // Parse according to pProd
    let response: PricesResponse

    if (pProd === '0') {
      // Per person format
      if (typeof raw === 'string') {
        const parsed = parsePerPerson(raw)
        if (parsed) {
          response = parsed
        } else {
          response = { type: 'unknown', raw }
        }
      } else if (typeof raw === 'object') {
        const parsed = parsePerPersonFromJson(raw)
        if (parsed) {
          response = parsed
        } else {
          response = { type: 'unknown', raw }
        }
      } else {
        response = { type: 'unknown', raw }
      }
    } else if (pProd === '2') {
      // Per day format
      if (typeof raw === 'string') {
        const parsed = parsePerDay(raw)
        if (parsed) {
          response = parsed
        } else {
          response = { type: 'unknown', raw }
        }
      } else if (typeof raw === 'object') {
        const parsed = parsePerDayFromJson(raw)
        if (parsed) {
          response = parsed
        } else {
          response = { type: 'unknown', raw }
        }
      } else {
        response = { type: 'unknown', raw }
      }
    } else {
      // Unknown pProd or no pProd: try per-person parsing as fallback (e.g. JSON PVPA/PVPC/PVPOS)
      let fallback: PricesPerPersonResponse | null = null
      if (typeof raw === 'object') {
        fallback = parsePerPersonFromJson(raw)
      } else if (typeof raw === 'string') {
        fallback = parsePerPerson(raw)
      }
      response = fallback ?? { type: 'unknown', raw }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30', // 60s cache
      },
    })
  } catch (error) {
    // Server-only logging
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATLANTICO_PRICES] Error:', error)
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch prices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
