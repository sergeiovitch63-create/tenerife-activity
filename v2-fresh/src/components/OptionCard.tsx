'use client'

import { ArrowRight, CheckCircle2, XCircle, Calendar, MapPin } from 'lucide-react'
import type { AtlanticoEvent, ParsedPrice } from '@/lib/atlantico/types'
import type { FaqSections } from '@/lib/faq-parser'
import type { Dict } from '@/i18n/dictionaries/fr'
import type { Locale } from '@/lib/locale'
import { formatPrice } from '@/lib/utils'
import { sanitizeRichText } from '@/lib/atlantico/normalize'
import { iconFor, iconLabel } from '@/data/icons'
import { localeIntl } from '@/lib/locale'

type Props = {
  event: AtlanticoEvent
  price: ParsedPrice | null
  faq: FaqSections
  isSelected: boolean
  onSelect: (eventCode: string) => void
  nextAvailableDate: string | null
  t: Dict
  locale: Locale
}

export default function OptionCard({
  event,
  price,
  faq,
  isSelected,
  onSelect,
  nextAvailableDate,
  t,
  locale,
}: Props) {
  const adultPrice = price?.adult ?? 0
  const icons = (event.icons ?? []).slice(0, 6)

  const nextLabel = nextAvailableDate
    ? new Intl.DateTimeFormat(localeIntl(locale), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date(nextAvailableDate))
    : null

  return (
    <div
      className={`relative rounded-2xl border-2 bg-white transition-all overflow-hidden ${
        isSelected
          ? 'border-brand-turquoise-500 shadow-card ring-2 ring-brand-turquoise-200'
          : 'border-ink-100 hover:border-ink-200 hover:shadow-soft'
      }`}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <h3 className="font-display font-bold text-lg text-ink-900 leading-tight">
          {event.name}
        </h3>
      </div>

      {/* Icons chips (compact row) */}
      {icons.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {icons.map((raw, i) => {
              const Icon = iconFor(raw)
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-turquoise-50 border border-brand-turquoise-100 px-2 py-0.5 text-[11px] font-medium text-brand-turquoise-800"
                >
                  <Icon className="w-3 h-3" />
                  {iconLabel(raw, locale)}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Itinerary / description (from event.desc) */}
      {event.desc && (
        <div className="px-5 pb-4 border-t border-ink-100 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700 mb-2">
            <MapPin className="w-3.5 h-3.5" />
            {t.activity.route}
          </div>
          <div
            className="rich-text text-sm"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(event.desc) }}
          />
        </div>
      )}

      {/* Next available date */}
      {nextLabel && (
        <div className="px-5 pb-4 border-t border-ink-100 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700 mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {t.activity.nextAvailable}
          </div>
          <p className="text-sm font-semibold text-brand-turquoise-700 capitalize">
            {nextLabel}
          </p>
        </div>
      )}

      {/* Included / Not included (shared from group.faq) */}
      {(faq.included.length > 0 || faq.notIncluded.length > 0) && (
        <div className="px-5 pb-4 border-t border-ink-100 pt-4 space-y-3">
          {faq.included.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1.5">
                {t.activity.included}
              </p>
              <ul className="space-y-1">
                {faq.included.slice(0, 5).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {faq.notIncluded.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold-700 mb-1.5">
                {t.activity.notIncluded}
              </p>
              <ul className="space-y-1">
                {faq.notIncluded.slice(0, 4).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-500">
                    <XCircle className="w-3.5 h-3.5 text-ink-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Price + CTA */}
      <div className="border-t border-ink-100 p-4 flex items-center justify-between gap-3 bg-ink-50/50">
        <div className="min-w-0">
          <p className="text-[11px] text-ink-500 uppercase tracking-wide">{t.activity.from}</p>
          {adultPrice > 0 ? (
            <p className="text-xl font-display font-bold text-ink-900 leading-tight">
              {formatPrice(adultPrice, locale)}
              <span className="text-xs font-normal text-ink-500 ml-1">{t.activity.perAdult}</span>
            </p>
          ) : (
            <p className="text-sm text-ink-500">вЂ”</p>
          )}
        </div>
        <button
          onClick={() => onSelect(event.code)}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all ${
            isSelected
              ? 'bg-brand-turquoise-600 text-white hover:bg-brand-turquoise-700'
              : 'bg-ink-900 text-white hover:bg-ink-800'
          }`}
        >
          {t.activity.seeAvailability}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/** Weekly schedule вЂ” one row per day (long names), with time or "вЂ”" */
export function ScheduleGrid({ event, t }: { event: AtlanticoEvent; t: Dict }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white divide-y divide-ink-100 overflow-hidden">
      {t.activity.days.long.map((dayName, i) => {
        const off = event.days[i] === 0
        const time = event.times?.[i] ?? '-'
        const noTime = !time || time === '-' || time === '00:00'
        const closed = off || noTime
        return (
          <div
            key={i}
            className={`flex items-center justify-between px-3 py-2 text-sm ${
              closed ? 'text-ink-400' : 'text-ink-900'
            }`}
          >
            <span className="font-medium">{dayName}</span>
            <span className={`font-semibold ${closed ? '' : 'text-brand-turquoise-700'}`}>
              {closed ? 'вЂ”' : time}
            </span>
          </div>
        )
      })}
    </div>
  )
}
