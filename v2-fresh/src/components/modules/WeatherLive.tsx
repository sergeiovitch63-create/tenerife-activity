'use client'

/**
 * Weather-Live card — client-side fetch of live meteo.
 *
 * Skeleton. Only renders when the scorer is enabled via
 * `PERSONALIZE_WEATHER_LIVE=1`. The scorer lives at
 * `src/lib/personalize/scorers/weather-live.ts` and is NOT wired into
 * the registry until the `/api/weather-live` endpoint and cache layer
 * land.
 *
 * Fetch + cache shape is deliberate stub — the component shows a
 * shimmering placeholder and a "check live forecast" deep link. When
 * the API endpoint ships, swap `useWeatherLive` to a real hook.
 */

import { useEffect, useState } from 'react'
import { Wind, Waves, Eye, Sun, CloudRain, Mountain, ExternalLink } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type { WeatherLiveProps } from '@/lib/personalize/scorers/weather-live'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

type LiveReading = {
  windKmh: number | null
  waveM: number | null
  visibilityKm: number | null
  uv: number | null
  rainMm: number | null
  updatedAt: string | null
}

const VECTOR_ICON: Record<WeatherLiveProps['vectors'][number], LucideIcon> = {
  wind: Wind,
  waves: Waves,
  visibility: Eye,
  uv: Sun,
  rain: CloudRain,
  altitude: Mountain,
}

function useWeatherLive(fetchKey: string): { data: LiveReading | null; loading: boolean } {
  const [data, setData] = useState<LiveReading | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const r = await fetch(`/api/weather-live?k=${encodeURIComponent(fetchKey)}`, {
          cache: 'no-store',
        })
        if (!r.ok) throw new Error(`status ${r.status}`)
        const json = (await r.json()) as LiveReading
        if (!cancelled) setData(json)
      } catch {
        // Endpoint not live yet — silent fallback.
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [fetchKey])

  return { data, loading }
}

export function WeatherLiveCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as WeatherLiveProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const { data, loading } = useWeatherLive(props.fetchKey)

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-100">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 rounded-xl bg-white p-2 ring-1 ring-sky-200 shadow-sm">
          <Wind className="h-4 w-4 text-sky-700" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">{labels.title}</h3>
          <p className="text-xs leading-snug text-neutral-600">{labels.subtitle}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {props.vectors.slice(0, 4).map((v) => {
          const Icon = VECTOR_ICON[v]
          const value = loading ? null : readingFor(v, data)
          return (
            <div
              key={v}
              className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-neutral-200"
            >
              <Icon className="h-3.5 w-3.5 text-neutral-500" strokeWidth={2.5} />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  {labels[`vector_${v}`]}
                </div>
                <div className="text-sm font-semibold text-neutral-900">
                  {loading ? (
                    <span className="inline-block h-3 w-10 animate-pulse rounded bg-neutral-200" />
                  ) : value ? (
                    value
                  ) : (
                    <span className="text-xs text-neutral-400">{labels.noData}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <a
        href={deepLinkFor(props)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900"
      >
        {labels.checkLive}
        <ExternalLink className="h-3 w-3" strokeWidth={2.5} />
      </a>
    </div>
  )
}

function readingFor(
  v: WeatherLiveProps['vectors'][number],
  data: LiveReading | null,
): string | null {
  if (!data) return null
  switch (v) {
    case 'wind':
      return data.windKmh != null ? `${Math.round(data.windKmh)} km/h` : null
    case 'waves':
      return data.waveM != null ? `${data.waveM.toFixed(1)} m` : null
    case 'visibility':
      return data.visibilityKm != null ? `${Math.round(data.visibilityKm)} km` : null
    case 'uv':
      return data.uv != null ? `UV ${Math.round(data.uv)}` : null
    case 'rain':
      return data.rainMm != null ? `${data.rainMm.toFixed(1)} mm` : null
    case 'altitude':
      // Altitude uses the visibility reading as proxy.
      return data.visibilityKm != null ? `${Math.round(data.visibilityKm)} km` : null
  }
}

function deepLinkFor(props: WeatherLiveProps): string {
  // AEMET municipal forecast for the island as a fallback.
  if (props.altitude === 'high') return 'https://www.aemet.es/es/eltiempo/prediccion/montana'
  if (props.vectors.includes('waves')) return 'https://www.aemet.es/es/eltiempo/prediccion/maritima'
  return 'https://www.aemet.es/es/eltiempo/prediccion/municipios/tenerife'
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Météo en direct',
    subtitle: 'Conditions actualisées pour cette zone.',
    vector_wind: 'Vent',
    vector_waves: 'Vagues',
    vector_visibility: 'Visibilité',
    vector_uv: 'UV',
    vector_rain: 'Pluie',
    vector_altitude: 'Altitude',
    noData: '—',
    checkLive: 'Prévisions AEMET',
  },
  en: {
    title: 'Live weather',
    subtitle: 'Refreshed conditions for this zone.',
    vector_wind: 'Wind',
    vector_waves: 'Waves',
    vector_visibility: 'Visibility',
    vector_uv: 'UV',
    vector_rain: 'Rain',
    vector_altitude: 'Altitude',
    noData: '—',
    checkLive: 'AEMET forecast',
  },
  es: {
    title: 'Tiempo en directo',
    subtitle: 'Condiciones actualizadas en esta zona.',
    vector_wind: 'Viento',
    vector_waves: 'Olas',
    vector_visibility: 'Visibilidad',
    vector_uv: 'UV',
    vector_rain: 'Lluvia',
    vector_altitude: 'Altitud',
    noData: '—',
    checkLive: 'Previsión AEMET',
  },
  de: {
    title: 'Wetter live',
    subtitle: 'Aktuelle Bedingungen für diese Zone.',
    vector_wind: 'Wind',
    vector_waves: 'Wellen',
    vector_visibility: 'Sicht',
    vector_uv: 'UV',
    vector_rain: 'Regen',
    vector_altitude: 'Höhe',
    noData: '—',
    checkLive: 'AEMET-Vorhersage',
  },
  it: {
    title: 'Meteo in diretta',
    subtitle: 'Condizioni aggiornate per questa zona.',
    vector_wind: 'Vento',
    vector_waves: 'Onde',
    vector_visibility: 'Visibilità',
    vector_uv: 'UV',
    vector_rain: 'Pioggia',
    vector_altitude: 'Altitudine',
    noData: '—',
    checkLive: 'Previsioni AEMET',
  },
  ru: {
    title: 'Погода в реальном времени',
    subtitle: 'Актуальные условия в этой зоне.',
    vector_wind: 'Ветер',
    vector_waves: 'Волны',
    vector_visibility: 'Видимость',
    vector_uv: 'УФ',
    vector_rain: 'Дождь',
    vector_altitude: 'Высота',
    noData: '—',
    checkLive: 'Прогноз AEMET',
  },
}
