/**
 * GET /api/atlantico/search
 *
 * Searches groupDetails by title (name).
 * Fetches classifications → groups per classification → filters by title containing query.
 *
 * Query params: q (required), lang (default ENG)
 */

import { NextRequest, NextResponse } from 'next/server'
import { atlanticoGet } from '@/lib/atlantico/client'

interface AtlanticoClassification {
  id?: string | number
  code?: string
  name?: string
  [key: string]: unknown
}

interface AtlanticoGroup {
  Code?: string
  code?: string
  name?: string
  desc?: string
  image?: string
  price?: number | string
  duration?: string
  [key: string]: unknown
}

export interface SearchGroupResult {
  code: string
  name: string
  desc?: string
  image?: string
  price?: number
  duration?: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')?.trim()
  let lang = searchParams.get('lang') || 'ENG'

  if (!query || query.length === 0) {
    return NextResponse.json(
      { ok: true, groups: [], error: 'Query q is required' },
      { status: 400 }
    )
  }

  if (!/^[A-Za-z]{3}$/.test(lang)) {
    lang = 'ENG'
  }
  lang = lang.toUpperCase()

  const collaborator =
    process.env.ATLANTICO_COLLABORATOR || process.env.ATLANTICO_OFFICE || '3645'

  const queryLower = query.toLowerCase()

  try {
    const classifications = await atlanticoGet<AtlanticoClassification[]>(
      `/clasificationList/${lang}/${collaborator}`
    )

    if (!Array.isArray(classifications)) {
      return NextResponse.json(
        { ok: true, groups: [], error: 'Invalid classifications response' },
        { status: 502 }
      )
    }

    const seen = new Set<string>()
    const results: SearchGroupResult[] = []

    await Promise.all(
      classifications.map(async (cls) => {
        const clsCode = cls.code
        if (!clsCode || typeof clsCode !== 'string') return

        try {
          const groups = await atlanticoGet<AtlanticoGroup[]>(
            `/groupsList/${lang}/-1/${clsCode}`
          )
          if (!Array.isArray(groups)) return

          for (const g of groups) {
            const code = String(g.Code ?? g.code ?? '').trim()
            const name = String(g.name ?? '').trim()
            if (!code || seen.has(code)) continue

            if (name.toLowerCase().includes(queryLower)) {
              seen.add(code)
              const price =
                typeof g.price === 'number'
                  ? g.price
                  : typeof g.price === 'string'
                    ? parseFloat(g.price) || undefined
                    : undefined
              results.push({
                code,
                name,
                desc: g.desc ? String(g.desc) : undefined,
                image: g.image ? String(g.image) : undefined,
                price,
                duration: g.duration ? String(g.duration) : undefined,
              })
            }
          }
        } catch {
          // Skip failed classification
        }
      })
    )

    return NextResponse.json(
      { ok: true, groups: results },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (process.env.NODE_ENV === 'development') {
      console.error('[ATL_SEARCH]', msg)
    }
    return NextResponse.json(
      { ok: false, groups: [], error: msg },
      { status: 502 }
    )
  }
}
