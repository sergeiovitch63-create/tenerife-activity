/**
 * /api/weather-live — shell endpoint, DORMANT by default.
 *
 * This route is wired up ahead of the provider integration so the
 * client-side `WeatherLive` card (and its scorer's `fetchKey`) have a
 * stable URL to target. Until the `WEATHER_LIVE_PROVIDER` env flag is
 * set to `aemet` or `openweather` with matching credentials, we return
 * a 503 with `Retry-After` so the client can gracefully fall back to
 * the static `weather-advisory` card.
 *
 * Contract (query string):
 *   zone      — GeoZone slug (e.g. "south", "center", "ocean")
 *   vectors   — comma-separated subset of [wind,waves,visibility,uv,rain,altitude]
 *   altitude  — optional: sea | low | mid | high
 *
 * Contract (response when enabled):
 *   {
 *     zone, altitude, observedAt,
 *     forecast: {
 *       wind?:       { kmh, gustKmh?, direction? },
 *       waves?:      { heightM, periodS? },
 *       visibility?: { km },
 *       uv?:         { index, label },
 *       rain?:       { chancePct, mm? },
 *     },
 *     ttlSeconds,  // UI respects; providers typically hand back 1h
 *   }
 *
 * Caching strategy (future):
 *   - 1h edge cache keyed on ?zone+vectors+altitude
 *   - providers differ in rate limits, so the adapter layer owns the
 *     rate-limit accounting
 *   - stale-while-revalidate with a 10-minute window
 *
 * Until then this route exists SOLELY to avoid 404s from the client
 * and to reserve the URL shape so the forthcoming work is a fill-in,
 * not a re-plumb.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// Edge runtime is intentional: when we hook up a provider, sub-100ms
// latency off the nearest PoP matters more than Node APIs.
export const runtime = 'edge'

type Provider = 'aemet' | 'openweather' | 'none'

type GeoZone =
  | 'south' | 'north' | 'west' | 'center' | 'east' | 'ocean' | 'unknown'
const VALID_ZONES: Set<GeoZone> = new Set([
  'south', 'north', 'west', 'center', 'east', 'ocean', 'unknown',
])

type Vector = 'wind' | 'waves' | 'visibility' | 'uv' | 'rain' | 'altitude'
const VALID_VECTORS: Set<Vector> = new Set([
  'wind', 'waves', 'visibility', 'uv', 'rain', 'altitude',
])

type Altitude = 'sea' | 'low' | 'mid' | 'high'
const VALID_ALTITUDES: Set<Altitude> = new Set(['sea', 'low', 'mid', 'high'])

function resolveProvider(): Provider {
  const raw = (process.env.WEATHER_LIVE_PROVIDER ?? '').toLowerCase()
  if (raw === 'aemet') return 'aemet'
  if (raw === 'openweather') return 'openweather'
  return 'none'
}

function hasCredentials(provider: Provider): boolean {
  if (provider === 'aemet') return !!process.env.AEMET_API_KEY
  if (provider === 'openweather') return !!process.env.OPENWEATHER_API_KEY
  return false
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const zone = (url.searchParams.get('zone') ?? '').toLowerCase()
  const vectorsRaw = (url.searchParams.get('vectors') ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  const altitudeRaw = (url.searchParams.get('altitude') ?? '').toLowerCase()

  if (!zone || !VALID_ZONES.has(zone as GeoZone)) {
    return NextResponse.json(
      { error: 'missing_or_invalid_zone' },
      { status: 400 },
    )
  }

  const vectors = vectorsRaw.filter((v): v is Vector =>
    VALID_VECTORS.has(v as Vector),
  )
  if (vectors.length === 0) {
    return NextResponse.json(
      { error: 'missing_vectors' },
      { status: 400 },
    )
  }

  const altitude =
    altitudeRaw && VALID_ALTITUDES.has(altitudeRaw as Altitude)
      ? (altitudeRaw as Altitude)
      : null

  const provider = resolveProvider()
  const hasCreds = hasCredentials(provider)

  // Dormant path: no provider configured OR credentials missing.
  // 503 + Retry-After is the semantically-right "come back later" —
  // the client renderer reads the body's `fallback: "weather-advisory"`
  // hint and swaps to the static card without flashing an error.
  if (provider === 'none' || !hasCreds) {
    return NextResponse.json(
      {
        status: 'dormant',
        reason:
          provider === 'none'
            ? 'provider_not_configured'
            : 'credentials_missing',
        fallback: 'weather-advisory',
        zone,
        vectors,
        altitude,
      },
      {
        status: 503,
        headers: {
          // Retry in ~15 min so the client doesn't hammer us while the
          // provider is off. Actual forecasts will be 1h-cached once
          // wired up.
          'Retry-After': '900',
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  // Live path: provider is set and credentials exist, but the adapter
  // hasn't been written yet. We return 501 so callers can distinguish
  // "not configured" (dormant, 503) from "configured but unimplemented"
  // (in progress, 501). Both carry the `fallback` hint.
  return NextResponse.json(
    {
      status: 'not_implemented',
      reason: 'adapter_pending',
      fallback: 'weather-advisory',
      provider,
      zone,
      vectors,
      altitude,
    },
    {
      status: 501,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
