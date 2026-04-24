'use client'

/**
 * UrgencyBadge — tiny client badge that reveals "why you should care now".
 *
 * Two modes:
 *   - `sunset`    → live countdown to today's sunset in Tenerife (UTC+0).
 *   - `live-spot` → gold-pulsing pill suggesting real-time availability.
 *
 * Sunset is approximated with a simple seasonal table — good enough for a
 * marketing signal, no external API call. For days after sunset we show
 * tomorrow's time so the chip never goes stale.
 */
import { useEffect, useMemo, useState } from 'react'
import { Sunset, Flame } from 'lucide-react'

type Props = {
  variant: 'sunset' | 'live-spot'
  labelSunset: string // "Coucher dans 2 h 34" (template filled at render)
  labelSunsetTomorrow: string // "Demain 19:42"
  labelLiveSpot: string // "Place live"
}

// Rough Tenerife sunset table (local time, 24h). Monthly avg is fine for
// an "in X h Y" chip — we're not booking flights with it.
const SUNSET_BY_MONTH: Record<number, string> = {
  1: '18:20',
  2: '18:50',
  3: '19:20',
  4: '20:45',
  5: '21:05',
  6: '21:20',
  7: '21:15',
  8: '20:50',
  9: '20:10',
  10: '19:25',
  11: '18:45',
  12: '18:15',
}

function diffHM(target: Date, now: Date): { h: number; m: number; total: number } {
  const total = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000))
  return { h: Math.floor(total / 60), m: total % 60, total }
}

export function UrgencyBadge({
  variant,
  labelSunset,
  labelSunsetTomorrow,
  labelLiveSpot,
}: Props) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const content = useMemo(() => {
    if (variant === 'live-spot') return labelLiveSpot
    if (!now) return labelSunset.replace('{time}', '—')

    const month = now.getMonth() + 1
    const [hh, mm] = (SUNSET_BY_MONTH[month] ?? '20:00').split(':').map(Number)
    const todaySunset = new Date(now)
    todaySunset.setHours(hh, mm, 0, 0)

    if (now.getTime() < todaySunset.getTime()) {
      const { h, m } = diffHM(todaySunset, now)
      const txt = h > 0 ? `${h} h ${m.toString().padStart(2, '0')}` : `${m} min`
      return labelSunset.replace('{time}', txt)
    }
    // After sunset — show tomorrow's time.
    const tomorrowMonth = new Date(now.getTime() + 86_400_000).getMonth() + 1
    const [th, tm] = (SUNSET_BY_MONTH[tomorrowMonth] ?? '20:00').split(':').map(Number)
    return labelSunsetTomorrow.replace(
      '{time}',
      `${th.toString().padStart(2, '0')}:${tm.toString().padStart(2, '0')}`,
    )
  }, [variant, now, labelSunset, labelSunsetTomorrow, labelLiveSpot])

  if (variant === 'live-spot') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold-500/15 text-brand-gold-700 border border-brand-gold-300 px-2 py-0.5 text-[11px] font-semibold">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-gold-500" />
        </span>
        <Flame className="w-3 h-3" />
        {content}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-turquoise-50 text-brand-turquoise-800 border border-brand-turquoise-200 px-2 py-0.5 text-[11px] font-semibold">
      <Sunset className="w-3 h-3" />
      {content}
    </span>
  )
}
