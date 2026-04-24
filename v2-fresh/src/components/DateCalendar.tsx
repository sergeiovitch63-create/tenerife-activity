'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { localeIntl } from '@/lib/locale'
import type { AtlanticoLimits } from '@/lib/atlantico/types'

type Props = {
  value: string // YYYY-MM-DD
  onChange: (v: string) => void
  limits: AtlanticoLimits | null
  onMonthChange?: (monthStart: string) => void // YYYY-MM-01
  loading?: boolean
  /** When true, renders the calendar grid inline (no popover, no toggle button). */
  inline?: boolean
}

function pad(n: number) { return String(n).padStart(2, '0') }
function toInput(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}` }
function toApi(y: number, m: number, d: number) { return `${y}${pad(m + 1)}${pad(d)}` }
function mondayDow(d: Date) { return (d.getDay() + 6) % 7 }

export default function DateCalendar({ value, onChange, limits, onMonthChange, loading, inline = false }: Props) {
  const { locale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const parsed = value ? new Date(value) : new Date()
  const [view, setView] = useState(() => ({ year: parsed.getFullYear(), month: parsed.getMonth() }))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (inline) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [inline])

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const wdays = useMemo(() => Array.isArray(limits?.dates?.wdays) ? limits!.dates.wdays : [], [limits])
  const dateArr = useMemo(() => Array.isArray(limits?.dates?.date) ? limits!.dates.date.map(String) : [], [limits])
  const limitArr = useMemo(() => Array.isArray(limits?.dates?.limit) ? limits!.dates.limit.map(Number) : [], [limits])
  const usedArr = useMemo(() => Array.isArray(limits?.dates?.used) ? limits!.dates.used.map(Number) : [], [limits])

  function dayInfo(year: number, month: number, day: number) {
    const dateObj = new Date(year, month, day)
    const past = dateObj < today
    const dow = mondayDow(dateObj)
    const wdayOn = wdays.length === 0 || wdays[dow] !== 0
    const apiDate = toApi(year, month, day)
    const idx = dateArr.indexOf(apiDate)
    const hasData = idx !== -1
    const remaining = hasData ? Math.max(0, (limitArr[idx] ?? 0) - (usedArr[idx] ?? 0)) : null
    const isFull = !past && hasData && remaining !== null && remaining <= 0
    const isAvail = !past && wdayOn && (!hasData || (remaining !== null && remaining > 0))
    const clickable = !past && (wdayOn || hasData) && !isFull
    return { past, wdayOn, hasData, remaining, isFull, isAvail, clickable, inputDate: toInput(view.year, view.month, day) }
  }

  const goMonth = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
    onMonthChange?.(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`)
  }

  const dayNames = useMemo(() => {
    const f = new Intl.DateTimeFormat(localeIntl(locale), { weekday: 'short' })
    const base = new Date(2024, 0, 1) // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base); d.setDate(base.getDate() + i)
      return f.format(d).replace('.', '').slice(0, 2)
    })
  }, [locale])

  const monthLabelFor = (year: number, month: number) =>
    new Intl.DateTimeFormat(localeIntl(locale), { month: 'long', year: 'numeric' })
      .format(new Date(year, month, 1))

  const valueLabel = value
    ? new Intl.DateTimeFormat(localeIntl(locale), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(value))
    : ''

  const canGoPrev = !(view.year === today.getFullYear() && view.month === today.getMonth())

  // Shared cell renderer for a given year/month
  function renderMonthCells(year: number, month: number, cellHeight = 'h-11') {
    const firstDow = mondayDow(new Date(year, month, 1))
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = [
      ...Array<null>(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    return (
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className={cellHeight} />
          // compute dayInfo for THIS month (not view)
          const dateObj = new Date(year, month, day)
          const past = dateObj < today
          const dow = mondayDow(dateObj)
          const wdayOn = wdays.length === 0 || wdays[dow] !== 0
          const apiDate = toApi(year, month, day)
          const idx = dateArr.indexOf(apiDate)
          const hasData = idx !== -1
          const remaining = hasData ? Math.max(0, (limitArr[idx] ?? 0) - (usedArr[idx] ?? 0)) : null
          const isFull = !past && hasData && remaining !== null && remaining <= 0
          const clickable = !past && (wdayOn || hasData) && !isFull
          const inputDate = toInput(year, month, day)
          const isSelected = inputDate === value

          return (
            <button
              key={i}
              type="button"
              disabled={!clickable}
              onClick={() => { onChange(inputDate); if (!inline) setOpen(false) }}
              className={`${cellHeight} rounded-lg text-sm relative transition-colors ${
                isSelected
                  ? 'bg-ocean-600 text-white font-semibold'
                  : !clickable
                    ? 'text-ink-300 cursor-not-allowed line-through decoration-ink-200'
                    : isFull
                      ? 'text-ink-300 cursor-not-allowed'
                      : 'hover:bg-ocean-50 text-ink-900'
              }`}
              title={
                past ? '' :
                isFull ? t.itinerary.full :
                remaining !== null ? `${remaining} ${t.activity.placesAvailable}` :
                wdayOn ? t.itinerary.available : ''
              }
            >
              {day}
              {remaining !== null && remaining > 0 && remaining <= 10 && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ember-500" />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Single-month block (used inside popover)
  const singleGrid = (
    <>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          disabled={!canGoPrev}
          className="w-8 h-8 rounded-full hover:bg-ink-100 inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="capitalize font-semibold text-sm">{monthLabelFor(view.year, view.month)}</span>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className="w-8 h-8 rounded-full hover:bg-ink-100 inline-flex items-center justify-center"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-ink-400 mb-1 capitalize">
        {dayNames.map((d) => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>
      {loading ? (
        <div className="py-8 text-center text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin inline" />
        </div>
      ) : (
        renderMonthCells(view.year, view.month, inline ? 'h-11' : 'h-9')
      )}
    </>
  )

  // Inline mode: always-visible calendar, 2 months on desktop
  if (inline) {
    const next = new Date(view.year, view.month + 1, 1)

    return (
      <div className="rounded-xl border border-ink-200 bg-white p-4 md:p-5">
        {/* Shared top navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            disabled={!canGoPrev}
            className="w-9 h-9 rounded-full hover:bg-ink-100 inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-10 xl:gap-16 items-center flex-1 justify-center">
            <span className="capitalize font-semibold text-sm md:text-base">
              {monthLabelFor(view.year, view.month)}
            </span>
            <span className="capitalize font-semibold text-sm md:text-base hidden xl:inline">
              {monthLabelFor(next.getFullYear(), next.getMonth())}
            </span>
          </div>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="w-9 h-9 rounded-full hover:bg-ink-100 inline-flex items-center justify-center"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-ink-400">
            <Loader2 className="w-6 h-6 animate-spin inline" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
            {/* Month 1 */}
            <div>
              <div className="grid grid-cols-7 gap-1 text-[11px] text-ink-400 mb-2 capitalize">
                {dayNames.map((d) => (
                  <div key={d} className="text-center py-1">{d}</div>
                ))}
              </div>
              {renderMonthCells(view.year, view.month, 'h-11')}
            </div>
            {/* Month 2 — hidden below xl */}
            <div className="hidden xl:block">
              <div className="grid grid-cols-7 gap-1 text-[11px] text-ink-400 mb-2 capitalize">
                {dayNames.map((d) => (
                  <div key={d + '_2'} className="text-center py-1">{d}</div>
                ))}
              </div>
              {renderMonthCells(next.getFullYear(), next.getMonth(), 'h-11')}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Popover mode (unchanged, single month)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-ocean-500 relative text-left"
      >
        <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <span className="capitalize">{valueLabel || '—'}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-[320px] card p-4 left-0">
          {singleGrid}
        </div>
      )}
    </div>
  )
}
