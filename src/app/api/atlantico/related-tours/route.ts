/**
 * GET /api/atlantico/related-tours?code=508&lang=ENG
 *
 * Returns tours from the same classification as the given group code.
 * Excludes the current tour. Used for "You might also like" section.
 */

import { NextRequest, NextResponse } from 'next/server'

interface Group {
  Code?: string
  code?: string
  id?: string | number
  name?: string
  desc?: string
  image?: string
  price?: number | string
  duration?: string | number
  ids?: (string | number)[]
  [key: string]: unknown
}

interface Classification {
  id?: string | number
  code?: string
  name?: string
  [key: string]: unknown
}

export const dynamic = 'force-dynamic'

function getGroupCode(g: Group): string | null {
  if (g.Code && String(g.Code).trim()) return String(g.Code).trim()
  if (g.code && String(g.code).trim()) return String(g.code).trim()
  if (typeof g.id === 'string' && g.id.trim()) return g.id.trim()
  if (typeof g.id === 'number') return String(g.id)
  return null
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')?.trim()
  const lang = searchParams.get('lang') || 'ENG'

  if (!code) {
    return NextResponse.json(
      { ok: false, tours: [], error: 'code parameter is required' },
      { status: 400 }
    )
  }

  try {
    const headersList = await import('next/headers').then((m) => m.headers)
    const hdrs = headersList()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    const origin = envBase || `${protocol}://${host}`

    const res = await fetch(
      `${origin}/api/atlantico/backoffice?lang=${encodeURIComponent(lang)}`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, tours: [], error: 'Failed to fetch backoffice' },
        { status: 502 }
      )
    }

    const data = (await res.json()) as {
      ok?: boolean
      classifications?: Classification[]
      groupsByClassification?: Record<string, Group[]>
    }

    if (!data.ok || !data.groupsByClassification) {
      return NextResponse.json(
        { ok: true, tours: [], classificationName: null },
        { status: 200 }
      )
    }

    const codeNorm = code.toUpperCase()
    let relatedTours: Group[] = []
    let classificationName: string | null = null

    for (const [classificationId, groups] of Object.entries(data.groupsByClassification || {})) {
      if (!Array.isArray(groups)) continue
      const found = groups.some((g) => {
        const gc = getGroupCode(g)
        return gc && gc.toUpperCase() === codeNorm
      })
      if (found) {
        const classification = data.classifications?.find(
          (c) => c.id !== undefined && String(c.id) === classificationId
        )
        classificationName = classification?.name ? String(classification.name) : null
        relatedTours = groups
          .filter((g) => {
            const gc = getGroupCode(g)
            return gc && gc.toUpperCase() !== codeNorm
          })
          .map((g) => ({
            id: g.id,
            code: getGroupCode(g) || '',
            name: g.name,
            desc: g.desc,
            image: g.image,
            price: typeof g.price === 'number' ? g.price : parseFloat(String(g.price || '')) || undefined,
            duration: g.duration,
            ids: g.ids,
          }))
        break
      }
    }

    return NextResponse.json({
      ok: true,
      tours: relatedTours,
      classificationName,
    })
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[RELATED_TOURS] Error:', e)
    }
    return NextResponse.json(
      { ok: false, tours: [], error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
