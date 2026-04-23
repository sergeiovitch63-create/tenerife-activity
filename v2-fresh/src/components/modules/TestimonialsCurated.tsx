'use client'

/**
 * Testimonials-Curated card — social proof powered by Supabase reviews.
 *
 * Left-secondary card. Shows aggregate (avg rating, count, verified
 * share) immediately from signals, then lazy-loads up to 3 full reviews
 * from `/api/reviews/[groupCode]` on first paint. If the fetch 503s
 * (Supabase env missing / no published rows) we fall back to the
 * aggregate-only view — the card doesn't vanish mid-render.
 *
 * The aggregate always has ≥ 3 reviews (scorer gate), so the card is
 * never empty-looking even before the fetch resolves.
 *
 * Scorer: `src/lib/personalize/scorers/testimonials-curated.ts`
 */

import { useEffect, useState } from 'react'
import { Star, BadgeCheck, Quote, ShieldCheck } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type { TestimonialsCuratedProps } from '@/lib/personalize/scorers/testimonials-curated'
import type { Review } from '@/lib/reviews/client'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

const TIER_STYLE: Record<
  TestimonialsCuratedProps['tier'],
  { ring: string; chip: string; header: string }
> = {
  excellent: {
    ring: 'ring-emerald-200 border-emerald-200/70',
    chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    header: 'from-emerald-500 to-teal-600',
  },
  strong: {
    ring: 'ring-sky-200 border-sky-200/70',
    chip: 'bg-sky-100 text-sky-800 ring-sky-200',
    header: 'from-sky-500 to-blue-600',
  },
  mixed: {
    ring: 'ring-amber-200 border-amber-200/70',
    chip: 'bg-amber-100 text-amber-800 ring-amber-200',
    header: 'from-amber-500 to-orange-600',
  },
}

export function TestimonialsCuratedCard({
  score: moduleScore,
  locale,
}: Props) {
  const props = moduleScore.props as TestimonialsCuratedProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const style = TIER_STYLE[props.tier]

  const [items, setItems] = useState<Review[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const url = `/api/reviews/${encodeURIComponent(props.groupCode)}?locale=${encodeURIComponent(locale)}&limit=3`
        const res = await fetch(url, { cache: 'force-cache' })
        if (!res.ok) {
          if (!cancelled) setFailed(true)
          return
        }
        const body: { items: Review[] } = await res.json()
        if (!cancelled) setItems(body.items)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [props.groupCode, locale])

  const freshnessLabel =
    props.daysSinceLast == null
      ? null
      : props.daysSinceLast <= 30
        ? labels.freshRecent
        : props.daysSinceLast <= 90
          ? labels.freshQuarter
          : labels.freshOlder

  const verifiedPct = Math.round(props.verifiedShare * 100)

  return (
    <div
      className={`rounded-3xl border bg-white p-5 shadow-sm ring-1 ${style.ring}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 rounded-2xl bg-gradient-to-br ${style.header} p-2.5 shadow-sm`}
        >
          <Quote className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-neutral-900">{labels.title}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-neutral-700">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star
                className="h-4 w-4 fill-amber-400 text-amber-400"
                strokeWidth={2}
              />
              {props.meta.avgRating.toFixed(1)}
            </span>
            <span className="text-neutral-500">
              · {props.meta.count} {labels.reviewsLabel}
            </span>
            {freshnessLabel && (
              <span className="text-neutral-400">· {freshnessLabel}</span>
            )}
          </div>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${style.chip}`}
        >
          {labels[`tier_${props.tier}`] ?? props.tier}
        </span>
      </div>

      {/* Verified trust strip */}
      {verifiedPct >= 40 && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
          {labels.verifiedBookings.replace('{pct}', String(verifiedPct))}
        </div>
      )}

      {/* Quotes */}
      <div className="mt-4 space-y-3">
        {items === null && !failed && <SkeletonRows />}
        {items !== null && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((r) => (
              <ReviewQuote key={r.id} review={r} labels={labels} />
            ))}
          </ul>
        )}
        {(failed || (items !== null && items.length === 0)) && (
          <p className="text-xs text-neutral-500">{labels.fallbackHint}</p>
        )}
      </div>
    </div>
  )
}

function SkeletonRows() {
  return (
    <ul className="space-y-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3"
        >
          <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-neutral-200" />
          <div className="mt-1 h-3 w-4/5 animate-pulse rounded bg-neutral-200" />
        </li>
      ))}
    </ul>
  )
}

function ReviewQuote({
  review,
  labels,
}: {
  review: Review
  labels: Record<string, string>
}) {
  return (
    <li className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-3">
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-0.5 text-amber-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < review.rating ? 'fill-amber-400' : 'text-neutral-300'
              }`}
              strokeWidth={2}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-neutral-900">
          {review.author_name}
        </span>
        {review.author_country && (
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">
            {review.author_country}
          </span>
        )}
        {review.verified && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700">
            <BadgeCheck className="h-3 w-3" strokeWidth={2.5} />
            {labels.verified}
          </span>
        )}
      </div>
      {review.title && (
        <p className="mt-1.5 text-xs font-bold text-neutral-900">
          {review.title}
        </p>
      )}
      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-neutral-700">
        {review.body}
      </p>
    </li>
  )
}

