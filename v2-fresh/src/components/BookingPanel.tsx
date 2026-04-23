'use client'

import { forwardRef, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock, Minus, Plus, ArrowRight, ArrowLeft, Info, Loader2, ShieldCheck,
} from 'lucide-react'
import { sanitizeRichText } from '@/lib/atlantico/normalize'
import type {
  AtlanticoEvent, AtlanticoGroup, AtlanticoLimits, ParsedPrice,
} from '@/lib/atlantico/types'
import type { CartItem } from '@/types'
import type { Dict } from '@/i18n/dictionaries/fr'
import type { Locale } from '@/lib/locale'
import { useCart } from '@/lib/cart'
import { formatPrice, uniqueId } from '@/lib/utils'
import { coverImage } from '@/lib/atlantico/images'
import DateCalendar from './DateCalendar'
import DateSquares from './DateSquares'
import { ScheduleGrid } from './OptionCard'

type Props = {
  group: AtlanticoGroup
  events: AtlanticoEvent[]
  selectedEventCode: string
  onSelectEvent: (code: string) => void
  initialPrices: Record<string, ParsedPrice | null>
  initialDate: string
  t: Dict
  locale: Locale
  onBack?: () => void
}

function pad(n: number) { return String(n).padStart(2, '0') }
function monthKeyFromDate(d: string) { return d.slice(0, 7) + '-01' }
function mondayDow(d: Date) { return (d.getDay() + 6) % 7 }

function findFirstAvailable(limits: AtlanticoLimits | null, fallback: string): string {
  if (!limits?.dates) return fallback
  const { wdays = [], date: dateArr = [], limit: limitArr = [], used: usedArr = [] } = limits.dates
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 90; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i)
    const apiDate = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
    const inputDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const dow = mondayDow(d)
    const wdayOn = !wdays.length || wdays[dow] !== 0
    const idx = dateArr.indexOf(apiDate)
    const hasData = idx !== -1
    const remaining = hasData ? Math.max(0, Number(limitArr[idx] ?? 0) - Number(usedArr[idx] ?? 0)) : null
    const isFull = hasData && remaining !== null && remaining <= 0
    if ((wdayOn || hasData) && !isFull) return inputDate
  }
  return fallback
}

