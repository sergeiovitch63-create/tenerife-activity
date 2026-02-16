/**
 * GET /api/atlantico/groups
 * 
 * Fetches groups (tours) from Atlantico API filtered by classification.
 * 
 * Query parameters:
 * - lang: Language code (default: 'ENG', must be 3 letters)
 * - page: Page number (default: -1 for all pages)
 * - classificationId: Classification ID (required) - this is the id from classificationList
 * 
 * Returns:
 * {
 *   ok: boolean
 *   groups: Array<{ id: string | number, code: string, name: string, desc?: string, image?: string, price?: number, duration?: string, ids?: (string | number)[] }>
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'

interface AtlanticoGroup {
  id?: string | number
  Code?: string
  code?: string
  name?: string
  desc?: string
  description?: string
  image?: string
  price?: number | string
  duration?: string
  ids?: (string | number)[]
  [key: string]: unknown
}

interface NormalizedGroup {
  id: string | number
  code: string
  name: string
  desc?: string
  image?: string
  price?: number
  duration?: string
  ids?: (string | number)[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  let lang = searchParams.get('lang') || 'ENG'
  let page = searchParams.get('page') || '-1'
  const classificationId = searchParams.get('classificationId')

  // Validate lang: 3 letters, default "ENG"
  if (!/^[A-Za-z]{3}$/.test(lang)) {
    lang = 'ENG'
  }
  lang = lang.toUpperCase()

  // Validate page: integer, default -1
  const pageNum = parseInt(page, 10)
  if (isNaN(pageNum)) {
    page = '-1'
  } else {
    page = pageNum.toString()
  }

  // Validate classificationId (required)
  if (!classificationId || classificationId.trim() === '') {
    return NextResponse.json(
      {
        ok: false,
        groups: [],
        error: 'classificationId parameter is required',
      },
      { status: 400 }
    )
  }

  try {
    // Call Atlantico API: groupsList/{language}/{page}/{classificationCode}
    // Note: According to PDF, "classification code" is the id from classificationList
    const groups = await atlanticoGet<AtlanticoGroup[]>(
      `/groupsList/${lang}/${page}/${classificationId.trim()}`
    )

    if (!Array.isArray(groups)) {
      return NextResponse.json(
        {
          ok: false,
          groups: [],
          error: 'Invalid response from Atlantico API: expected array',
        },
        { status: 502 }
      )
    }

    // Normalize groups
    const normalized: NormalizedGroup[] = groups
      .filter((g) => {
        const code = g.Code || g.code
        const name = g.name
        return code && name
      })
      .map((g) => {
        const code = String(g.Code || g.code!)
        const id = g.id !== undefined ? g.id : code
        const price = typeof g.price === 'number' ? g.price : typeof g.price === 'string' ? parseFloat(g.price) || undefined : undefined

        return {
          id,
          code,
          name: String(g.name),
          desc: g.desc || g.description ? String(g.desc || g.description) : undefined,
          image: g.image ? String(g.image) : undefined,
          price,
          duration: g.duration ? String(g.duration) : undefined,
          ids: g.ids,
        }
      })

    // Cache for 2 minutes
    return NextResponse.json(
      {
        ok: true,
        groups: normalized,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATL_GROUPS] Error:', {
        lang,
        page,
        classificationId,
        error: errorMessage,
      })
    }

    return NextResponse.json(
      {
        ok: false,
        groups: [],
        error: errorMessage,
      },
      { status: 502 }
    )
  }
}









