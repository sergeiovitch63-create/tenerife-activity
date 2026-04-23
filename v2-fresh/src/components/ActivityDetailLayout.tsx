'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Zap, ShieldCheck, Clock, MapPin, XCircle } from 'lucide-react'
import type { AtlanticoEvent, AtlanticoGroup, ParsedPrice } from '@/lib/atlantico/types'
import type { Dict } from '@/i18n/dictionaries/fr'
import type { Locale } from '@/lib/locale'
import type { FaqSections } from '@/lib/faq-parser'
import { sanitizeRichText } from '@/lib/atlantico/normalize'
import { formatPrice } from '@/lib/utils'
import BookingPanel from './BookingPanel'
import OptionCard from './OptionCard'
import { extractSignals } from '@/lib/personalize/signals'
import { composePage } from '@/lib/personalize/compose'
import { REGISTRY } from '@/lib/personalize/registry'
import { MODULE_RENDERERS } from './modules/renderers'
import type { ModuleScore, ReviewsMeta } from '@/lib/personalize/types'

type Props = {
  group: AtlanticoGroup
  events: AtlanticoEvent[]
  faq: FaqSections
  initialPrices: Record<string, ParsedPrice | null>
  initialDate: string
  nextDates: Record<string, string | null>
  reviewsMeta?: ReviewsMeta | null
  t: Dict
  locale: Locale
}

type ViewMode = 'options' | 'booking'

