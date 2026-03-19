'use client'

import { useEffect, useMemo, useState } from 'react'
import { parsePrices, toApiLang, translateLabel } from '@/lib/atlantico'
import type { ApiEvent, ApiLimits } from '@/lib/atlantico.types'

const BASE = process.env.NEXT_PUBLIC_ATLANTICO_BASE_URL ?? 'https://api.atlanticoexcursiones.com'

type BookingWidgetProps = {
  tourCode: string
  eventIds: string[]
  locale: string
}

type PricesPayload = {
  raw: string
  pProd: string
}

const dayLabels = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

const weekdayToIndex = (value: number): number => {
  if (value >= 1 && value <= 7) return value - 1
  if (value >= 0 && value <= 6) return value
  return -1
}

const parseCsv = (raw: string): string[] =>
  raw.split(',').map((s) => s.trim()).filter(Boolean)

export default function BookingWidget({ tourCode, eventIds, locale }: BookingWidgetProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [events, setEvents] = useState<ApiEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedTime, setSelectedTime] = useState('')
  const [limits, setLimits] = useState<ApiLimits | null>(null)
  const [prices, setPrices] = useState<PricesPayload | null>(null)
  const [adults, setAdults] = useState(1)
  const [childs, setChilds] = useState(0)
  const [infants, setInfants] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const loadEvents = async () => {
      const lang = toApiLang(locale)
      const all = await Promise.all(
        eventIds.map(async (id) => {
          const res = await fetch(`${BASE}/eventDetails/${encodeURIComponent(id)}/${lang}`, { cache: 'no-store' })
          if (!res.ok) return null
          return (await res.json()) as ApiEvent
        })
      )
      if (!mounted) return
      const filtered = all.filter((item): item is ApiEvent => Boolean(item))
      setEvents(filtered)
      setSelectedEvent(filtered[0] ?? null)
      setSelectedTime(filtered[0]?.times?.[0] ?? '')
    }

    loadEvents().catch(() => setError('Unable to load booking options'))
    return () => {
      mounted = false
    }
  }, [eventIds, locale])

  useEffect(() => {
    if (!selectedEvent) return
    const run = async () => {
      const monthDate = `${selectedDate.slice(0, 8)}01`
      const [pricesRes, limitsRes] = await Promise.all([
        fetch(`/api/atlantico/prices?eventCode=${encodeURIComponent(selectedEvent.code)}&date=${encodeURIComponent(selectedDate)}`),
        fetch(`${BASE}/loadLimits/${encodeURIComponent(selectedEvent.code)}/${toApiLang(locale)}/${monthDate}`, { cache: 'no-store' }),
      ])
      if (pricesRes.ok) {
        setPrices((await pricesRes.json()) as PricesPayload)
      }
      if (limitsRes.ok) {
        setLimits((await limitsRes.json()) as ApiLimits)
      }
    }
    run().catch(() => setError('Unable to refresh calendar and prices'))
  }, [selectedEvent, selectedDate, locale])

  const allDates = useMemo(() => {
    if (!limits) return []
    return limits.dates.date.map((date, idx) => ({
      date,
      limit: limits.dates.limit[idx] ?? 0,
      used: limits.dates.used[idx] ?? 0,
      available: (limits.dates.limit[idx] ?? 0) - (limits.dates.used[idx] ?? 0) > 0,
    }))
  }, [limits])

  const sessions = useMemo(() => {
    if (!limits || !selectedDate) return []
    return limits.sessions[selectedDate] ?? []
  }, [limits, selectedDate])

  const total = useMemo(() => {
    if (!prices) return 0
    const parsed = parsePrices(prices.raw, prices.pProd)
    if (parsed.type === 'person') {
      return adults * parsed.adult + childs * parsed.child + infants * parsed.infant
    }
    if (parsed.type === 'unique') return parsed.price
    if (parsed.type === 'day') return parsed.tiers[0]?.price ?? 0
    return 0
  }, [prices, adults, childs, infants])

  const handleSubmit = async () => {
    setError('')
    if (!selectedEvent) {
      setError('No option selected')
      return
    }
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please complete all contact fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/atlantico/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          t_id: selectedEvent.id,
          t_group: tourCode,
          locale,
          tourDate: selectedDate,
          sesTime: selectedTime,
          adults,
          childs,
          infants,
          name,
          email,
          phone,
        }),
      })
      const payload = (await res.json()) as { redirectUrl?: string; error?: string }
      if (!res.ok || !payload.redirectUrl) {
        throw new Error(payload.error || 'Booking failed')
      }
      window.location.href = payload.redirectUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setLoading(false)
    }
  }

  const childAgeText = translateLabel('niños', locale)
  const infantAgeText = translateLabel('Bebés', locale)

  return (
    <aside className="space-y-5 rounded-2xl border border-glass-200 bg-white/90 p-5 shadow-xl backdrop-blur-sm">
      <h3 className="text-xl font-semibold text-glass-900">Booking</h3>

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-glass-500">1. Option</p>
        <div className="space-y-2">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => {
                setSelectedEvent(event)
                setSelectedTime(event.times?.[0] ?? '')
              }}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selectedEvent?.id === event.id
                  ? 'border-ocean-500 bg-ocean-50 shadow-md'
                  : 'border-glass-200 bg-white hover:border-ocean-300'
              }`}
            >
              <p className="font-medium text-glass-900">{event.name}</p>
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                {dayLabels.map((label, idx) => {
                  const active = (event.days ?? []).map(weekdayToIndex).includes(idx)
                  return (
                    <span
                      key={`${event.id}-${label}`}
                      className={`rounded-full px-2 py-1 ${active ? 'bg-ocean-500 text-white' : 'bg-glass-100 text-glass-400'}`}
                    >
                      {label}
                    </span>
                  )
                })}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-glass-500">2. Date</p>
        <div className="grid grid-cols-3 gap-2">
          {allDates.slice(0, 21).map((d) => {
            const isToday = d.date === today
            const isSelected = d.date === selectedDate
            return (
              <button
                key={d.date}
                type="button"
                disabled={!d.available}
                onClick={() => d.available && setSelectedDate(d.date)}
                className={[
                  'rounded-lg px-2 py-2 text-xs transition',
                  d.available ? 'bg-ocean-500 text-white' : 'cursor-not-allowed bg-glass-100 text-glass-300 line-through',
                  isToday ? 'ring-2 ring-ocean-400' : '',
                  isSelected ? 'scale-105 bg-ocean-700' : '',
                ].join(' ')}
              >
                {d.date.slice(8, 10)}
              </button>
            )
          })}
        </div>
      </section>

      {sessions.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-glass-500">3. Session</p>
          <select
            className="w-full rounded-xl border border-glass-200 bg-white px-3 py-2 text-sm outline-none ring-ocean-300 transition focus:ring-2"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
          >
            {sessions.map((session) => (
              <option key={session.sessionId} value={session.time}>
                {session.time} - {session.available} places disponibles
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-glass-500">4. Participants</p>
        {[
          { label: translateLabel('Adultos', locale), value: adults, set: setAdults, min: 1 },
          { label: childAgeText, value: childs, set: setChilds, min: 0 },
          { label: infantAgeText, value: infants, set: setInfants, min: 0 },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-xl bg-glass-50 p-2">
            <span className="text-sm text-glass-700">{row.label}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => row.set(Math.max(row.min, row.value - 1))}
                className="h-8 w-8 rounded-full border border-glass-200"
              >
                -
              </button>
              <span className="w-6 text-center text-sm font-medium">{row.value}</span>
              <button
                type="button"
                onClick={() => row.set(row.value + 1)}
                className="h-8 w-8 rounded-full border border-glass-200"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-ocean-50 p-3">
        <p className="text-xs uppercase tracking-wider text-ocean-700">5. Total</p>
        <p className="text-2xl font-bold text-ocean-800">
          {new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(total)}
        </p>
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="w-full rounded-xl bg-ocean-600 px-4 py-3 font-semibold text-white transition hover:bg-ocean-700"
        >
          Reserver maintenant
        </button>
        <div className={`space-y-2 overflow-hidden transition-all duration-300 ${showForm ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <input
            className="w-full rounded-xl border border-glass-200 px-3 py-2 text-sm"
            placeholder="Nom complet"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-glass-200 px-3 py-2 text-sm"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-glass-200 px-3 py-2 text-sm"
            placeholder="Téléphone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-glass-900 px-4 py-3 font-semibold text-white transition hover:bg-black disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirmer et payer ->'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>
    </aside>
  )
}

