/**
 * Testimonials-Curated scorer — server-safe.
 *
 * Surfaces a compact social-proof card when the activity has enough
 * published reviews to tell an honest story. Intentionally conservative:
 *
 *   - Requires ≥ 3 published reviews (below that the module lies more
 *     than it informs; shoppers read "1 review" as a negative signal
 *     even when that review is 5 stars)
 *   - Requires avgRating ≥ 3.5 (don't surface a "wall of 2-star"
 *     splash — the static `recom` badge + BookingPanel are enough for
 *     those cases)
 *   - Feature is env-gated: `reviewsMeta === null` means either
 *     "Supabase not configured" OR "no published rows", both of which
 *     silence the card
 *
 * The card's render layer fetches full review bodies client-side from
 * `/api/reviews/[groupCode]`, so the scorer props stay small (meta only).
 * Scoring rewards volume, rating, verified share, and freshness.
 */

import type { ActivitySignals, ModuleScore, ReviewsMeta } from '../types'

const MIN_COUNT = 3
const MIN_RATING = 3.5

export type TestimonialsCuratedProps = {
  /** Group code (string per Atlantico; server route coerces to number). */
  groupCode: string
  meta: ReviewsMeta
  /** 'excellent' ≥ 4.6, 'strong' ≥ 4.2, 'mixed' ≥ 3.5. Drives visual tone. */
  tier: 'excellent' | 'strong' | 'mixed'
  /** Ratio 0-1 of verified reviews — nudges trust copy. */
  verifiedShare: number
  /** Rounded days since the most recent review — "last week", "last month". */
  daysSinceLast: number | null
}

function tierOf(rating: number): TestimonialsCuratedProps['tier'] {
  if (rating >= 4.6) return 'excellent'
  if (rating >= 4.2) return 'strong'
  return 'mixed'
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return null
  const now = Date.now()
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)))
}

export function testimonialsCuratedScorer(
  signals: ActivitySignals,
): ModuleScore | null {
  const meta = signals.reviewsMeta
  if (!meta) return null
  if (meta.count < MIN_COUNT) return null
  if (meta.avgRating < MIN_RATING) return null

  const verifiedShare = meta.count > 0 ? meta.verifiedCount / meta.count : 0
  const tier = tierOf(meta.avgRating)
  const freshnessDays = daysSince(meta.lastReviewAt)

  // --- Score ------------------------------------------------------
  // Baseline: "we have real social proof worth showing."
  let s = 58

  // Volume confidence — log-ish so a few reviews help, but 50+ doesn't
  // run away with the scoring bucket.
  s += Math.min(14, Math.round(Math.log2(Math.max(1, meta.count)) * 3))

  // Rating above the floor.
  s += Math.round((meta.avgRating - MIN_RATING) * 8) // 3.5 -> +0, 5.0 -> +12

  // Verified-booking share — big trust multiplier.
  if (verifiedShare >= 0.7) s += 8
  else if (verifiedShare >= 0.4) s += 4

  // Recency: reviews within the last 60 days feel "live."
  if (freshnessDays != null) {
    if (freshnessDays <= 30) s += 6
    else if (freshnessDays <= 90) s += 2
    else if (freshnessDays > 365) s -= 4
  }

  // Excellence bonus — genuine standout gets a little more weight so
  // it outranks companion-fit / family-fit on crowded pages.
  if (tier === 'excellent' && meta.count >= 10) s += 4

  s = Math.max(0, Math.min(90, s))

  return {
    id: 'testimonials-curated',
    score: s,
    slot: 'left-secondary',
    reason: `tier=${tier}, count=${meta.count}, avg=${meta.avgRating}, verified=${Math.round(verifiedShare * 100)}%, fresh=${freshnessDays ?? '—'}d`,
    props: {
      groupCode: signals.code,
      meta,
      tier,
      verifiedShare,
      daysSinceLast: freshnessDays,
    } satisfies TestimonialsCuratedProps,
  }
}
