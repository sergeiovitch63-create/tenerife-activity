/**
 * Sunset-Time Adapter card — interactive.
 *
 * The user can pick any date and see:
 *   - The exact sunset time at the activity's coordinates.
 *   - The best available departure slot (so the activity ends near sunset).
 *
 * Scoring + input shaping lives in
 * `src/lib/personalize/scorers/sunset-time-adapter.ts` (server-safe).
 * This file is client-only because it uses `useState` for the date picker
 * and runs the sun calculation in the browser.
 */

'use client'

import { useMemo, useState } from 'react'
import { Sunset } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import { getSunsetLocal, pickBestSunsetSlot } from '@/lib/personalize/sun'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export function SunsetTimeAdapterCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as {
    lat: number
    lng: number
    durationMinutes: number
    availableTimes: string[]
    isBoat: boolean
    isParagliding: boolean
  }

  const today = useMemo(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  }, [])

  const [dateStr, setDateStr] = useState(today)

  const { sunsetText, bestSlot } = useMemo(() => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    const sunset = getSunsetLocal(date, props.lat, props.lng)
    if (!sunset) return { sunsetText: '—', bestSlot: null as string | null }
    const { bestTime, gapMinutes } = pickBestSunsetSlot(
      sunset.hh,
      sunset.mm,
      props.availableTimes,
      props.durationMinutes,
    )
    // Only show the recommendation if the available slot is within 2h of ideal.
    const MAX_GAP_MIN = 120
    const usableSlot =
      bestTime && gapMinutes != null && gapMinutes <= MAX_GAP_MIN ? bestTime : null
    return { sunsetText: sunset.iso, bestSlot: usableSlot }
  }, [dateStr, props.lat, props.lng, props.durationMinutes, props.availableTimes])

  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr

  return (
    <div className="rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 p-2.5 shadow-sm">
          <Sunset className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900">{labels.title}</h3>
          <p className="mt-0.5 text-sm text-neutral-600">{labels.subtitle}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-neutral-700">{labels.pickDate}</span>
              <input
                type="date"
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                min={today}
                className="mt-1 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </label>
            <div className="flex flex-col justify-end">
              <span className="text-xs font-medium text-neutral-700">{labels.sunsetLabel}</span>
              <span className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">
                {sunsetText}
              </span>
            </div>
          </div>

          {bestSlot ? (
            <div className="mt-4 rounded-2xl bg-white/70 p-3 backdrop-blur">
              <p className="text-sm text-neutral-700">
                <span className="font-medium text-neutral-900">{labels.recommendedSlot} </span>
                <span className="rounded-lg bg-amber-500 px-2 py-0.5 text-white font-semibold tabular-nums">
                  {bestSlot}
                </span>
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {props.isParagliding
                  ? labels.hintParagliding
                  : props.isBoat
                  ? labels.hintBoat
                  : labels.hintGeneric}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-neutral-500">{labels.noSlots}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Minimal inline translations — these will be migrated to the main dict
// files in a follow-up. Inlining here lets us ship the module independently.
const TRANSLATIONS: Record<string, {
  title: string
  subtitle: string
  pickDate: string
  sunsetLabel: string
  recommendedSlot: string
  hintBoat: string
  hintParagliding: string
  hintGeneric: string
  noSlots: string
}> = {
  fr: {
    title: 'Coucher de soleil parfait',
    subtitle: 'On ajuste l\'horaire pour que votre activité finisse pile au bon moment.',
    pickDate: 'Votre date',
    sunsetLabel: 'Coucher de soleil',
    recommendedSlot: 'Créneau idéal :',
    hintBoat: 'Embarquement recommandé pour profiter du coucher depuis le large.',
    hintParagliding: 'Décollage recommandé pour un atterrissage au moment du crépuscule.',
    hintGeneric: 'L\'activité se termine autour du coucher de soleil.',
    noSlots: 'Aucun créneau ne correspond parfaitement au coucher ce jour-là.',
  },
  en: {
    title: 'Perfect sunset timing',
    subtitle: 'We adjust the departure so your activity ends right at golden hour.',
    pickDate: 'Your date',
    sunsetLabel: 'Sunset',
    recommendedSlot: 'Best slot:',
    hintBoat: 'Boarding recommended to catch the sunset from the open sea.',
    hintParagliding: 'Take-off recommended to land right at dusk.',
    hintGeneric: 'Activity ends around sunset.',
    noSlots: 'No slot matches sunset on this date.',
  },
  es: {
    title: 'Puesta de sol perfecta',
    subtitle: 'Ajustamos el horario para que tu actividad termine justo en el mejor momento.',
    pickDate: 'Tu fecha',
    sunsetLabel: 'Puesta de sol',
    recommendedSlot: 'Horario ideal:',
    hintBoat: 'Embarque recomendado para disfrutar el ocaso desde alta mar.',
    hintParagliding: 'Despegue recomendado para aterrizar al anochecer.',
    hintGeneric: 'La actividad termina al atardecer.',
    noSlots: 'Ningún horario coincide con el atardecer ese día.',
  },
  de: {
    title: 'Perfekter Sonnenuntergang',
    subtitle: 'Wir stimmen die Uhrzeit so ab, dass Ihre Aktivität zur goldenen Stunde endet.',
    pickDate: 'Ihr Datum',
    sunsetLabel: 'Sonnenuntergang',
    recommendedSlot: 'Empfohlener Slot:',
    hintBoat: 'Einschiffung empfohlen, um den Sonnenuntergang vom Meer aus zu erleben.',
    hintParagliding: 'Start empfohlen für Landung in der Dämmerung.',
    hintGeneric: 'Aktivität endet bei Sonnenuntergang.',
    noSlots: 'Kein Slot passt zum Sonnenuntergang an diesem Tag.',
  },
  it: {
    title: 'Tramonto perfetto',
    subtitle: 'Regoliamo l\'orario per far finire la tua attività nel momento giusto.',
    pickDate: 'La tua data',
    sunsetLabel: 'Tramonto',
    recommendedSlot: 'Orario consigliato:',
    hintBoat: 'Imbarco consigliato per goderti il tramonto dal mare aperto.',
    hintParagliding: 'Decollo consigliato per atterrare al crepuscolo.',
    hintGeneric: 'L\'attività termina al tramonto.',
    noSlots: 'Nessun orario coincide con il tramonto in questo giorno.',
  },
  ru: {
    title: 'Идеальный закат',
    subtitle: 'Мы подберём время так, чтобы экскурсия завершилась на закате.',
    pickDate: 'Ваша дата',
    sunsetLabel: 'Закат',
    recommendedSlot: 'Лучшее время:',
    hintBoat: 'Рекомендуемое отправление, чтобы встретить закат в открытом море.',
    hintParagliding: 'Взлёт для приземления в сумерках.',
    hintGeneric: 'Активность завершится на закате.',
    noSlots: 'Нет слота, совпадающего с закатом в эту дату.',
  },
}
