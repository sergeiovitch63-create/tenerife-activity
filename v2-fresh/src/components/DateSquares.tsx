'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { localeIntl } from '@/lib/locale'
import type { AtlanticoLimits } from '@/lib/atlantico/types'

type Props = {
  value: string // YYYY-MM-DD
  onChange: (v: string) => void
  limits: AtlanticoLimits | null
  /** How many dates to show initially; clicking "more" adds this number again. */
  initialShow?: number
}

type AvailDate = {
  input: string
  date: Date
  places: number | null
}

function pad(n: number) { return String(n).padStart(2, '0') }
function mondayDow(d: Date) { return (d.getDay() + 6) % 7 }

export default function DateSquares({ value, onChange, limits, initialShow = 12 }: Props) {
  const { locale, t } = useI18n()
  const [show, setShow] = useState(initialShow)

  /**
   * Build the list of available dates for this option.
   *
   * Atlantico loadLimits can return either:
   *   a) `dates.date[]` empty + `wdays[]` only → operator hasn't touched specific
   *      dates; availability comes purely from the weekly template
   *   b) `dates.date[]` populated → contains specific dates with either extra
   *      capacity info or blocked flags (limit=0 means blocked)
   *
   * We iterate future days and:
   *   - Skip past days
   *   - Skip wdays[dow] === 0 (not operated that weekday)
   *   - If date is in `date[]`: check capacity (skip if full/blocked)
   *   - Otherwise treat as available (unlimited slot)
   */
  const availableDates = useMemo<AvailDate[]>(() => {
    if (!limits?.dates) return []
    const { wdays = [], date: dateArr = [], limit: limitArr = [], used: usedArr = [] } = limits.dates
    if (wdays.length !== 7) return []

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const results: AvailDate[] = []
    const MAX_DAYS = 180 // ~6 months lookahead
    const MAX_RESULTS = 60

    for (let offset = 0; offset < MAX_DAYS && results.length < MAX_RESULTS; offset++) {
      const d = new Date(today)
      d.setDate(today.getDate() + offset)
      const dow = mondayDow(d)
      if (Number(wdays[dow]) === 0) continue

      const apiDate = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
      const idx = dateArr.indexOf(apiDate)
      let places: number | null = null

      if (idx !== -1) {
        const cap = Number(limitArr[idx] ?? 0)
        const u = Number(usedArr[idx] ?? 0)
        if (cap === 0) continue // explicitly blocked
        places = Math.max(0, cap - u)
        if (places <= 0) continue // full
      }

      results.push({
        input: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        date: new Date(d),
        places,
      })
    }

    return results
  }, [limits])

  const visible = availableDates.slice(0, show)
  const canShowMore = availableDates.length > show

  const weekdayFmt = new Intl.DateTimeFormat(localeIntl(locale), { weekday: 'short' })
  const monthFmt = new Intl.DateTimeFormat(localeIntl(locale), { month: 'short' })

  if (availableDates.length === 0) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-5 text-sm text-ink-500 text-center">
        {t.activity.noDates}
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {visible.map(({ input, date, places }) => {
          const isSelected = input === value
          const weekday = weekdayFmt.format(date).replace('.', '').slice(0, 3)
          const month = monthFmt.format(date).replace('.', '').slice(0, 4)
          const day = date.getDate()
          const lowStock = places !== null && places > 0 && places <= 10
          return (
            <button
              key={input}
              type="button"
              onClick={() => onChange(input)}
              className={`rounded-xl border-2 p-3 text-center transition-all ${
                isSelected
                  ? 'border-ocean-500 bg-ocean-50 ring-2 ring-ocean-200'
                  : 'border-ink-200 bg-white hover:border-ocean-300'
              }`}
            >
              <div className="text-[10px] uppercase font-semibold tracking-wide text-ink-500">
                {weekday}
              </div>
              <div className={`text-2xl font-display font-bold mt-0.5 ${isSelected ? 'text-ocean-700' : 'text-ink-900'}`}>
                {day}
              </div>
              <div className="text-[10px] uppercase text-ink-500">{month}</div>
              {lowStock && (
                <div className="mt-1 text-[9px] font-semibold text-ember-600">
                  {places} {t.activity.placesAvailable.split(' ')[0]}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {canShowMore && (
        <button
          type="button"
          onClick={() => setShow((s) => s + 12)}
          className="mt-3 w-full text-sm text-ocean-700 hover:text-ocean-800 font-medium flex items-center justify-center gap-1 py-2 rounded-xl hover:bg-ocean-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.activity.moreDates}
        </button>
      )}
    </div>
  )
}
