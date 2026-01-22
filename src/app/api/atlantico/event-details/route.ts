/**
 * GET /api/atlantico/event-details?eventId=&lang=
 * 
 * Fetches event details from Atlantico API and returns normalized JSON
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchJson } from '@/lib/atlantico/client'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'

interface EventDetailsResponse {
  id: string
  code: string
  name: string
  days: number | null
  times: string[]
  pProd: '0' | '1' | '2' | '3' | null
  route: string | null
  icons: string[]
  desc: string | null
}

/**
 * Normalize Atlantico event details response
 */
function normalizeEventDetails(raw: any, eventId: string): EventDetailsResponse {
  return {
    id: String(raw.id || raw.code || eventId),
    code: String(raw.code || raw.id || eventId),
    name: String(raw.name || raw.title || raw.nombre || ''),
    days: typeof raw.days === 'number' ? raw.days : typeof raw.days === 'string' ? parseInt(raw.days, 10) || null : null,
    times: Array.isArray(raw.times) ? raw.times.map(String) : typeof raw.times === 'string' ? [raw.times] : [],
    pProd: raw.pProd !== undefined ? String(raw.pProd) as '0' | '1' | '2' | '3' : null,
    route: raw.route ? String(raw.route) : null,
    icons: Array.isArray(raw.icons) ? raw.icons.map(String) : typeof raw.icons === 'string' ? [raw.icons] : [],
    desc: raw.desc || raw.description || raw.descripcion || null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const eventId = searchParams.get('eventId')
    const lang = searchParams.get('lang')

    if (!eventId || !lang) {
      return NextResponse.json(
        {
          error: 'Missing parameters',
          message: 'eventId and lang are required',
        },
        { status: 400 }
      )
    }

    // Normalize language - use proper mapping (CAS/ENG/FRA/RUS/ALE/ITA)
    // If lang is already in correct format, use it; otherwise map from locale
    const normalizedLang = lang.length === 3 && ['CAS', 'ENG', 'FRA', 'RUS', 'ALE', 'ITA'].includes(lang.toUpperCase())
      ? lang.toUpperCase()
      : mapLocaleToAtlanticoLang(lang)

    // Fetch event details
    const raw = await fetchJson(`/eventDetails/${eventId}/${normalizedLang}`)

    // Normalize response
    const normalized = normalizeEventDetails(raw, eventId)

    return NextResponse.json(normalized, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60', // 5min cache
      },
    })
  } catch (error) {
    // Server-only logging
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATLANTICO_EVENT_DETAILS] Error:', error)
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch event details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