// --- i18n ---------------------------------------------------------
const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Ce que disent les voyageurs',
    reviewsLabel: 'avis',
    verified: 'vérifié',
    verifiedBookings: '{pct}% issus de réservations confirmées',
    freshRecent: 'avis récent',
    freshQuarter: 'avis du trimestre',
    freshOlder: 'sur plusieurs mois',
    fallbackHint: 'Chargement des témoignages indisponible.',
    tier_excellent: 'Excellent',
    tier_strong: 'Très bon',
    tier_mixed: 'Correct',
  },
  en: {
    title: 'What travellers say',
    reviewsLabel: 'reviews',
    verified: 'verified',
    verifiedBookings: '{pct}% from confirmed bookings',
    freshRecent: 'recent review',
    freshQuarter: 'this quarter',
    freshOlder: 'over several months',
    fallbackHint: 'Review loading unavailable.',
    tier_excellent: 'Excellent',
    tier_strong: 'Strong',
    tier_mixed: 'Decent',
  },
  es: {
    title: 'Lo que dicen los viajeros',
    reviewsLabel: 'opiniones',
    verified: 'verificada',
    verifiedBookings: '{pct}% de reservas confirmadas',
    freshRecent: 'opinión reciente',
    freshQuarter: 'este trimestre',
    freshOlder: 'a lo largo de meses',
    fallbackHint: 'Carga de testimonios no disponible.',
    tier_excellent: 'Excelente',
    tier_strong: 'Muy bueno',
    tier_mixed: 'Aceptable',
  },
  de: {
    title: 'Was Reisende sagen',
    reviewsLabel: 'Bewertungen',
    verified: 'verifiziert',
    verifiedBookings: '{pct}% aus bestätigten Buchungen',
    freshRecent: 'aktuelle Bewertung',
    freshQuarter: 'dieses Quartal',
    freshOlder: 'über mehrere Monate',
    fallbackHint: 'Bewertungen konnten nicht geladen werden.',
    tier_excellent: 'Exzellent',
    tier_strong: 'Stark',
    tier_mixed: 'Akzeptabel',
  },
  it: {
    title: 'Cosa dicono i viaggiatori',
    reviewsLabel: 'recensioni',
    verified: 'verificata',
    verifiedBookings: '{pct}% da prenotazioni confermate',
    freshRecent: 'recensione recente',
    freshQuarter: 'di questo trimestre',
    freshOlder: 'su più mesi',
    fallbackHint: 'Caricamento delle testimonianze non disponibile.',
    tier_excellent: 'Eccellente',
    tier_strong: 'Ottimo',
    tier_mixed: 'Discreto',
  },
  ru: {
    title: 'Что говорят путешественники',
    reviewsLabel: 'отзывов',
    verified: 'проверено',
    verifiedBookings: '{pct}% с подтверждённых бронирований',
    freshRecent: 'свежий отзыв',
    freshQuarter: 'за квартал',
    freshOlder: 'за несколько месяцев',
    fallbackHint: 'Загрузка отзывов недоступна.',
    tier_excellent: 'Отлично',
    tier_strong: 'Очень хорошо',
    tier_mixed: 'Нормально',
  },
}
