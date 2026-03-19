'use client'

/**
 * Debug 508 layout - Matches production activities/508 screenshots exactly:
 * - Horizontal banner hero
 * - Tabs: Overview, What's Included, Cancellation Policy
 * - Left: ITINERARY (> format) + tab content + Option cards (eventDetails)
 * - Right: Manage your booking (Duration, Starting From, calendar)
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from '@/navigation'
import { ActivityBookingPanel } from '@/components/activities/ActivityBookingPanel'
import { decodeTextFromApi, sanitizeAtlanticoHtml } from '@/lib/atlantico/htmlAssets'
import { FaqSections } from '@/components/atlantico/FaqSections'
import { Accordion } from '@/app/[locale]/activities/[slug]/components/Accordion'
import { GroupDetailsHeroCarousel } from './GroupDetailsHeroCarousel.client'
import { YouMightAlsoLike } from '@/components/atlantico/YouMightAlsoLike.client'
import { isCombinationEvent } from '@/config/combination-tours'
import { isDateRangeGroup } from '@/config/date-range-tours'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/request'
import { getAtlanticoTranslation } from '@/lib/translations/atlantico-full'
type EventOption = {
  eventId: string
  name: string
  desc: string
  price: number | null
  childPrice: number | null
  infantPrice: number | null
  features: string[]
  times?: string[]
  /** Raw hicon strings from API: "0_hicon-drinks", "1_hicon-free_bus" */
  hiconIcons?: string[]
  raw?: Record<string, unknown>
}

interface GroupDetails508LuxLayoutProps {
  heroUrl: string | null
  galleryUrls?: string[]
  name: string
  code: string
  duration?: string | number
  price?: string | number
  desc?: string
  itinerary?: string
  willDo?: string
  faq?: string
  cancellationPolicy?: string
  childAge?: string
  infantAge?: string
  eventIds: string[]
  locale: string
  lang: string
}

const DESCRIPTION_TRUNCATE = 180
const CONTACT_FOR_PRICING_CODES = new Set(['53', '127', '165', '166', '189', '306'])

/** Parse hicon: "0_hicon-drinks" -> { included: false, key: "drinks" }, "1_hicon-free_bus" -> { included: true, key: "free_bus" } */
function parseHiconIcons(icons: string[]): { included: string[]; notIncluded: string[] } {
  const included: string[] = []
  const notIncluded: string[] = []
  for (const s of icons) {
    const str = String(s).trim()
    const m = str.match(/^([01])_hicon-(.+)$/i) || str.match(/^([01])_xhicon-(.+)$/i)
    if (m) {
      const key = m[2].replace(/[_-]/g, '_').toLowerCase()
      if (m[1] === '1') included.push(key)
      else notIncluded.push(key)
    }
  }
  return { included, notIncluded }
}

const iconClass = 'w-6 h-6 text-ocean-500 flex-shrink-0'
// HICON_LABELS will be replaced with translations in the component
const HICON_SVG: Record<string, JSX.Element> = {
  drinks: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  ),
  eat: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  teleferico: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-2a4 4 0 014-4h10a4 4 0 014 4v2M7 17v-2m10 0v2M3 7l9 4 9-4M12 21V7" />
    </svg>
  ),
  free_bus: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  ),
  interprete: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  ),
  punto_interes: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  paisaje: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  telescopio: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  observatorio: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  boat: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  swiming: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  discapacitados: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6a2 2 0 100 4 2 2 0 000-4zm0 6c-2.2 0-4 1.8-4 4v4h2v-4c0-1.1.9-2 2-2s2 .9 2 2v4h2v-4c0-2.2-1.8-4-4-4zm-2 2H6v6h4v-6zm6 0h4v6h-4v-6z" />
    </svg>
  ),
}

const FALLBACK_ICON = (
  <svg className="w-5 h-5 text-ocean-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
)

function getHiconLabel(iconKey: string, tIcons: (key: string) => string): string {
  const norm = iconKey.replace(/[.-]/g, '_').toLowerCase()
  return tIcons(norm) || iconKey.replace(/[_-]/g, ' ')
}

function HiconIcon({ iconKey }: { iconKey: string }) {
  const norm = iconKey.replace(/[.-]/g, '_').toLowerCase()
  return HICON_SVG[norm] ?? FALLBACK_ICON
}

