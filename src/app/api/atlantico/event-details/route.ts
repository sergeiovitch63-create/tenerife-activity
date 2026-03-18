/**
 * GET /api/atlantico/event-details?eventId=&lang=
 * 
 * Fetches event details from Atlantico API and returns normalized JSON
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchJson } from '@/lib/atlantico/client'

/**
 * Meeting point can be a string or an object with more details
 */
export type MeetingPoint = string | {
  name?: string
  address?: string
  description?: string
  time?: string
  coordinates?: {
    lat?: number
    lng?: number
  }
  [key: string]: unknown
}

interface EventDetailsResponse {
  id: string
  code: string
  name: string
  days: number | number[] | null
  times: string[]
  pProd: '0' | '1' | '2' | '3' | null
  route: string | null
  icons: string[]
  desc: string | null
  meetingPoints?: MeetingPoint[]
}

/**
 * Normalize Atlantico event details response
 */
function normalizeEventDetails(raw: any, eventId: string): EventDetailsResponse {
  // Handle days: can be number, array of numbers, or string
  let days: number | number[] | null = null
  if (raw.days !== undefined && raw.days !== null) {
    if (Array.isArray(raw.days)) {
      days = raw.days.map((d: any) => typeof d === 'number' ? d : parseInt(String(d), 10)).filter((d: number) => !isNaN(d))
    } else if (typeof raw.days === 'number') {
      days = raw.days
    } else if (typeof raw.days === 'string') {
      const parsed = parseInt(raw.days, 10)
      days = isNaN(parsed) ? null : parsed
    }
  }
  
  // Normalize meetingPoints - can be array of strings or objects
  let meetingPoints: MeetingPoint[] | undefined = undefined
  if (raw.meetingPoints !== undefined && raw.meetingPoints !== null) {
    if (Array.isArray(raw.meetingPoints)) {
      meetingPoints = raw.meetingPoints.map((point: any) => {
        if (typeof point === 'string') {
          return point
        }
        if (typeof point === 'object' && point !== null) {
          return {
            name: point.name || point.nombre || point.title || undefined,
            address: point.address || point.direccion || point.adresse || undefined,
            description: point.description || point.desc || point.descripcion || undefined,
            time: point.time || point.hora || point.tiempo || undefined,
            coordinates: point.coordinates || point.coords || (point.lat && point.lng ? { lat: point.lat, lng: point.lng } : undefined),
            ...point, // Keep other fields
          }
        }
        return String(point)
      })
    } else if (typeof raw.meetingPoints === 'string') {
      meetingPoints = [raw.meetingPoints]
    }
  }

  return {
    id: String(raw.id || raw.code || eventId),
    code: String(raw.code || raw.id || eventId),
    name: String(raw.name || raw.title || raw.nombre || ''),
    days,
    times: Array.isArray(raw.times) ? raw.times.map(String) : typeof raw.times === 'string' ? [raw.times] : [],
    pProd: raw.pProd !== undefined ? String(raw.pProd) as '0' | '1' | '2' | '3' : null,
    route: raw.route ? String(raw.route) : null,
    icons: Array.isArray(raw.icons) ? raw.icons.map(String) : typeof raw.icons === 'string' ? [raw.icons] : [],
    desc: raw.desc || raw.description || raw.descripcion || null,
    meetingPoints,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const eventId = searchParams.get('eventId')
    // Force stable base language (ENG) regardless of site locale
    const forcedLang = 'ENG'

    if (!eventId) {
      return NextResponse.json(
        {
          error: 'Missing parameters',
          message: 'eventId is required',
        },
        { status: 400 }
      )
    }

    // Fetch event details
    const raw = await fetchJson(`/eventDetails/${eventId}/${forcedLang}`)

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

