/**
 * Weather-Live scorer — server-safe skeleton, DISABLED by default.
 *
 * Purpose (future): replace the static `weather-advisory` card with a
 * real-time readout — wind km/h, wave height, visibility km, UV index —
 * pulled from AEMET (Canarian meteo authority) or OpenWeather.
 *
 * Why this file is a skeleton:
 *   1. AEMET requires an API key with per-request rate limits and
 *      queryable endpoints per municipality — we need a per-zone
 *      mapping table we don't have yet.
 *   2. OpenWeather gives a simpler API but consumes paid credits for
 *      hourly forecasts; we want to negotiate the plan first.
 *   3. Caching strategy matters: forecasts valid for 1 hour, stale data
 *      is worse than no data. Needs Redis / KV or edge runtime cache.
 *
 * So: this scorer gates on the env flag `PERSONALIZE_WEATHER_LIVE=1`
 * and on activity weather-sensitivity. When enabled, it emits a
 * placeholder `ModuleScore` carrying only a zone hint — the client
 * renderer fetches live data from `/api/weather-live?zone=X` and
 * degrades gracefully if that endpoint is missing.
 *
 * Slot: left-primary (above weather-advisory). Cap=2 on that slot
 * means weather-live displaces weather-advisory when both fire.
 *
 * NOT YET in registry — wire in only after the `/api/weather-live`
 * endpoint and cache layer land.
 */

import type { ActivitySignals, ModuleScore, GeoZone } from '../types'

export type WeatherLiveProps = {
  /** Zone used for forecast lookup. */
  zone: GeoZone
  /** Activity's altitude band — UI picks the right forecast vertical. */
  altitude: ActivitySignals['altitude']
  /** Which vectors the activity is sensitive to — UI trims noise. */
  vectors: Array<'wind' | 'waves' | 'visibility' | 'uv' | 'rain' | 'altitude'>
  /** Hint for client-side fetch key. */
  fetchKey: string
}

function isEnabled(): boolean {
  // Server: real env var. Client: undefined process.env is fine — scorer
  // only runs in SSR/RSC paths for render, and in edge functions. For
  // client-side recomposition, we rely on the module being in registry
  // or not (feature flag at build time).
  if (typeof process === 'undefined') return false
  return process.env.PERSONALIZE_WEATHER_LIVE === '1'
}

export function weatherLiveScorer(signals: ActivitySignals): ModuleScore | null {
  if (!isEnabled()) return null

  const vectors: WeatherLiveProps['vectors'] = []
  if (signals.windSensitive) vectors.push('wind')
  if (signals.waveSensitive) vectors.push('waves')
  if (signals.visibilitySensitive) vectors.push('visibility')
  if (signals.weatherSensitive) vectors.push('rain')
  if (signals.altitude === 'high' || signals.altitudeSensitive) {
    vectors.push('altitude')
  }
  // UV matters for long daylight outdoor activities.
  const isLongOutdoor =
    (signals.durationMinutes ?? 0) >= 180 &&
    (signals.setting.includes('hiking') ||
      signals.setting.includes('bike') ||
      signals.setting.includes('catamaran') ||
      signals.setting.includes('boat'))
  if (isLongOutdoor) vectors.push('uv')

  if (vectors.length === 0) return null

  // Compose a stable fetch key so the client can cache per zone+vectors.
  const zone = signals.zone ?? 'unknown'
  const fetchKey = `${zone}|${vectors.sort().join(',')}`

  // Base score tuned to displace weather-advisory when both fire.
  let s = 62
  if (vectors.length >= 3) s += 6
  if (vectors.includes('wind') && signals.setting.includes('paragliding')) s += 6
  if (vectors.includes('visibility') && signals.altitude === 'high') s += 4
  s = Math.min(78, s)

  return {
    id: 'weather-live',
    score: s,
    slot: 'left-primary',
    reason: `live meteo, zone=${zone}, vectors=[${vectors.join(',')}]`,
    props: {
      zone,
      altitude: signals.altitude,
      vectors,
      fetchKey,
    } satisfies WeatherLiveProps,
  }
}
