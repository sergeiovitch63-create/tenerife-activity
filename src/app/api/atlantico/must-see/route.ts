/**
 * GET /api/atlantico/must-see
 *
 * Fetches group details for all Must See carousel activities.
 * Query: ?lang=ENG
 * Returns: { ok, tours: Array<{ code, name, desc, price, duration }> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { MUST_SEE_ORDERED } from '@/data/must-see-group-mapping'

type Tour = {
  id: string
  code: string
  name: string
  desc?: string
  price?: number
  duration?: string
}

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') || 'ENG'
  const validatedLang = /^[A-Za-z]{3}$/.test(lang) ? lang.toUpperCase() : 'ENG'

  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
  const headersList = await import('next/headers').then((m) => m.headers)
  const hdrs = headersList()
  const host = hdrs.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = envBase || `${protocol}://${host}`

  const byCode = new Map<string, Tour>()

  await Promise.all(
    MUST_SEE_ORDERED.map(async ({ title, code }) => {
      try {
        const res = await fetch(
          `${origin}/api/atlantico/group-details/${encodeURIComponent(code)}/${encodeURIComponent(validatedLang)}`,
          { next: { revalidate: 300 } }
        )
        if (!res.ok) {
          byCode.set(code, { id: code, code, name: title })
          return
        }
        const g: Record<string, unknown> = await res.json()
        const name = (g.name || g.Name || title) as string
        const desc = (g.desc || g.description) as string | undefined
        let price: number | undefined
        const p = g.price ?? g.priceA ?? g.priceS
        if (typeof p === 'number' && p > 0) price = p
        else if (typeof p === 'string') {
          const n = parseFloat(p)
          if (!isNaN(n) && n > 0) price = n
        }
        const duration = (g.duration as string | number | undefined) != null
          ? String(g.duration)
          : undefined

        byCode.set(code, {
          id: code,
          code,
          name,
          desc,
          price,
          duration,
        })
      } catch {
        byCode.set(code, { id: code, code, name: title })
      }
    })
  )

  const ordered = MUST_SEE_ORDERED.map(({ code }) => byCode.get(code)).filter(
    (t): t is Tour => !!t
  )

  return NextResponse.json(
    { ok: true, tours: ordered },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  )
}