const BookingPanel = forwardRef<HTMLDivElement, Props>(function BookingPanel(
  { group, events, selectedEventCode, onSelectEvent, initialPrices, initialDate, t, locale, onBack },
  ref,
) {
  const { add } = useCart()
  const router = useRouter()

  const currentEvent = useMemo(
    () => events.find((e) => e.code === selectedEventCode) ?? events[0],
    [events, selectedEventCode],
  )

  const [date, setDate] = useState<string>(initialDate)
  const [prices, setPrices] = useState<Record<string, ParsedPrice | null>>(initialPrices)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [limitsCache, setLimitsCache] = useState<Record<string, AtlanticoLimits>>({})
  const [loadingLimits, setLoadingLimits] = useState(false)
  const [viewedMonth, setViewedMonth] = useState<string>(() => monthKeyFromDate(initialDate))
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [infants, setInfants] = useState(0)
  const [timeSlot, setTimeSlot] = useState<string>('')
  const [userPickedDate, setUserPickedDate] = useState(false)

  const currentLimits = useMemo(() => {
    if (!currentEvent) return null
    return limitsCache[`${currentEvent.code}:${viewedMonth}`] ?? null
  }, [limitsCache, currentEvent?.code, viewedMonth])

  /** True when the option operates every day of the week — use full calendar.
   *  False when some weekdays are closed — use compact date squares. */
  const isFullWeek = useMemo(() => {
    const wdays = currentLimits?.dates?.wdays ?? []
    if (wdays.length !== 7) return true // default to calendar when data missing
    return wdays.every((w) => Number(w) !== 0)
  }, [currentLimits])

  const availableTimes = useMemo(() => {
    if (!currentEvent || !date) return [] as string[]
    const apiDate = date.replace(/-/g, '')
    const sessions = (currentLimits?.dates as { sessions?: Record<string, Array<{ time?: string }>> } | undefined)
      ?.sessions?.[apiDate]
    if (Array.isArray(sessions) && sessions.length > 0) {
      const list = sessions.map((s) => String(s.time ?? '').trim()).filter((tt) => tt && tt !== '-' && tt !== '00:00')
      if (list.length > 0) return Array.from(new Set(list))
    }
    const weekday = (new Date(date).getDay() + 6) % 7
    const times = currentEvent.times
    if (Array.isArray(times) && times[weekday]) {
      const tt = String(times[weekday]).trim()
      if (tt && tt !== '-' && tt !== '00:00') return [tt]
    }
    return []
  }, [currentEvent, date, currentLimits])

  // Fetch limits per (option, month)
  useEffect(() => {
    if (!currentEvent) return
    const cacheKey = `${currentEvent.code}:${viewedMonth}`
    if (limitsCache[cacheKey]) return
    let cancelled = false
    setLoadingLimits(true)
    fetch(`/api/atlantico/limits/${currentEvent.code}?locale=${locale}&month=${viewedMonth}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AtlanticoLimits | null) => {
        if (cancelled || !data) return
        setLimitsCache((c) => ({ ...c, [cacheKey]: data }))
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingLimits(false))
    return () => { cancelled = true }
  }, [currentEvent?.code, viewedMonth, locale, limitsCache])

  // Snap to first available date when option changes — clear user-pick flag too
  useEffect(() => {
    if (!currentEvent || !currentLimits) return
    setUserPickedDate(false)
    const next = findFirstAvailable(currentLimits, date)
    if (next !== date) {
      setDate(next)
      setViewedMonth(monthKeyFromDate(next))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent?.code])

  // Fetch price per (option, date)
  useEffect(() => {
    if (!currentEvent) return
    const key = `${currentEvent.code}:${date}`
    const cached = prices[key] ?? (date === initialDate ? prices[currentEvent.code] : undefined)
    if (cached !== undefined) return
    let cancelled = false
    setLoadingPrice(true)
    fetch(`/api/atlantico/prices/${currentEvent.code}?date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ParsedPrice | null) => {
        if (cancelled) return
        setPrices((p) => ({ ...p, [key]: data }))
      })
      .catch(() => !cancelled && setPrices((p) => ({ ...p, [key]: null })))
      .finally(() => !cancelled && setLoadingPrice(false))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent?.code, date])

  useEffect(() => {
    if (availableTimes.length === 0) { setTimeSlot(''); return }
    if (!availableTimes.includes(timeSlot)) setTimeSlot(availableTimes[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTimes.join('|')])

  if (!currentEvent) return null

  const priceKey = `${currentEvent.code}:${date}`
  const current = prices[priceKey] ?? (date === initialDate ? prices[currentEvent.code] : null) ?? null
  const unitAdult = current?.adult ?? 0
  const unitChild = current?.child ?? 0
  const unitInfant = current?.infant ?? 0
  const total = unitAdult * adults + unitChild * children + unitInfant * infants

  const placesLeft = (() => {
    if (!currentLimits?.dates?.date) return null
    const apiDate = date.replace(/-/g, '')
    const idx = currentLimits.dates.date.indexOf(apiDate)
    if (idx === -1) return null
    const cap = Number(currentLimits.dates.limit?.[idx] ?? 0)
    const u = Number(currentLimits.dates.used?.[idx] ?? 0)
    return Math.max(0, cap - u)
  })()

  const canBook = unitAdult > 0 && !loadingPrice && (placesLeft === null || placesLeft > 0)

  const addToCart = (redirect: 'cart' | 'checkout') => {
    const item: CartItem = {
      itemId: uniqueId('ci'),
      groupCode: group.code,
      eventCode: currentEvent.code,
      activityTitle: group.name,
      optionTitle: currentEvent.name,
      activityImage: coverImage(group),
      date,
      timeSlot: timeSlot || undefined,
      adults, children, infants,
      unitAdult, unitChild, unitInfant,
    }
    add(item)
    router.push(`/${locale}/${redirect === 'cart' ? 'panier' : 'checkout'}`)
  }

  return (
    <div ref={ref} id="booking-panel" className="card p-5 md:p-6 scroll-mt-20">
      {/* Back to options */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900 mb-4 -ml-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.checkout.back}
        </button>
      )}

      {/* Duration + Cancellation info */}
      <div className="space-y-3 mb-5 pb-5 border-b border-ink-100">
        {group.duration && (
          <div className="rounded-xl bg-ocean-50/60 border border-ocean-100 p-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-ocean-700" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ocean-800">
                {t.activity.duration}
              </p>
              <p className="text-base font-display font-bold text-ink-900">{group.duration} h</p>
            </div>
          </div>
        )}
        <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 mb-1">
                {group.canTitle || t.activity.cancellationPolicy}
              </p>
              <ExpandableText
                html={sanitizeRichText(group.canDesc || t.activity.freeCancel24h)}
                moreLabel={t.activity.showMore}
                lessLabel={t.activity.showLess}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Date picker — calendar if 7/7, squares if limited */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">
          {t.activity.selectDate} <span className="text-ember-600">*</span>
        </label>
        {isFullWeek ? (
          <DateCalendar
            value={date}
            onChange={(d) => { setDate(d); setViewedMonth(monthKeyFromDate(d)); setUserPickedDate(true) }}
            limits={currentLimits}
            onMonthChange={setViewedMonth}
            loading={loadingLimits}
          />
        ) : (
          <DateSquares
            value={date}
            onChange={(d) => { setDate(d); setViewedMonth(monthKeyFromDate(d)); setUserPickedDate(true) }}
            limits={currentLimits}
          />
        )}
        {placesLeft !== null && (
          <p className={`mt-1.5 text-[11px] ${placesLeft > 0 ? 'text-ink-500' : 'text-ember-600 font-semibold'}`}>
            {placesLeft > 0 ? `${placesLeft} ${t.activity.placesAvailable}` : t.activity.soldOutHint}
          </p>
        )}
      </div>

      {/* Weekly schedule reference — only when calendar mode (helpful context) */}
      {isFullWeek && Array.isArray(currentEvent.days) && currentEvent.days.length === 7 && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">
            {t.activity.schedule}
          </label>
          <ScheduleGrid event={currentEvent} t={t} />
        </div>
      )}

      {/* Time — only after user actively picked a date */}
      {userPickedDate && availableTimes.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide mb-2">
            {t.activity.selectTime} <span className="text-ember-600">*</span>
          </label>
          {availableTimes.length === 1 ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-ocean-50 border border-ocean-100 px-3 py-1.5 text-sm text-ocean-800 font-semibold">
              <Clock className="w-4 h-4" />
              {availableTimes[0]}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTimes.map((tt) => {
                const active = tt === timeSlot
                return (
                  <button
                    key={tt}
                    type="button"
                    onClick={() => setTimeSlot(tt)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      active
                        ? 'bg-ocean-600 text-white shadow-soft'
                        : 'bg-white border border-ink-200 text-ink-800 hover:border-ocean-400'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {tt}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Participants */}
      <div className="mb-5 space-y-2">
        <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide mb-1">
          {t.activity.participants}
        </label>
        <QuantityRow
          label={t.activity.adults}
          hint={unitAdult > 0 ? formatPrice(unitAdult, locale) : undefined}
          value={adults}
          min={1}
          onChange={setAdults}
        />
        {unitChild > 0 && (
          <QuantityRow
            label={`${t.activity.children}${group.childAge ? ` (${group.childAge.replace(/\s+/g, '')} ${t.activity.years})` : ''}`}
            hint={formatPrice(unitChild, locale)}
            value={children}
            min={0}
            onChange={setChildren}
          />
        )}
        {unitInfant > 0 && (
          <QuantityRow
            label={`${t.activity.infants}${group.infantAge ? ` (${group.infantAge.replace(/\s+/g, '')} ${t.activity.years})` : ''}`}
            hint={formatPrice(unitInfant, locale)}
            value={infants}
            min={0}
            onChange={setInfants}
          />
        )}
      </div>

      {/* Total */}
      <div className="border-t border-ink-100 pt-4 mb-4 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink-900">{t.activity.total}</span>
        <span className="text-2xl font-display font-bold text-ink-900">
          {loadingPrice ? <Loader2 className="w-5 h-5 animate-spin inline" /> : formatPrice(total, locale)}
        </span>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => addToCart('checkout')}
          disabled={!canBook}
          className="btn-ember w-full justify-center text-base py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.activity.book} <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => addToCart('cart')}
          disabled={!canBook}
          className="btn-ghost w-full justify-center text-sm disabled:opacity-50"
        >
          {t.activity.addToCart}
        </button>
      </div>

      {/* Trust */}
      <div className="mt-4 pt-4 border-t border-ink-100 space-y-1.5 text-xs text-ink-600">
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          {t.activity.freeCancellation}
        </p>
        <p className="flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-ink-400 flex-shrink-0 mt-0.5" />
          <span>{t.activity.disclaimer}</span>
        </p>
      </div>
    </div>
  )
})

function ExpandableText({
  html, moreLabel, lessLabel,
}: {
  html: string
  moreLabel: string
  lessLabel: string
}) {
  const [expanded, setExpanded] = useState(false)
  // Rough heuristic: collapse if text is over 180 chars
  const plain = html.replace(/<[^>]+>/g, '').trim()
  const isLong = plain.length > 180

  if (!isLong) {
    return (
      <div
        className="rich-text text-xs text-ink-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <div>
      <div
        className={`rich-text text-xs text-ink-700 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
      >
        {expanded ? lessLabel : moreLabel}
      </button>
    </div>
  )
}

function QuantityRow({
  label, hint, value, min = 0, onChange,
}: {
  label: string
  hint?: string
  value: number
  min?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-3 py-2 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-ink-900">{label}</p>
        {hint && <p className="text-[11px] text-ink-500">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-full border border-ink-200 hover:bg-ink-50 inline-flex items-center justify-center"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-4 text-center text-sm font-semibold">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-full border border-ink-200 hover:bg-ink-50 inline-flex items-center justify-center"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export default BookingPanel
