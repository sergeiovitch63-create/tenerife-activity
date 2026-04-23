'use client'

import LocaleLink from './LocaleLink'
import { Clock, MapPin, ShieldCheck, Zap, Calendar } from 'lucide-react'
import type { AtlanticoGroup } from '@/lib/atlantico/types'
import { useI18n } from '@/i18n/context'
import { formatPrice } from '@/lib/utils'
import { cleanText } from '@/lib/atlantico/normalize'
import { coverImage } from '@/lib/atlantico/images'
import { localeIntl } from '@/lib/locale'

export default function ActivityCard({
  group,
  compact = false,
  coverOverride,
  nextDate,
}: {
  group: AtlanticoGroup
  compact?: boolean
  coverOverride?: string | null
  nextDate?: string | null
}) {
  const { t, locale } = useI18n()
  const price = group.price ? parseFloat(group.price) : null
  const duration = group.duration ? `${group.duration} h` : null
  const img = coverOverride ?? coverImage(group)
  const nextLabel = nextDate
    ? new Intl.DateTimeFormat(localeIntl(locale), {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(new Date(nextDate))
    : null

  return (
    <LocaleLink
      href={`/activite/${group.code}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-ink-100 hover:border-ink-200 hover:shadow-card transition-all duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        {img ? (
          <img
            src={img}
            alt={group.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-ocean-100 to-ember-100" />
        )}
        <div className="absolute inset-x-3 bottom-3 flex gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-ink-800">
            <Zap className="w-3 h-3 text-ember-500" /> {t.activity.instantConfirm}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-ink-800">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> {t.activity.freeCancellation}
          </span>
        </div>
      </div>
      <div className={`p-4 flex-1 flex flex-col ${compact ? 'gap-1' : 'gap-2'}`}>
        <div className="flex items-center gap-1.5 text-xs text-ink-500">
          <MapPin className="w-3 h-3" />
          <span>Tenerife</span>
          {duration && (
            <>
              <span className="text-ink-300">·</span>
              <Clock className="w-3 h-3" />
              <span>{duration}</span>
            </>
          )}
        </div>
        <h3 className="text-[15px] font-semibold leading-snug line-clamp-2 text-ink-900 group-hover:text-ocean-700 transition-colors">
          {group.name}
        </h3>
        {!compact && group.desc && (
          <p className="text-sm text-ink-500 line-clamp-2">{cleanText(group.desc)}</p>
        )}
        {nextLabel && (
          <div className="inline-flex items-center gap-1.5 text-xs text-ocean-700 font-medium mt-2 capitalize">
            <Calendar className="w-3 h-3" />
            <span className="text-ink-500 normal-case">{t.activity.nextAvailable}:</span>
            <span>{nextLabel}</span>
          </div>
        )}
        <div className="mt-auto pt-3 flex items-end justify-between">
          <span className="text-xs text-ink-500">{t.activity.from}</span>
          {price !== null && (
            <div className="text-right">
              <div className="text-lg font-display font-bold text-ink-900">
                {formatPrice(price, locale)}
                <span className="text-xs font-normal text-ink-500"> {t.activity.perPerson}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </LocaleLink>
  )
}
