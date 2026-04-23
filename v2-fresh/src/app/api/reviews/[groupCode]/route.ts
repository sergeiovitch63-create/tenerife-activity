/**
 * /api/reviews/[groupCode] — public read endpoint.
 *
 * Proxies to `getReviews` which hits Supabase PostgREST. Exists so the
 * client-side `TestimonialsCurated` card can lazy-load the full review
 * list without a Supabase SDK on the client. Server-side aggregates
 * (`getReviewsMeta`) are inlined into signals at SSR time.
 *
 * Returns:
 *   200 { items: Review[], total: number }       — when Supabase is live
 *   503 { status: 'dormant', fallback: 'none' }  — when env vars missing
 *
 * Query params:
 *   locale (optional) — ISO code for locale filtering
 *   limit  (optional) — 1..50, default 8
 */

import { NextResponse } from 'next/server'
import { getReviews } from '@/lib/reviews/client'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

type Props = { params: { groupCode: string } }

export async function GET(req: Request, { params }: Props) {
  const groupCode = Number(params.groupCode)
  if (!Number.isFinite(groupCode) || groupCode <= 0) {
    return NextResponse.json({ error: 'invalid_group_code' }, { status: 400 })
  }

  const url = new URL(req.url)
  const locale = url.searchParams.get('locale') ?? undefined
  const limitRaw = Number(url.searchParams.get('limit') ?? '8')
  const limit = Number.isFinite(limitRaw) ? limitRaw : 8

  const items = await getReviews(groupCode, { locale, limit })

  // `getReviews` returns null either when the feature is disabled
  // (env missing) OR on fetch failure. We don't distinguish — both
  // should degrade silently to "no module" on the client.
  if (items === null) {
    return NextResponse.json(
      { status: 'dormant', fallback: 'none' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '600' },
      },
    )
  }

  return NextResponse.json(
    { items, total: items.length },
    {
      status: 200,
      headers: {
        'Cache-Control':
          'public, s-maxage=600, stale-while-revalidate=300',
      },
    },
  )
}
