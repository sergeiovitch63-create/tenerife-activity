/**
 * GET /api/atlantico/classifications
 * 
 * Fetches classifications from Atlantico API.
 * 
 * Query parameters:
 * - lang: Language code (default: 'ENG', must be 3 letters)
 * 
 * Returns:
 * {
 *   ok: boolean
 *   classifications: Array<{ id: string | number, code: string, name: string, desc?: string, image?: string }>
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'

interface AtlanticoClassification {
  id?: string | number
  code?: string
  name?: string
  desc?: string
  description?: string
  image?: string
  [key: string]: unknown
}

interface NormalizedClassification {
  id: string | number
  code: string
  name: string
  desc?: string
  image?: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  let lang = searchParams.get('lang') || 'ENG'

  // Validate lang: 3 letters, default "ENG"
  if (!/^[A-Za-z]{3}$/.test(lang)) {
    lang = 'ENG'
  }
  lang = lang.toUpperCase()

  // Get collaborator from env (required for classificationList endpoint)
  const collaborator = process.env.ATLANTICO_COLLABORATOR || process.env.ATLANTICO_OFFICE || '3645'

  try {
    // Call Atlantico API: clasificationList/{language}/{Collaborator}
    const classifications = await atlanticoGet<AtlanticoClassification[]>(
      `/clasificationList/${lang}/${collaborator}`
    )

    if (!Array.isArray(classifications)) {
      return NextResponse.json(
        {
          ok: false,
          classifications: [],
          error: 'Invalid response from Atlantico API: expected array',
        },
        { status: 502 }
      )
    }

    // Normalize classifications
    const normalized: NormalizedClassification[] = classifications
      .filter((c) => c.id !== undefined && c.code && c.name)
      .map((c) => ({
        id: c.id!,
        code: String(c.code),
        name: String(c.name),
        desc: c.desc || c.description ? String(c.desc || c.description) : undefined,
        image: c.image ? String(c.image) : undefined,
      }))

    // Cache for 5 minutes (in-memory via Next.js fetch cache)
    return NextResponse.json(
      {
        ok: true,
        classifications: normalized,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATL_CLASSIFICATIONS] Error:', {
        lang,
        collaborator,
        error: errorMessage,
      })
    }

    return NextResponse.json(
      {
        ok: false,
        classifications: [],
        error: errorMessage,
      },
      { status: 502 }
    )
  }
}









