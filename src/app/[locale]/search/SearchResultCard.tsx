'use client'

import { Link } from '@/navigation'
import { ToursListCardImage } from '@/app/[locale]/debug/tours-list/ToursListCardImage.client'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'

interface SearchResultCardProps {
  code: string
  name: string
  desc?: string
  price?: number
  duration?: string
}

/**
 * Same card design as /activite/[slug] (e.g. /activite/vip-tours)
 */
export function SearchResultCard({
  code,
  name,
  desc,
  price,
  duration,
}: SearchResultCardProps) {
  const href = `/activite/group-details?code=${encodeURIComponent(code)}`

  return (
    <Link
      href={href}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded-2xl"
    >
      <article className="glass-panel rounded-2xl border border-glass-200 overflow-hidden flex flex-col bg-white/90 hover:shadow-lg hover:-translate-y-1 smooth-transition cursor-pointer h-full">
        <div className="relative w-full aspect-[4/3] bg-glass-100 overflow-hidden">
          <ToursListCardImage
            code={code}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
          <h2 className="text-lg font-semibold text-glass-900 line-clamp-2">
            {name}
          </h2>
          {desc ? (
            <p className="text-sm text-glass-700 leading-relaxed line-clamp-4">
              {decodeTextFromApi(desc)}
            </p>
          ) : (
            <p className="text-sm text-glass-400 italic">
              Aucune description.
            </p>
          )}
          <div className="mt-auto flex items-center justify-between gap-4 text-base font-semibold text-glass-900">
            <span>
              {duration ? `⏱ ${duration} h` : '\u00A0'}
            </span>
            {price !== undefined && !Number.isNaN(price) && price > 0 ? (
              <span className="text-right">
                À partir de {Number(price).toFixed(2)} €
              </span>
            ) : (
              <span className="text-right italic text-glass-400 font-normal">
                Prix non disponible
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
