/**
 * Weather Advisory scorer — server-safe.
 *
 * Surfaces the weather conditions that actually matter for the activity
 * (wind for paragliding, waves for boats, visibility for Teide, etc.)
 * with deep-link hints to AEMET/Windy in the client renderer.
 *
 * Returns null for indoor-only activities. Max score capped at 75 so it
 * sits below the primary sunset adapter and the packing list.
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type AdvisoryIconName =
  | 'CloudRain'
  | 'Wind'
  | 'Waves'
  | 'Eye'
  | 'Mountain'
  | 'CloudSun'

export type Advisory = {
  key: string
  icon: AdvisoryIconName
  textKey: string
  checkLinkKey?: 'aemet' | 'marine' | 'windyTeide' | 'windyParagliding'
}

function buildAdvisories(signals: ActivitySignals): Advisory[] {
  const advisories: Advisory[] = []

  if (signals.setting.includes('paragliding')) {
    advisories.push({
      key: 'wind-paragliding',
      icon: 'Wind',
      textKey: 'windParagliding',
      checkLinkKey: 'windyParagliding',
    })
  } else if (signals.windSensitive) {
    advisories.push({
      key: 'wind-general',
      icon: 'Wind',
      textKey: 'windGeneral',
      checkLinkKey: 'marine',
    })
  }

  if (signals.waveSensitive) {
    advisories.push({
      key: 'waves',
      icon: 'Waves',
      textKey: 'waves',
      checkLinkKey: 'marine',
    })
  }

  if (signals.visibilitySensitive && signals.altitude !== 'sea') {
    advisories.push({
      key: 'visibility',
      icon: 'Eye',
      textKey: 'visibility',
      checkLinkKey: 'windyTeide',
    })
  }

  const rainPossible =
    signals.weatherSensitive &&
    (signals.setting.includes('hiking') ||
      signals.setting.includes('quad') ||
      signals.setting.includes('buggy') ||
      signals.setting.includes('bike') ||
      signals.setting.includes('mirador'))
  if (rainPossible) {
    advisories.push({
      key: 'rain',
      icon: 'CloudRain',
      textKey: 'rain',
      checkLinkKey: 'aemet',
    })
  }

  if (signals.altitude === 'high') {
    advisories.push({
      key: 'altitude-weather',
      icon: 'Mountain',
      textKey: 'altitudeWeather',
      checkLinkKey: 'aemet',
    })
  }

  return advisories
}

export function weatherAdvisoryScorer(signals: ActivitySignals): ModuleScore | null {
  const indoorOnly =
    (signals.setting.includes('museum') ||
      signals.setting.includes('winery') ||
      signals.setting.includes('restaurant') ||
      signals.setting.includes('waterpark')) &&
    !signals.weatherSensitive
  if (indoorOnly) return null

  const advisories = buildAdvisories(signals)
  if (advisories.length === 0) return null

  let s = 55
  if (advisories.length >= 2) s = 65
  if (advisories.length >= 3) s = 72
  if (signals.setting.includes('paragliding')) s += 5
  if (signals.altitude === 'high') s += 5

  s = Math.min(75, s)

  return {
    id: 'weather-advisory',
    score: s,
    slot: 'left-tertiary',
    reason: `${advisories.length} weather concerns`,
    props: { advisories },
  }
}