function stripHtml(html: string): string {
  const decoded = decodeTextFromApi(html || '')
  return decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function translateAgeLabels(text: string, locale: string): string {
  const lang = (locale || 'en').toLowerCase().slice(0, 2)
  const yearsByLocale: Record<string, string> = {
    en: 'years',
    fr: 'ans',
    de: 'Jahre',
    es: 'años',
    it: 'anni',
  }
  const childrenByLocale: Record<string, string> = {
    en: 'children',
    fr: 'enfants',
    de: 'Kinder',
    es: 'niños',
    it: 'bambini',
  }
  const adultsByLocale: Record<string, string> = {
    en: 'adults',
    fr: 'adultes',
    de: 'Erwachsene',
    es: 'adultos',
    it: 'adulti',
  }

  const years = yearsByLocale[lang] || yearsByLocale.en
  const children = childrenByLocale[lang] || childrenByLocale.en
  const adults = adultsByLocale[lang] || adultsByLocale.en

  return decodeTextFromApi(text)
    .replace(/\b(?:Niñ|Nin)(?:o|os)\b/gi, children)
    .replace(/\bAdult(?:o|os)\b/gi, adults)
    .replace(/\baños?\b/gi, years)
}

function OptionCard({
  option,
  isSelected,
  onSelect,
  groupCode,
  locale,
  tOptions,
  tLabels,
  tCta,
  tIcons,
  tFerry,
}: {
  option: EventOption
  isSelected: boolean
  onSelect: () => void
  groupCode?: string
  locale: string
  tOptions: (key: string) => string
  tLabels: (key: string) => string
  tCta: (key: string) => string
  tIcons: (key: string) => string
  tFerry: () => string
}) {
  const [expanded, setExpanded] = useState(false)
  const desc = translateAgeLabels(stripHtml(option.desc || ''), locale)
  const truncated = desc.length > DESCRIPTION_TRUNCATE && !expanded
  const displayDesc = truncated ? desc.slice(0, DESCRIPTION_TRUNCATE) + '...' : desc

  return (
    <div
      className={`border rounded-xl p-5 sm:p-6 transition-all ${
        isSelected ? 'border-ocean-500 ring-2 ring-ocean-200 bg-ocean-50/30' : 'border-glass-200 bg-white'
      }`}
    >
      <h3 className="text-lg sm:text-xl font-bold text-glass-900 mb-2 sm:mb-3">{translateAgeLabels(option.name, locale)}</h3>
      <div className="text-glass-700 text-sm sm:text-base leading-relaxed mb-3 sm:mb-4">
        {displayDesc}
        {truncated && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-ocean-600 hover:text-ocean-700 hover:underline ml-1 font-medium focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-1 rounded"
          >
            {tOptions('readMore')}
          </button>
        )}
      </div>
      {option.hiconIcons && option.hiconIcons.length > 0 ? (
        (() => {
          const { included, notIncluded } = parseHiconIcons(option.hiconIcons)
          const hasAny = included.length > 0 || notIncluded.length > 0
          if (!hasAny) return null
          return (
            <div className="border-t border-glass-200 pt-4 mt-4 space-y-3">
              {groupCode === '326' && (
                <p className="text-sm font-semibold text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  {tFerry()}
                </p>
              )}
              <p className="text-sm font-semibold text-ocean-700">{tOptions('includedTitle')}</p>
              {included.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-emerald-700">{tOptions('includedInPrice')}</p>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    {included.map((key, i) => (
                      <span key={`inc-${i}`} className="flex items-center gap-2 text-sm text-glass-800">
                        <HiconIcon iconKey={key} />
                        <span>{getHiconLabel(key, tIcons)}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
              {notIncluded.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-red-700">{tOptions('notIncludedInPrice')}</p>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    {notIncluded.map((key, i) => (
                      <span key={`nout-${i}`} className="flex items-center gap-2 text-sm text-glass-800">
                        <HiconIcon iconKey={key} />
                        <span>{getHiconLabel(key, tIcons)}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })()
      ) : option.features.length > 0 ? (
        <div className="border-t border-glass-200 pt-4 mt-4 space-y-3">
          {groupCode === '326' && (
            <p className="text-sm font-semibold text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
              {tFerry()}
            </p>
          )}
          <p className="text-sm font-semibold text-ocean-700">{tOptions('includedTitle')}</p>
          <p className="text-sm font-semibold text-emerald-700">{tOptions('includedInPrice')}</p>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {option.features.map((f, i) => (
              <span key={i} className="flex items-center gap-2 text-sm text-glass-800">
                <HiconIcon iconKey={f} />
                <span>{getHiconLabel(f, tIcons)}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-4 border-t border-glass-100">
        <div>
          <span className="text-xs text-glass-600">{tLabels('startingFrom')}</span>{' '}
          <span className="text-lg sm:text-xl font-bold text-glass-900">
            {option.price != null ? `€${option.price.toFixed(2)}` : '—'}
          </span>{' '}
          <span className="text-xs text-glass-600">{isDateRangeGroup(groupCode) ? tOptions('perDay') : (option.price != null && option.price > 200 ? tOptions('perQuantity') : tOptions('perPerson'))}</span>
        </div>
        <button
          type="button"
          onClick={onSelect}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-ocean-600 text-white font-semibold hover:bg-ocean-700 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 transition-colors"
        >
          {tCta('seeAvailability')}
        </button>
      </div>
    </div>
  )
}

export function GroupDetails508LuxLayout({
  heroUrl,
  galleryUrls = [],
  name,
  code,
  duration,
  itinerary,
  price,
  desc,
  willDo,
  faq,
  cancellationPolicy,
  childAge,
  infantAge,
  eventIds,
  locale,
  lang,
}: GroupDetails508LuxLayoutProps) {
  const t = useTranslations('groupDetails')
  const tLabels = useTranslations('groupDetails.labels')
  const tTabs = useTranslations('groupDetails.tabs')
  const tOverview = useTranslations('groupDetails.overview')
  const tDescription = useTranslations('groupDetails.description')
  const tIncluded = useTranslations('groupDetails.included')
  const tCancellation = useTranslations('groupDetails.cancellation')
  const tPrices = useTranslations('groupDetails.prices')
  const tOptions = useTranslations('groupDetails.options')
  const tManage = useTranslations('groupDetails.manage')
  const tCta = useTranslations('groupDetails.cta')
  const tIcons = useTranslations('groupDetails.icons')
  
  // No option pre-selected: Manage your booking appears only when user clicks Sélectionner
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [eventOptions, setEventOptions] = useState<EventOption[]>([])
  const ACCORDION_IDS = ['what-you-do', 'overview', 'description', 'included', 'cancellation', 'prices'] as const
  type AccordionId = (typeof ACCORDION_IDS)[number]
  const [isDesktop, setIsDesktop] = useState(false)
  const [openSectionsDesktop, setOpenSectionsDesktop] = useState<Set<AccordionId>>(
    () => new Set<AccordionId>()
  )
  const [openSectionMobile, setOpenSectionMobile] = useState<AccordionId | null>('prices')
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [optionsSectionInView, setOptionsSectionInView] = useState(false)
  const manageBookingRef = useRef<HTMLDivElement>(null)
  const optionsSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const apply = () => setIsDesktop(mql.matches)
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!isDesktop) return
    setOpenSectionsDesktop(new Set<AccordionId>(ACCORDION_IDS))
  }, [isDesktop])

  const isAccordionOpen = (id: AccordionId) =>
    isDesktop ? openSectionsDesktop.has(id) : openSectionMobile === id

  const toggleAccordion = (id: AccordionId) => {
    if (isDesktop) {
      setOpenSectionsDesktop((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return
    }
    setOpenSectionMobile((prev) => (prev === id ? null : id))
  }

  // lang from server is Atlantico format (ENG, ESP, etc.)
  const atlLang = lang || 'ENG'
  const durationStr = duration != null ? String(duration) : undefined
  const groupPriceNum = price != null ? (typeof price === 'number' ? price : parseFloat(String(price))) : undefined

  // Build events for ActivityBookingPanel from eventOptions or fallback
  const events = eventOptions.length > 0
    ? eventOptions.map((o) => ({ t_id: o.eventId, title: o.name }))
    : eventIds.map((eid) => ({ t_id: eid, title: `Option ${eid}` }))
  const currentEventId = selectedEventId || ''
  const selectedOption = eventOptions.find((o) => o.eventId === selectedEventId)
  const startingPrice = selectedOption?.price ?? groupPriceNum

  // Fetch eventDetails + prices for each event
  useEffect(() => {
    if (!eventIds.length) {
      setLoadingOptions(false)
      return
    }
    let cancelled = false
    const run = async () => {
      setLoadingOptions(true)
      let hiddenEventIds: string[] = []
      try {
        const visRes = await fetch('/api/backoffice/visibility')
        if (visRes.ok) {
          const vis = await visRes.json()
          hiddenEventIds = vis.hiddenEventIds || []
        }
      } catch {
        // Ignore
      }
      const today = new Date()
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      const results = await Promise.all(
        eventIds.map(async (eid): Promise<EventOption> => {
          try {
            const [detailsRes, pricesRes] = await Promise.all([
              fetch(`/api/atlantico/event-details?eventId=${encodeURIComponent(eid)}&lang=ENG`),
              fetch(`/api/atlantico/prices?eventId=${encodeURIComponent(eid)}&date=${encodeURIComponent(dateStr)}&lang=${encodeURIComponent(atlLang)}`),
            ])
            const details = detailsRes.ok
              ? ((await detailsRes.json()) as {
                  name?: string
                  desc?: string
                  icons?: string[]
                  times?: string[]
                  raw?: Record<string, unknown>
                })
              : null
            const pricesJson = pricesRes.ok
              ? ((await pricesRes.json()) as {
                  type?: string
                  adult?: number
                  child?: number
                  infant?: number
                  raw?: Record<string, unknown>
                  tiers?: Array<{ days: number; price: number }>
                })
              : null
            const baseName = decodeTextFromApi(details?.name) || `Option ${eid}`
            const baseDesc = decodeTextFromApi(details?.desc) || ''
            const loc = locale as Locale
            const eventName = getAtlanticoTranslation(code, loc, 'name', {
              eventId: String(eid),
              fallback: baseName,
            })
            const eventDesc = getAtlanticoTranslation(code, loc, 'desc', {
              eventId: String(eid),
              fallback: baseDesc,
            })
            let priceVal: number | null = null
            let childPriceVal: number | null = null
            let infantPriceVal: number | null = null
            if (pricesJson?.adult != null && typeof pricesJson.adult === 'number' && pricesJson.adult > 0) {
              priceVal = pricesJson.adult
            }
            // per_day (car rental): extract daily rate from first tier
            if (priceVal == null && pricesJson?.type === 'per_day' && Array.isArray(pricesJson.tiers) && pricesJson.tiers.length > 0) {
              const t = pricesJson.tiers[0]
              const rate = t.days > 0 ? t.price / t.days : t.price
              if (rate > 0) priceVal = rate
            }
            if (pricesJson?.child != null && typeof pricesJson.child === 'number') {
              childPriceVal = pricesJson.child
            }
            if (pricesJson?.infant != null && typeof pricesJson.infant === 'number') {
              infantPriceVal = pricesJson.infant
            }
            // Fallback: extract from raw when type is 'unknown' (e.g. JSON PVPA/PVPC/PVPOS)
            if (priceVal == null && pricesJson?.type === 'unknown' && pricesJson.raw && typeof pricesJson.raw === 'object') {
              const r = pricesJson.raw as Record<string, unknown>
              const pvpa = r.PVPA ?? r.pvpa ?? r.VPVA ?? r.vpva ?? r.priceA ?? r.price
              const pvpc = r.PVPC ?? r.pvpc ?? r.VPVC ?? r.vpvc
              const pvpos = r.PVPOS ?? r.pvpos ?? r.VPVOS ?? r.vpvos
              const adultNum = typeof pvpa === 'number' ? pvpa : typeof pvpa === 'string' ? parseFloat(pvpa) : NaN
              if (!isNaN(adultNum) && adultNum > 0) priceVal = adultNum
              if (childPriceVal == null && pvpc != null) {
                const c = typeof pvpc === 'number' ? pvpc : parseFloat(String(pvpc))
                if (!isNaN(c)) childPriceVal = c
              }
              if (infantPriceVal == null && pvpos != null) {
                const i = typeof pvpos === 'number' ? pvpos : parseFloat(String(pvpos))
                if (!isNaN(i)) infantPriceVal = i
              }
            }
            const raw = details as Record<string, unknown> | undefined
            const priceA = raw?.priceA ?? raw?.priceS ?? raw?.priceC ?? raw?.price
            if (priceVal == null && priceA != null) {
              const p = typeof priceA === 'number' ? priceA : parseFloat(String(priceA))
              if (!isNaN(p) && p > 0) priceVal = p
            }
            let features: string[] = []
            const hiconIcons: string[] = []
            if (Array.isArray(details?.icons) && details.icons.length > 0) {
              features = details.icons.map((i) => String(i).replace(/[_-]/g, ' '))
              hiconIcons.push(...details.icons.map(String))
            }
            let times: string[] = []
            if (Array.isArray(details?.times) && details.times.length > 0) {
              const filtered = details.times
                .map((t) => String(t).trim())
                .filter((t) => t && t !== '00:00' && t !== '-')
              times = [...new Set(filtered)]
            }
            return {
              eventId: eid,
              name: eventName,
              desc: eventDesc,
              price: priceVal,
              childPrice: childPriceVal,
              infantPrice: infantPriceVal,
              features,
              times: times.length > 0 ? times : undefined,
              hiconIcons: hiconIcons.length > 0 ? hiconIcons : undefined,
              raw: details as Record<string, unknown> | undefined,
            }
          } catch {
            return {
              eventId: eid,
              name: `Option ${eid}`,
              desc: '',
              price: null,
              childPrice: null,
              infantPrice: null,
              features: [],
              times: undefined,
            }
          }
        })
      )
      // Group 340: keep only "From the South" event
      // Group 216: keep only "From the South area" event
      let final = results
      if (code === '340') {
        const fromSouth = results.filter((opt) => /from the south/i.test(opt.name))
        if (fromSouth.length > 0) final = fromSouth
      } else if (code === '216') {
        const fromSouthArea = results.filter((opt) => (opt.name || '').trim() === 'from the south area')
        if (fromSouthArea.length > 0) final = fromSouthArea
      } else if (code === '326') {
        const exclude = ['Naviera Armas - From The South Area', 'Naviera Armas - From Puerto de la Cruz']
        final = results.filter((opt) => !exclude.some((ex) => (opt.name || '').trim() === ex))
      } else if (code === '11') {
        const fromSouthArea = results.filter((opt) => /From The South Area/i.test(opt.name || ''))
        if (fromSouthArea.length > 0) final = fromSouthArea
      } else if (code === '78') {
        final = results.filter((opt) => !/with lunch included from the South/i.test(opt.name || ''))
      } else if (code === '16') {
        const desdeZonaSur = results.filter((opt) => /Desde zona sur/i.test(opt.name || ''))
        if (desdeZonaSur.length > 0) final = desdeZonaSur
      } else if (code === '319') {
        final = results.filter((opt) => !/^Los Tilos$/i.test((opt.name || '').trim()))
      } else if (code === '322') {
        const exclude = [
          'Visite nocturne VIP du Teide (personne supplémentaire)',
          'Visite nocturne VIP du Teide',
        ]
        final = results.filter((opt) => !exclude.some((ex) => (opt.name || '').trim() === ex))
      } else if (code === '35') {
        const allowed = [
          'Spa Entrance',
          'Spa Vip',
          'Spa Resident',
          'Spa Vip Resident',
        ]
        const filtered = results.filter((opt) =>
          allowed.some((a) => (opt.name || '').trim().toLowerCase() === a.toLowerCase())
        )
        if (filtered.length > 0) final = filtered
      } else if (code === '330') {
        const allowed = [
          'Ticket',
          'Entrada + Hamaca Residente',
          'Adult > 65 years old',
        ]
        const filtered = results.filter((opt) =>
          allowed.some((a) => (opt.name || '').trim().toLowerCase() === a.toLowerCase())
        )
        if (filtered.length > 0) final = filtered
      } else if (code === '362') {
        final = results.filter((opt) => (opt.name || '').trim().toLowerCase() !== 'entrada brunch')
      } else if (code === '281') {
        const allowed = ['Astronomical Observation at El Teide']
        const filtered = results.filter((opt) =>
          allowed.some((a) => (opt.name || '').trim().toLowerCase() === a.toLowerCase())
        )
        if (filtered.length > 0) final = filtered
      } else if (code === '134') {
        const allowed = [
          'Ticket (Guided tour)',
          'Ticket +Teide Tour from the South area',
          'Ticket + Teide Tour from Puerto de la Cruz',
        ]
        const filtered = results.filter((opt) =>
          allowed.some((a) => (opt.name || '').trim().toLowerCase() === a.toLowerCase())
        )
        if (filtered.length > 0) final = filtered
      } else if (code === '165') {
        const exclude = [
          'Oferta Especial 4 días Nissan Micra o Fiat Panda por 89€',
          'Oferta Especial 3 días Nissan Micra o Fiat Panda por 79€',
          'Jeep Renegade',
        ]
        final = results.filter(
          (opt) => !exclude.some((ex) => (opt.name || '').trim().toLowerCase() === ex.toLowerCase())
        )
      } else if (code === '166') {
        const exclude = [
          'Skoda Fabia Combi o similar',
          'VW T-CROSS o similar',
          'Renault Megane o similar',
          'Suzuki Vitara (SUV)',
          'FIAT 500 o similar',
          'Mercedes Vito AUT',
          'VW T-Rock Cabrio',
        ]
        final = results.filter(
          (opt) => !exclude.some((ex) => (opt.name || '').trim().toLowerCase() === ex.toLowerCase())
        )
      } else if (code === '189') {
        const exclude = [
          'Grupo A - Honda PCX 125 cc',
          'Grupo B - Honda Forza 300 cc',
          'Grupo C - Suzuki Bourgman 400 cc',
          'Grupo D - Honda CB 125 F',
          'Grupo E - Honda CB 500 X',
        ]
        final = results.filter(
          (opt) => !exclude.some((ex) => (opt.name || '').trim().toLowerCase() === ex.toLowerCase())
        )
      } else if (code === '127') {
        const exclude = [
          'Road Bike Carbono Disc Break',
          'Road Bike Aluminum',
          'E-City Bicicleta eléctrica',
          'E-City Bicicleta elécrtica',
          'Mountain Bike',
          'City Bike (from Periphery)',
          'Mountain Bike (from Periphery)',
          'Pro Mountain Bike (from Periphery)',
          'Road Bike (from Periphery)',
          'E-Mountain Bike Bicicleta eléctrica',
          'Kids Bike (from Periphery)',
        ]
        final = results.filter(
          (opt) => !exclude.some((ex) => (opt.name || '').trim().toLowerCase() === ex.toLowerCase())
        )
      } else if (code === '97') {
        const allowed = [
          'Dîner pique-nique + bus de la zone nord',
          'Dîner pique-nique + bus de la zone sud',
        ]
        const filtered = results.filter((opt) => allowed.some((a) => (opt.name || '').trim() === a))
        if (filtered.length > 0) final = filtered
      } else if (code === '310') {
        const exclude = [
          'Lone Star - Solo observación',
          'Lone Star - Dinner Included (self drive)',
        ]
        final = results.filter((opt) => !exclude.some((ex) => (opt.name || '').trim() === ex))
      } else if (code === '137') {
        const exclude = [
          'VIP - Excursion privée - (Personne supplémentaire)',
          'VIP - Excursion privée',
        ]
        final = results.filter((opt) => !exclude.some((ex) => (opt.name || '').trim() === ex))
      } else if (code === '245') {
        const exclude = [/Ticket \+?Teide Tour from Puerto de la Cruz/i]
        const allowed = [
          /From South/i,
          /From Puerto de La Cruz/i,
          /Desde Playa Paraíso y Los Gigantes/i,
          /Desde Santa Cruz y Candelaria/i,
        ]
        final = results.filter(
          (opt) =>
            allowed.some((re) => re.test(opt.name || '')) &&
            !exclude.some((re) => re.test(opt.name || ''))
        )
      }
      // Apply backoffice visibility
      final = final.filter((opt) => !hiddenEventIds.includes(opt.eventId))
      if (!cancelled) {
        setEventOptions(final)
      }
    }
    run().finally(() => {
      if (!cancelled) setLoadingOptions(false)
    })
    return () => { cancelled = true }
  }, [eventIds.join(','), atlLang, code])

  const handleSelectOption = (eventId: string) => {
    setSelectedEventId(eventId)
  }

  // Scroll to Manage your booking after option is selected (panel needs to render first)
  useEffect(() => {
    if (!currentEventId) return
    const id = setTimeout(() => {
      manageBookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => clearTimeout(id)
  }, [currentEventId])

  // Hide floating CTA when "Manage your booking" is in view; show again when user scrolls back up
  useEffect(() => {
    const el = manageBookingRef.current
    if (!el || eventIds.length === 0) return
    const obs = new IntersectionObserver(
      ([entry]) => setOptionsSectionInView(entry.isIntersecting),
      { threshold: 0.2, rootMargin: '-80px 0px 0px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [eventIds.length, currentEventId])

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl pt-6 sm:pt-8 pb-2">
        {/* Certified label */}
        <span className="inline-block text-xs font-medium text-ocean-700 bg-ocean-50 px-3 py-1.5 rounded-md mb-3">
          {t('heroCertifiedBy')}
        </span>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-glass-900 mb-3 leading-tight">{decodeTextFromApi(name)}</h1>

        {/* Duration */}
        {durationStr && (
          <p className="text-glass-700 text-sm sm:text-base mb-2">
            <span className="font-semibold">{tLabels('duration')}:</span> {durationStr} {tLabels('hours')}
          </p>
        )}
      </div>

      {/* Hero carousel - same as other group details */}
      <div className="container mx-auto px-4 sm:px-6 pt-4 pb-6 sm:pb-8 max-w-7xl">
        <div className="w-full mx-auto rounded-xl sm:rounded-2xl overflow-hidden shadow-lg border border-glass-200 bg-white h-72 md:h-80 lg:h-[420px]">
          <GroupDetailsHeroCarousel galleryUrls={galleryUrls} heroUrl={heroUrl} alt={name} className="!h-full !w-full" />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20 sm:pb-24 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left column - accordéons */}
          <div className="lg:col-span-2 space-y-0">
            {willDo && code !== '340' && (
              <Accordion
                id="section-what-you-do"
                title={tTabs('whatYouDo')}
                isOpen={isAccordionOpen('what-you-do')}
                onToggle={() => toggleAccordion('what-you-do')}
              >
                <div
                  className="prose prose-base max-w-none text-glass-700 leading-relaxed"
                  dangerouslySetInnerHTML={sanitizeAtlanticoHtml(willDo)}
                />
              </Accordion>
            )}
            <div id="section-overview" className="bg-white rounded-xl p-5 sm:p-6 border border-glass-200 shadow-sm space-y-4 mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-glass-900">{tOverview('title')}</h3>
              {itinerary && (
                <>
                  <h4 className="text-base font-semibold text-glass-800 mb-2">{tOverview('itineraryTitle')}</h4>
                  <p className="text-glass-800 font-medium leading-relaxed mb-4 text-sm sm:text-base">
                    {decodeTextFromApi(itinerary)}
                  </p>
                </>
              )}
              {desc && (
                <div className="prose prose-sm sm:prose-base max-w-none">
                  {(() => {
                    const plainDesc = translateAgeLabels(stripHtml(desc), locale)
                    const sentences = plainDesc.split('. ').filter(Boolean)
                    const highlights = sentences.slice(0, 2)
                    return highlights.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 mb-3">
                        <span aria-hidden="true">🌟</span>
                        <span className="font-semibold text-glass-800 text-sm sm:text-base">{s}{!s.endsWith('.') ? '.' : ''}</span>
                      </div>
                    ))
                  })()}
                </div>
              )}
              {!itinerary && !desc && (
                <p className="text-glass-600 italic text-sm sm:text-base">{tOverview('noOverview')}</p>
              )}
            </div>

            {desc && (() => {
              const plainDesc = translateAgeLabels(stripHtml(desc), locale)
              const sentences = plainDesc.split('. ').filter(Boolean)
              const rest = sentences.slice(2).join('. ')
              return rest ? (
                <Accordion
                  id="section-description"
                  title={tDescription('title')}
                  isOpen={isAccordionOpen('description')}
                  onToggle={() => toggleAccordion('description')}
                >
                  <p className="text-glass-700 leading-relaxed text-sm sm:text-base">{rest}{!rest.endsWith('.') && !rest.endsWith('!') && !rest.endsWith('?') ? '.' : ''}</p>
                </Accordion>
              ) : null
            })()}

            <Accordion
              id="section-included"
              title={tIncluded('title')}
              isOpen={isAccordionOpen('included')}
              onToggle={() => toggleAccordion('included')}
            >
              {code === '326' && (
                <p className="text-sm font-semibold text-amber-800 bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4">
                  {t('ferryIdentityNotice')}
                </p>
              )}
              {faq ? (
                <FaqSections faq={faq} fallbackRaw />
              ) : (
                <p className="text-glass-600 italic text-sm sm:text-base">{tIncluded('noInfo')}</p>
              )}
            </Accordion>

            <Accordion
              id="section-cancellation"
              title={tCancellation('title')}
              isOpen={isAccordionOpen('cancellation')}
              onToggle={() => toggleAccordion('cancellation')}
            >
              {cancellationPolicy ? (
                <div className="text-glass-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">{decodeTextFromApi(cancellationPolicy)}</div>
              ) : (
                <p className="text-glass-600 italic text-sm sm:text-base">
                  {tCancellation('noInfoDebug')}
                </p>
              )}
            </Accordion>

            {(() => {
              const priceTableOptions = (eventOptions.length > 0 ? eventOptions : eventIds.map((eid) => ({ eventId: eid, name: `Option ${eid}`, desc: '', price: null as number | null, childPrice: null as number | null, infantPrice: null as number | null, features: [] }))).filter((opt) => isDateRangeGroup(code) ? opt.price != null : (opt.price == null || opt.price <= 200))
              if (priceTableOptions.length === 0) {
                if (!CONTACT_FOR_PRICING_CODES.has(String(code).trim())) return null
                return (
                  <Accordion
                    id="section-prices"
                    title={tPrices('title')}
                    isOpen={isAccordionOpen('prices')}
                    onToggle={() => toggleAccordion('prices')}
                  >
                    <p className="text-glass-700 text-sm sm:text-base">
                      {tPrices('contactForPricing')}
                    </p>
                  </Accordion>
                )
              }
              const isPerDay = isDateRangeGroup(code)
              return (
            <Accordion
              id="section-prices"
              title={tPrices('title')}
              isOpen={isAccordionOpen('prices')}
              onToggle={() => toggleAccordion('prices')}
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-glass-200">
                      <th className="text-left py-2 pr-4 font-semibold text-glass-900" />
                      {isPerDay ? (
                        <th className="text-right py-2 px-3 font-semibold text-glass-900">{tPrices('headerPerDay')}</th>
                      ) : (
                        <>
                          <th className="text-right py-2 px-3 font-semibold text-glass-900">{tPrices('headerAdults')}</th>
                          <th className="text-right py-2 px-3 font-semibold text-glass-900">
                            {tPrices('headerChildren', { childAge: childAge || '0-11' })}
                          </th>
                          <th className="text-right py-2 px-3 font-semibold text-glass-900">
                            {tPrices('headerInfants', { infantAge: infantAge || 'NO' })}
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {priceTableOptions.map((opt) => (
                      <tr key={opt.eventId} className="border-b border-glass-100">
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-2 text-glass-800 font-medium">
                            <svg className="w-4 h-4 text-ocean-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {translateAgeLabels(opt.name, locale)}
                          </span>
                        </td>
                        {isPerDay ? (
                          <td className="text-right py-3 px-3 text-glass-700">
                            {opt.price != null ? `${opt.price.toFixed(2)} €` : '—'}
                          </td>
                        ) : (
                          <>
                            <td className="text-right py-3 px-3 text-glass-700">
                              {opt.price != null ? `${opt.price.toFixed(2)} €` : '—'}
                            </td>
                            <td className="text-right py-3 px-3 text-glass-700">
                              {opt.childPrice != null ? `${opt.childPrice.toFixed(2)} €` : '—'}
                            </td>
                            <td className="text-right py-3 px-3 text-glass-700">
                              {opt.infantPrice != null ? `${opt.infantPrice.toFixed(2)} €` : '—'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!eventOptions.length && eventIds.length > 0) && loadingOptions && (
                <p className="text-glass-600 text-sm mt-3">{tPrices('loading')}</p>
              )}
            </Accordion>
              )
            })()}
          </div>

          {/* Right column - Options + Manage your booking (desktop sidebar; stacks below on mobile) */}
          <div className="lg:col-span-1 space-y-6 lg:space-y-8">
            {/* Option cards (now on the right on desktop) */}
            {eventIds.length > 0 && (
              <div
                id="section-options"
                className="bg-white border border-glass-200 rounded-xl p-5 sm:p-6 shadow-sm scroll-mt-20 sm:scroll-mt-24"
              >
                <h2 className="text-lg sm:text-xl font-bold text-glass-900 mb-4 sm:mb-6">
                  {(eventOptions.length || eventIds.length) === 1
                    ? tOptions('title', { count: eventOptions.length || eventIds.length })
                    : tOptions('title_plural', { count: eventOptions.length || eventIds.length })}
                </h2>
                {loadingOptions ? (
                  <div className="space-y-4">
                    {eventIds.map((eid) => (
                      <div key={eid} className="border border-glass-200 rounded-xl p-6 animate-pulse">
                        <div className="h-6 bg-glass-200 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-glass-100 rounded w-full mb-2" />
                        <div className="h-4 bg-glass-100 rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(eventOptions.length > 0
                      ? eventOptions
                      : eventIds.map((eid) => ({
                          eventId: eid,
                          name: tOptions('placeholderTitle', { id: eid }),
                          desc: '',
                          price: null as number | null,
                          childPrice: null as number | null,
                          infantPrice: null as number | null,
                          features: [],
                        }))).map((opt) => (
                      <OptionCard
                        key={opt.eventId}
                        option={opt}
                        isSelected={selectedEventId === opt.eventId}
                        onSelect={() => handleSelectOption(opt.eventId)}
                        groupCode={code}
                        locale={locale}
                        tOptions={tOptions}
                        tLabels={tLabels}
                        tCta={tCta}
                        tIcons={tIcons}
                        tFerry={() => t('ferryIdentityNotice')}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Full-width: Manage your booking (appears after selecting an option) */}
        {(currentEventId || eventIds.length === 0) && (
          <div ref={manageBookingRef} id="manage-your-booking" className="mt-8 sm:mt-10 scroll-mt-24">
            {currentEventId && events.length > 0 ? (
              <ActivityBookingPanel
                key={selectedEventId}
                t_group={code}
                initialEventId={selectedEventId}
                events={events}
                locale={locale}
                tourName={decodeTextFromApi(name)}
                language={atlLang}
                duration={durationStr}
                startingPrice={startingPrice}
                cancellationPolicy={cancellationPolicy}
                cancellationTitle={tCancellation('title')}
                childAge={childAge}
                infantAge={infantAge}
                showChildSelector={selectedOption?.childPrice != null}
                showInfantSelector={selectedOption?.infantPrice != null}
                useQuantityLabel={(selectedOption?.price ?? 0) > 200}
                isCombination={
                  isCombinationEvent(code, selectedEventId) ||
                  (String(code).includes('168') && ['21', '22', '23'].includes(String(selectedEventId).trim()))
                }
              />
            ) : (
              <div className="bg-white border border-glass-200 rounded-xl p-5 sm:p-6 shadow-lg space-y-5 sm:space-y-6">
                <h3 className="text-lg sm:text-xl font-bold text-glass-900">{tManage('title')}</h3>
                <div className="grid grid-cols-1 gap-3 pb-4 border-b border-glass-200">
                  {durationStr && (
                    <div className="bg-gradient-to-br from-ocean-50 to-blue-50 rounded-xl p-4 border border-ocean-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-ocean-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-ocean-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-ocean-700 uppercase tracking-wide">{tLabels('duration')}</div>
                          <div className="text-lg font-bold text-glass-900">
                            {durationStr} {tLabels('hours')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {groupPriceNum != null && (
                    <div className="bg-gradient-to-br from-ocean-50 to-blue-50 rounded-xl p-4 border border-ocean-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-ocean-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-ocean-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-ocean-700 uppercase tracking-wide">{tLabels('startingFrom')}</div>
                          <div className="text-lg font-bold text-glass-900">€{groupPriceNum.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-glass-600">{tManage('noEvents')}</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/debug/event-details"
                    className="text-xs text-ocean-600 hover:text-ocean-700 hover:underline focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-1 rounded"
                  >
                    → eventDetails debug
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* You might also like - related tours from same classification */}
        <YouMightAlsoLike code={code} lang={lang} locale={locale} />
      </div>

      {/* Fixed CTA - See availability (scrolls to options), hide when options section is in view */}
      {eventIds.length > 0 && !optionsSectionInView && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 sm:p-6 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 pointer-events-auto">
            <button
              type="button"
              onClick={() => document.getElementById('section-options')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="w-full py-3 px-6 bg-ocean-600 hover:bg-ocean-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
            >
              {tCta('seeAvailability')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
