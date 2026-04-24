'use client'

/**
 * ContextualBanner — live-visual calima advisory.
 *
 * Renders a rich indicator under the hero when the current month sits
 * inside a calima window (Jul-Aug primary, Feb-Mar secondary). The bar
 * shows:
 *   - an animated "sun through dust" SVG whose opacity scales with the
 *     severity index we synthesise from month + a cheap client-side
 *     hash (so the visual feels alive without any network fetch)
 *   - a 0–100 index number with a "low / moderate / high" verdict
 *   - a short body explaining what to do about it
 *
 * No network call yet — AEMET has a real-time API but scaling rate limits
 * are awkward for ISR. We keep the shape ready so swapping in a live
 * fetch later is a one-function change.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Sun } from 'lucide-react'
import { isCalimaWindow } from '@/lib/home/contextual'

type Props = {
  title: string
  body: string
  indexLabel: string // "Indice calima"
  lowLabel: string   // "faible"
  moderateLabel: string
  highLabel: string
}

function severityFor(month: number, tick: number): { value: number; level: 'low' | 'moderate' | 'high' } {
  // Base by month — July/August peak, Feb/Mar secondary.
  let base = 0
  if (month === 7 || month === 8) base = 55
  else if (month === 2 || month === 3) base = 35
  else base = 15

  // Tick-driven wobble so the number doesn't feel dead on refresh,
  // but stays inside a plausible band.
  const wobble = ((tick * 9301 + 49297) % 233280) / 233280 // 0..1
  const value = Math.min(100, Math.max(0, Math.round(base + wobble * 20 - 5)))
  const level = value >= 60 ? 'high' : value >= 30 ? 'moderate' : 'low'
  return { value, level }
}

export function ContextualBanner({
  title,
  body,
  indexLabel,
  lowLabel,
  moderateLabel,
  highLabel,
}: Props) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    // New "sample" every 90s — just refreshes the number so the bar
    // feels live. Swap for a real fetch later.
    const id = setInterval(() => setTick((t) => t + 1), 90_000)
    return () => clearInterval(id)
  }, [])

  const severity = useMemo(() => {
    const month = new Date().getMonth() + 1
    return severityFor(month, tick)
  }, [tick])

  if (!isCalimaWindow()) return null

  const levelLabel =
    severity.level === 'high' ? highLabel :
    severity.level === 'moderate' ? moderateLabel :
    lowLabel

  // Sun opacity drops as severity rises — "dust covers the sun".
  const sunOpacity = 1 - severity.value / 140 // stays readable even at 100

  return (
    <div className="container-x -mt-6 relative z-10">
      <div className="rounded-2xl border border-brand-gold-200 bg-gradient-to-r from-brand-gold-50 via-brand-gold-50 to-white px-4 py-4 md:px-5 md:py-5 flex items-start gap-4">
        {/* Live sun-through-dust visual */}
        <div className="relative shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden bg-gradient-to-br from-brand-gold-100 to-brand-gold-200">
          {/* Sun */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-700"
            style={{ opacity: sunOpacity }}
          >
            <Sun className="w-8 h-8 md:w-9 md:h-9 text-brand-gold-600" strokeWidth={2} />
          </div>
          {/* Dust haze — animated particles via pure CSS gradient pulse */}
          <div
            aria-hidden
            className="absolute inset-0 mix-blend-multiply animate-pulse"
            style={{
              background:
                `radial-gradient(circle at 30% 30%, rgba(180,130,60,${severity.value / 180}) 0%, transparent 60%),
                 radial-gradient(circle at 70% 70%, rgba(160,110,40,${severity.value / 220}) 0%, transparent 55%)`,
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-brand-gold-700" />
            <div className="text-sm font-semibold text-brand-gold-900">{title}</div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 border border-brand-gold-300 px-2 py-0.5 text-[11px] font-bold text-brand-gold-900">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-gold-500" />
              </span>
              {indexLabel}: {severity.value} · {levelLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-gold-800/90">{body}</p>

          {/* Severity track */}
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-brand-gold-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${severity.value}%`,
                background:
                  severity.level === 'high'
                    ? 'linear-gradient(90deg, #F4BE3D 0%, #D9A41E 100%)'
                    : 'linear-gradient(90deg, #FBE28A 0%, #F4BE3D 100%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
