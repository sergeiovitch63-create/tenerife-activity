/**
 * Reviews client — server-safe fetcher hitting Supabase PostgREST.
 *
 * No `@supabase/supabase-js` dependency on purpose:
 *   - we only do two tiny read queries
 *   - edge runtime friendliness
 *   - keeps bundle weight off the client layout
 *
 * All calls are env-gated: if `NEXT_PUBLIC_SUPABASE_URL` or
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, functions short-circuit
 * with `null` so the calling scorer simply doesn't fire. Same behaviour
 * for any network / schema failure — the feature degrades silently to
 * "no reviews module" rather than erroring out a full page.
 *
 * RLS enforces `published = true` on the anon key, so there is no data-
 * leak risk from using it from the browser if we ever surface `getReviews`
 * there.
 */

export type Review = {
  id: string
  group_code: number
  locale: string
  author_name: string
  author_country: string | null
  rating: number
  title: string | null
  body: string
  travel_date: string | null
  verified: boolean
  created_at: string
}

export type ReviewsMeta = {
  count: number
  avgRating: number
  verifiedCount: number
  /** ISO timestamp of the most recent published review, or null if none. */
  lastReviewAt: string | null
}

function envGate(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return null
  return { url: url.replace(/\/+$/, ''), anon }
}

type FetchOpts = {
  /** Cache tag (Next.js) so revalidation can target a single group. */
  cacheTag?: string
  /** Seconds between revalidations. Default 600 (10 min). */
  revalidate?: number
}

async function supabaseGet<T>(
  path: string,
  query: string,
  opts: FetchOpts = {},
): Promise<T | null> {
  const env = envGate()
  if (!env) return null

  const url = `${env.url}/rest/v1/${path}?${query}`
  try {
    const res = await fetch(url, {
      headers: {
        apikey: env.anon,
        Authorization: `Bearer ${env.anon}`,
        Accept: 'application/json',
      },
      next: {
        revalidate: opts.revalidate ?? 600,
        tags: opts.cacheTag ? [opts.cacheTag] : undefined,
      },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Cheap head query + count: returns null when disabled or empty.
 * Used by the signal extractor to decide whether to populate
 * `reviewsMeta` on a given activity.
 */
export async function getReviewsMeta(groupCode: number): Promise<ReviewsMeta | null> {
  if (!Number.isFinite(groupCode)) return null

  // Supabase PostgREST supports `?select=rating,verified,created_at`
  // with `Prefer: count=exact`, but hitting rows directly is simpler
  // and we already index (group_code, published). Cap at 500 — any
  // activity with more than that has plenty of signal for aggregates.
  const rows = await supabaseGet<
    Array<Pick<Review, 'rating' | 'verified' | 'created_at'>>
  >(
    'reviews',
    [
      `group_code=eq.${groupCode}`,
      `published=eq.true`,
      `select=rating,verified,created_at`,
      `order=created_at.desc`,
      `limit=500`,
    ].join('&'),
    { cacheTag: `reviews:${groupCode}:meta`, revalidate: 900 },
  )

  if (!rows || rows.length === 0) return null

  let ratingSum = 0
  let verifiedCount = 0
  for (const r of rows) {
    ratingSum += r.rating
    if (r.verified) verifiedCount += 1
  }

  return {
    count: rows.length,
    avgRating: Math.round((ratingSum / rows.length) * 10) / 10,
    verifiedCount,
    lastReviewAt: rows[0].created_at,
  }
}

/**
 * Listing query — used by the client card's "see all" expander.
 * Curated sort order: verified first, then rating desc, then recency.
 */
export async function getReviews(
  groupCode: number,
  opts: { locale?: string; limit?: number } = {},
): Promise<Review[] | null> {
  if (!Number.isFinite(groupCode)) return null
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 50)

  const query = [
    `group_code=eq.${groupCode}`,
    `published=eq.true`,
    `select=*`,
    // PostgREST multi-column order: verified desc, rating desc, recency desc.
    `order=verified.desc,rating.desc,created_at.desc`,
    `limit=${limit}`,
    opts.locale ? `locale=eq.${encodeURIComponent(opts.locale)}` : '',
  ]
    .filter(Boolean)
    .join('&')

  const rows = await supabaseGet<Review[]>('reviews', query, {
    cacheTag: `reviews:${groupCode}:list`,
    revalidate: 600,
  })

  return rows ?? null
}
