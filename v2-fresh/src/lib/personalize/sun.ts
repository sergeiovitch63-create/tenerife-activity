/**
 * Minimal sunrise/sunset calculator — NOAA algorithm.
 * Accurate to ~1 minute. No external dependencies.
 *
 * For Tenerife, default coords: 28.27 N, 16.64 W (Teide center).
 * Caller should pass the activity's lat/lng for precision.
 */

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

function toJulianCentury(jd: number): number {
  return (jd - 2451545) / 36525
}

/**
 * Compute sunrise/sunset for a given date + location.
 * Returns UTC times. For Tenerife local time, add 0 or +1h
 * (Canary uses WET = UTC+0, WEST = UTC+1 from last Sunday of March).
 *
 * @param date — The date (year, month, day; time-of-day ignored)
 * @param lat — Latitude in degrees (positive N)
 * @param lng — Longitude in degrees (positive E, so Tenerife is NEGATIVE)
 * @returns { sunriseUtc, sunsetUtc } as Date objects, or null if polar day/night
 */
export function getSunTimesUtc(
  date: Date,
  lat: number,
  lng: number,
): { sunriseUtc: Date; sunsetUtc: Date } | null {
  // Day at midnight UTC
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const jd = julianDate(dayStart) + 0.5 - lng / 360 // approximate solar noon
  const T = toJulianCentury(jd)

  // Mean longitude of sun (deg)
  const L = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360

  // Mean anomaly (deg)
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T)
  const Mrad = M * DEG2RAD

  // Sun's equation of center
  const C =
    Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mrad) * 0.000289

  const trueLong = L + C
  const omega = 125.04 - 1934.136 * T
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG2RAD)

  // Obliquity of ecliptic
  const epsilon0 =
    23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
  const epsilon = epsilon0 + 0.00256 * Math.cos(omega * DEG2RAD)

  // Declination
  const delta = Math.asin(Math.sin(epsilon * DEG2RAD) * Math.sin(lambda * DEG2RAD))

  // Hour angle at sunrise/sunset (zenith = 90°50')
  const zenith = 90.833
  const cosH =
    (Math.cos(zenith * DEG2RAD) - Math.sin(lat * DEG2RAD) * Math.sin(delta)) /
    (Math.cos(lat * DEG2RAD) * Math.cos(delta))

  if (cosH > 1 || cosH < -1) return null // polar night / midnight sun — never on Tenerife

  const H = Math.acos(cosH) * RAD2DEG // degrees

  // Equation of time (minutes)
  const y = Math.tan((epsilon / 2) * DEG2RAD) ** 2
  const Lrad = L * DEG2RAD
  const eccentricity = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
  const eqTime =
    4 *
    RAD2DEG *
    (y * Math.sin(2 * Lrad) -
      2 * eccentricity * Math.sin(Mrad) +
      4 * eccentricity * y * Math.sin(Mrad) * Math.cos(2 * Lrad) -
      0.5 * y * y * Math.sin(4 * Lrad) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * Mrad))

  // Solar noon in UTC minutes from midnight
  const solarNoonUtc = 720 - 4 * lng - eqTime // minutes

  const sunriseUtcMin = solarNoonUtc - 4 * H
  const sunsetUtcMin = solarNoonUtc + 4 * H

  return {
    sunriseUtc: new Date(dayStart.getTime() + sunriseUtcMin * 60000),
    sunsetUtc: new Date(dayStart.getTime() + sunsetUtcMin * 60000),
  }
}

/**
 * Return the sunset time on Tenerife local time (Europe/Canary, auto DST)
 * as an HH:mm string.
 */
export function getSunsetLocal(
  date: Date,
  lat = 28.27,
  lng = -16.64,
): { hh: number; mm: number; iso: string } | null {
  const times = getSunTimesUtc(date, lat, lng)
  if (!times) return null
  // Canary timezone = UTC+0 or UTC+1 (DST). Easiest: use Intl to format.
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Atlantic/Canary',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(times.sunsetUtc)
  const hh = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
  const mm = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
  return {
    hh,
    mm,
    iso: `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`,
  }
}

/**
 * Given a sunset time and a list of candidate departure times,
 * return the best one — the latest slot whose activity duration
 * would END around sunset (i.e. start ~90 min before sunset for a
 * 2h activity, 60 min before for a 1h activity).
 */
export function pickBestSunsetSlot(
  sunsetHH: number,
  sunsetMM: number,
  times: string[], // e.g. ['17:00','18:00','19:00']
  activityDurationMinutes = 120,
): { bestTime: string | null; gapMinutes: number | null } {
  const sunsetMinutes = sunsetHH * 60 + sunsetMM
  // We want the activity to end AT sunset (best photos) → start = sunset - duration
  const idealStart = sunsetMinutes - activityDurationMinutes

  let best: string | null = null
  let bestGap = Infinity
  for (const t of times) {
    const m = t.match(/^(\d{1,2}):(\d{2})/)
    if (!m) continue
    const tm = parseInt(m[1]) * 60 + parseInt(m[2])
    const gap = Math.abs(tm - idealStart)
    if (gap < bestGap) {
      bestGap = gap
      best = t
    }
  }
  return { bestTime: best, gapMinutes: best == null ? null : bestGap }
}