export default function ActivityDetailLayout({
  group, events, faq, initialPrices, initialDate, nextDates, reviewsMeta = null, t, locale,
}: Props) {
  const [selectedCode, setSelectedCode] = useState<string>(events[0]?.code ?? '')
  const [viewMode, setViewMode] = useState<ViewMode>('options')
  const rightColRef = useRef<HTMLDivElement>(null)

  // Personalization: extract signals + compose modules once per activity
  const composed = useMemo(() => {
    const signals = extractSignals(group, events, reviewsMeta)
    return composePage(signals, REGISTRY)
  }, [group, events, reviewsMeta])

  const renderSlot = (slot: keyof typeof composed.modulesBySlot) =>
    composed.modulesBySlot[slot].map((s: ModuleScore) => {
      const render = MODULE_RENDERERS[s.id]
      if (!render) return null
      return (
        <div key={s.id}>
          {render({ signals: composed.signals, score: s, locale })}
        </div>
      )
    })

  const scrollToRight = () => {
    // On mobile, scroll to the right panel; on desktop it's sticky so minimal effect
    rightColRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#booking-panel') {
      setViewMode('booking')
      setTimeout(() => scrollToRight(), 200)
    }
  }, [])

  const handleSelectOption = (code: string) => {
    setSelectedCode(code)
    setViewMode('booking')
    scrollToRight()
  }

  const handleBackToOptions = () => {
    setViewMode('options')
  }

  const selectedPrice = initialPrices[selectedCode]?.adult ?? 0

  return (
    <>
      {/* Banner slot — full-width advisories (calima, weather warnings, etc.) */}
      {composed.modulesBySlot.banner.length > 0 && (
        <div className="container-x mt-6 space-y-3">{renderSlot('banner')}</div>
      )}

      <div className="container-x mt-10 grid lg:grid-cols-[1.5fr_1fr] gap-10">
        {/* LEFT — content */}
        <div className="min-w-0 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoChip Icon={Zap} label={t.activity.instantConfirm} />
            <InfoChip Icon={ShieldCheck} label={t.activity.freeCancellation} />
            {group.duration && (
              <InfoChip Icon={Clock} label={t.activity.duration} value={`${group.duration} h`} />
            )}
            <InfoChip Icon={MapPin} label="Tenerife" />
          </div>

          {/* Primary personalized modules (top of the page, highest priority) */}
          {composed.modulesBySlot['left-primary'].length > 0 && (
            <div className="space-y-4">{renderSlot('left-primary')}</div>
          )}

          {group.willDo && (
            <section>
              <h2 className="h-display text-2xl mb-4">{t.activity.whatYouWillDo}</h2>
              <div
                className="rich-text"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(group.willDo) }}
              />
            </section>
          )}

          {group.desc && (
            <section>
              <h2 className="h-display text-2xl mb-4">{t.activity.description}</h2>
              <div
                className="rich-text"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(group.desc) }}
              />
            </section>
          )}

          {/* Secondary personalized modules (packing list, accessibility, etc.) */}
          {composed.modulesBySlot['left-secondary'].length > 0 && (
            <div className="space-y-4">{renderSlot('left-secondary')}</div>
          )}

          {group.faq && (
            <section>
              <h2 className="h-display text-2xl mb-4">{t.activity.details}</h2>
              <div
                className="rich-text"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(group.faq) }}
              />
            </section>
          )}

          {group.canDesc && (
            <section>
              <h2 className="h-display text-2xl mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-ocean-600" />
                {group.canTitle || t.activity.cancellation}
              </h2>
              <div
                className="rich-text"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(group.canDesc) }}
              />
            </section>
          )}

          {group.video && (
            <section>
              <div className="aspect-video rounded-2xl overflow-hidden border border-ink-100">
                <iframe
                  src={group.video}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {/* Tertiary personalized modules (lower-priority extras) */}
          {composed.modulesBySlot['left-tertiary'].length > 0 && (
            <div className="space-y-4">{renderSlot('left-tertiary')}</div>
          )}
        </div>

        {/* RIGHT — toggle between options list and booking panel */}
        <aside ref={rightColRef} className="lg:sticky lg:top-20 lg:self-start">
          {viewMode === 'options' ? (
            <div className="space-y-4">
              <div className="pb-2">
                <h2 className="font-display font-bold text-xl text-ink-900">
                  {events.length === 1
                    ? group.name
                    : t.activity.chooseFromOptions.replace('{n}', String(events.length))}
                </h2>
              </div>
              {events.map((event) => (
                <OptionCard
                  key={event.code}
                  event={event}
                  price={initialPrices[event.code] ?? null}
                  faq={faq}
                  isSelected={event.code === selectedCode}
                  onSelect={handleSelectOption}
                  nextAvailableDate={nextDates[event.code] ?? null}
                  t={t}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <BookingPanel
              group={group}
              events={events}
              selectedEventCode={selectedCode}
              onSelectEvent={setSelectedCode}
              initialPrices={initialPrices}
              initialDate={initialDate}
              t={t}
              locale={locale}
              onBack={handleBackToOptions}
            />
          )}

          {/* Inline personalized reassurance (trust, value, operator, rhythm) */}
          {composed.modulesBySlot['right-inline'].length > 0 && (
            <div className="mt-4 space-y-3">{renderSlot('right-inline')}</div>
          )}
        </aside>
      </div>

      <StickyMobileCta
        price={selectedPrice}
        label={viewMode === 'options' ? t.activity.seeAvailability : t.activity.book}
        fromLabel={t.activity.from}
        perAdult={t.activity.perAdult}
        onClick={viewMode === 'options' ? () => handleSelectOption(selectedCode) : scrollToRight}
        locale={locale}
      />
    </>
  )
}

function InfoChip({
  Icon, label, value,
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3">
      <Icon className="w-4 h-4 text-ocean-600 mb-1.5" />
      <div className="text-[11px] text-ink-500 uppercase tracking-wide font-semibold">{label}</div>
      {value && <div className="text-xs text-ink-800 mt-0.5">{value}</div>}
    </div>
  )
}

function StickyMobileCta({
  price, label, fromLabel, perAdult, onClick, locale,
}: {
  price: number
  label: string
  fromLabel: string
  perAdult: string
  onClick: () => void
  locale: Locale
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!visible) return null
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-ink-100 shadow-card lg:hidden">
      <div className="container-x py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-ink-500 uppercase tracking-wide">{fromLabel}</p>
          <p className="text-lg font-display font-bold text-ink-900 truncate">
            {price > 0 ? formatPrice(price, locale) : '—'}
            <span className="text-xs font-normal text-ink-500 ml-1">{perAdult}</span>
          </p>
        </div>
        <button
          onClick={onClick}
          className="btn-ember px-5 py-3 text-sm whitespace-nowrap"
        >
          {label}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
