'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'

type Group = {
  id?: string | number
  Code?: string
  code?: string
  name?: string
  price?: string | number
  duration?: string | number
  image?: string
  ids?: string | number | string[] | number[]
  [key: string]: unknown
}

type GroupDetails = {
  id?: string | number
  Code?: string
  code?: string
  name?: string
  Name?: string
  price?: string | number
  image?: string
  desc?: string
  description?: string
  ids?: string | number | string[] | number[]
  [key: string]: unknown
}

interface GroupCardProps {
  group: Group
  details: GroupDetails | null
  groupKey: string
  locale: string
  eventIdsCount: number
}

function formatPrice(price: string | number | undefined): string {
  if (price === undefined || price === null) return ''
  const num = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(num) || num <= 0) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDuration(duration: string | number | undefined): string {
  if (duration === undefined || duration === null) return ''
  const num = typeof duration === 'string' ? parseFloat(duration) : duration
  if (isNaN(num) || num <= 0) return ''
  if (num < 1) return `${Math.round(num * 60)} min`
  if (num === 1) return '1 hour'
  return `${num} hours`
}

export function GroupCard({ group, details, groupKey, locale, eventIdsCount }: GroupCardProps) {
  const t = useTranslations('common')
  const imageUrl = group.image || details?.image || null
  const title = group.name || details?.name || details?.Name || '—'
  const price = group.price ?? details?.price
  const duration = group.duration ?? details?.duration
  const hasEvents = eventIdsCount > 0

  return (
    <Link
      href={`/${locale}/catalog/${encodeURIComponent(groupKey)}`}
      className="block bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-200 group"
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-ocean-100 to-ocean-200">
        {imageUrl ? (
          <Image
            src={String(imageUrl)}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              // Fallback to gradient on error
              const target = e.currentTarget
              target.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-ocean-300 text-sm font-medium">{t('noImage')}</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 md:p-5">
        {/* Title */}
        <h3 className="text-lg md:text-xl font-semibold text-glass-900 mb-2 line-clamp-2 leading-tight group-hover:text-ocean-600 transition-colors">
          {title}
        </h3>

        {/* Meta Row */}
        <div className="flex items-center justify-between text-xs text-glass-500 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            {duration != null && (
              <span className="flex items-center gap-1">
                <span>⏱</span>
                <span>{formatDuration(duration as string | number | undefined)}</span>
              </span>
            )}
            {hasEvents && (
              <span className="flex items-center gap-1">
                <span>📅</span>
                <span>{eventIdsCount} {eventIdsCount === 1 ? 'option' : 'options'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Price & CTA */}
        <div className="pt-3 border-t border-glass-100">
          <div className="flex items-center justify-between">
            <div>
              {price ? (
                <span className="text-base md:text-lg font-bold text-ocean-600">
                  From {formatPrice(price)}
                </span>
              ) : (
                <span className="text-sm text-glass-500">{t('priceOnRequest')}</span>
              )}
            </div>
            <span className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg group-hover:bg-ocean-700 transition-colors">
              View
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}














