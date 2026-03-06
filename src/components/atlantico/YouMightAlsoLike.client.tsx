'use client'

/**
 * "You might also like" - shows related tours from the same classification.
 * Small card layout, links to group-details.
 */

import { useEffect, useState } from 'react'
import { Link } from '@/navigation'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { ToursListCardImage } from '@/app/[locale]/debug/tours-list/ToursListCardImage.client'

type Tour = {
  id: string | number
  code: string
  name?: string
  desc?: string
  image?: string
  price?: number
  duration?: string | number
  ids?: (string | number)[]
}

interface YouMightAlsoLikeProps {
  code: string
  lang: string
  locale: string
}

export function YouMightAlsoLike({ code, lang, locale }: YouMightAlsoLikeProps) {
  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch(
      `/api/atlantico/related-tours?code=${encodeURIComponent(code)}&lang=${encodeURIComponent(lang)}`
    )
      .then((res) => (res.ok ? res.json() : { ok: false, tours: [] }))
      .then((data: { ok?: boolean; tours?: Tour[] }) => {
        if (!cancelled && data.ok && Array.isArray(data.tours)) {
          setTours(data.tours)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, lang])

  if (loading || tours.length === 0) return null

  return (
    <div className="mt-12 pt-8 border-t border-glass-200">
      <h2 className="text-xl font-bold text-glass-900 mb-4">You might also like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tours.map((t) => (
            <Link
              key={`${t.id}-${t.code}`}
              href={`/debug/group-details?code=${encodeURIComponent(String(t.code))}`}
              className="block rounded-xl border border-glass-200 overflow-hidden bg-white hover:shadow-md hover:border-ocean-200 transition-all"
            >
              <div className="relative w-full aspect-[4/3] bg-glass-100 overflow-hidden">
                {t.code ? (
                  <ToursListCardImage
                    code={t.code}
                    alt={t.name || 'Tour'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-glass-400 text-xs">
                    No image
                  </div>
                )}
              </div>
              <div className="p-2.5 space-y-1">
                <h3 className="text-sm font-semibold text-glass-900 line-clamp-2">
                  {decodeTextFromApi(t.name) || `Tour ${t.code}`}
                </h3>
                <div className="flex items-center justify-between text-xs text-glass-600">
                  {t.price != null && !Number.isNaN(t.price) ? (
                    <span className="font-semibold text-glass-900">
                      €{Number(t.price).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-glass-400">—</span>
                  )}
                  {t.duration != null && (
                    <span className="bg-glass-100 px-1.5 py-0.5 rounded text-[10px] text-glass-700">
                      {t.duration}h
                    </span>
                  )}
                </div>
              </div>
            </Link>
        ))}
      </div>
    </div>
  )
}
