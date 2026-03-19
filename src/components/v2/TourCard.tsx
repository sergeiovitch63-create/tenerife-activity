'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { formatDuration, toImageUrl } from '@/lib/atlantico'
import type { ApiTour } from '@/lib/atlantico.types'

type TourCardProps = {
  tour: ApiTour
  locale: string
}

const fromLabel = (locale: string): string => {
  const map: Record<string, string> = {
    en: 'From',
    fr: 'Dès',
    de: 'Ab',
    it: 'Da',
    es: 'Desde',
  }
  return map[locale] ?? 'From'
}

const formatPrice = (raw: string, locale: string): string => {
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value) || value <= 0) return '—'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

const cleanText = (text: string): string =>
  text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export default function TourCard({ tour, locale }: TourCardProps) {
  const [imageError, setImageError] = useState(false)
  const image = useMemo(() => toImageUrl(tour.image), [tour.image])
  const title = cleanText(tour.name || 'Excursion')
  const desc = cleanText(tour.desc || '')
  const duration = formatDuration(tour.duration || '')
  const price = formatPrice(tour.price || '', locale)

  return (
    <Link
      href={`/${locale}/v2/tour/${encodeURIComponent(tour.code)}`}
      className="group block rounded-2xl border border-glass-200 bg-white/90 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-gradient-to-br from-glass-100 to-glass-200">
        {!imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-glass-100 to-glass-300 text-4xl">
            <span aria-hidden>🏝️</span>
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <h3 className="line-clamp-2 text-xl font-semibold text-glass-900 transition-colors group-hover:text-ocean-700">
          {title}
        </h3>
        <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-glass-600">{desc || '...'}</p>
        <div className="flex items-center justify-between border-t border-glass-100 pt-3">
          <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-medium text-ocean-700">{duration || '—'}</span>
          <span className="text-base font-semibold text-ocean-700">
            {fromLabel(locale)} {price}
          </span>
        </div>
      </div>
    </Link>
  )
}

