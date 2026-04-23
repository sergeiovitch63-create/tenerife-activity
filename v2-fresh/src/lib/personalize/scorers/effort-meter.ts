/**
 * Effort-Meter scorer — server-safe.
 *
 * Physical / sensory effort rating on 4 axes:
 *   - walking   — how much on-foot movement is expected
 *   - altitude  — altitude gain / sustained exposure
 *   - climate   — heat / cold / sun exposure outside
 *   - motion    — seasickness / wind gusts / aerial / g-force
 *
 * Each axis returns a level 0..3 (rest / easy / moderate / strenuous)
 * plus a localization key explaining why. The hero summary averages
 * to an overall label.
 *
 * Distinct from `suitability-profile`, which covers demographic
 * compatibility (pregnancy, back problems, age limits). Effort-meter
 * is about "how much will this cost my body today".
 *
 * Skipped when:
 *  - all four axes are 0 AND there's no physical-sensitivity flag
 *    (nothing to warn about; silence is the honest signal)
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type EffortAxis = 'walking' | 'altitude' | 'climate' | 'motion'
export type EffortLevel = 0 | 1 | 2 | 3  // rest / easy / moderate / strenuous

export type AxisRating = {
  axis: EffortAxis
  level: EffortLevel
  reasonKey: string
}

export type EffortMeterProps = {
  axes: AxisRating[]
  /** Sum of levels — drives the overall badge (rest / light / moderate / demanding). */
  totalScore: number
  overall: 'rest' | 'light' | 'moderate' | 'demanding'
}

function rateWalking(s: ActivitySignals): AxisRating {
  if (s.setting.includes('hiking') || s.setting.includes('climbing') || s.setting.includes('caving')) {
    return { axis: 'walking', level: 3, reasonKey: 'walking_trek' }
  }
  if (s.setting.includes('park') || s.setting.includes('zoo') || s.setting.includes('waterpark')) {
    return { axis: 'walking', level: 2, reasonKey: 'walking_park' }
  }
  if (s.setting.includes('village') || s.setting.includes('monument') || s.setting.includes('museum')) {
    return { axis: 'walking', level: 2, reasonKey: 'walking_urban' }
  }
  if (s.setting.includes('mirador') || s.setting.includes('forest') || s.setting.includes('volcano')) {
    return { axis: 'walking', level: 1, reasonKey: 'walking_stroll' }
  }
  if (
    s.setting.includes('boat') ||
    s.setting.includes('catamaran') ||
    s.setting.includes('yacht') ||
    s.setting.includes('jetski') ||
    s.setting.includes('paragliding') ||
    s.setting.includes('helicopter')
  ) {
    return { axis: 'walking', level: 0, reasonKey: 'walking_none' }
  }
  return { axis: 'walking', level: 1, reasonKey: 'walking_light' }
}

function rateAltitude(s: ActivitySignals): AxisRating {
  if (s.altitude === 'high') {
    return { axis: 'altitude', level: 3, reasonKey: 'altitude_high' }
  }
  if (s.altitude === 'mid') {
    return { axis: 'altitude', level: 2, reasonKey: 'altitude_mid' }
  }
  if (s.setting.includes('paragliding') || s.setting.includes('helicopter')) {
    return { axis: 'altitude', level: 2, reasonKey: 'altitude_aerial' }
  }
  if (s.altitude === 'low') {
    return { axis: 'altitude', level: 1, reasonKey: 'altitude_low' }
  }
  return { axis: 'altitude', level: 0, reasonKey: 'altitude_sea' }
}

function rateClimate(s: ActivitySignals): AxisRating {
  const outdoor =
    s.setting.includes('hiking') ||
    s.setting.includes('volcano') ||
    s.setting.includes('beach') ||
    s.setting.includes('boat') ||
    s.setting.includes('catamaran') ||
    s.setting.includes('yacht') ||
    s.setting.includes('jetski') ||
    s.setting.includes('quad') ||
    s.setting.includes('buggy') ||
    s.setting.includes('paragliding') ||
    s.setting.includes('helicopter') ||
    s.setting.includes('climbing') ||
    s.setting.includes('bike')

  // Volcano + midday exposure can be brutal (Teide summit heat swings)
  if (s.setting.includes('volcano') && s.altitude === 'high') {
    return { axis: 'climate', level: 3, reasonKey: 'climate_alpine' }
  }
  if (outdoor && (s.setting.includes('beach') || s.setting.includes('boat'))) {
    return { axis: 'climate', level: 2, reasonKey: 'climate_sun' }
  }
  if (outdoor && s.altitudeSensitive) {
    return { axis: 'climate', level: 2, reasonKey: 'climate_exposed' }
  }
  if (s.setting.includes('caving')) {
    return { axis: 'climate', level: 1, reasonKey: 'climate_cool' }
  }
  if (outdoor) {
    return { axis: 'climate', level: 1, reasonKey: 'climate_outdoor' }
  }
  return { axis: 'climate', level: 0, reasonKey: 'climate_controlled' }
}

function rateMotion(s: ActivitySignals): AxisRating {
  if (s.setting.includes('paragliding') || s.setting.includes('helicopter')) {
    return { axis: 'motion', level: 3, reasonKey: 'motion_aerial' }
  }
  if (s.setting.includes('jetski')) {
    return { axis: 'motion', level: 3, reasonKey: 'motion_jetski' }
  }
  if (s.setting.includes('quad') || s.setting.includes('buggy')) {
    return { axis: 'motion', level: 2, reasonKey: 'motion_offroad' }
  }
  if (s.setting.includes('catamaran') || s.setting.includes('boat') || s.setting.includes('yacht')) {
    // Catamarans are much stabler than monohulls; boats generally
    // trigger motion sickness in ~25% of guests.
    return {
      axis: 'motion',
      level: s.setting.includes('catamaran') ? 1 : 2,
      reasonKey: s.setting.includes('catamaran') ? 'motion_catamaran' : 'motion_boat',
    }
  }
  if (s.setting.includes('diving') || s.setting.includes('snorkel') || s.setting.includes('surf')) {
    return { axis: 'motion', level: 1, reasonKey: 'motion_swell' }
  }
  if (s.setting.includes('bike') || s.setting.includes('scooter')) {
    return { axis: 'motion', level: 1, reasonKey: 'motion_road' }
  }
  return { axis: 'motion', level: 0, reasonKey: 'motion_none' }
}

export function effortMeterScorer(signals: ActivitySignals): ModuleScore | null {
  const axes: AxisRating[] = [
    rateWalking(signals),
    rateAltitude(signals),
    rateClimate(signals),
    rateMotion(signals),
  ]

  const totalScore = axes.reduce((acc, a) => acc + a.level, 0)

  // Hard skip: total=0 AND no sensitivity flags → nothing to meter.
  const hasSensitivity =
    signals.weatherSensitive ||
    signals.windSensitive ||
    signals.waveSensitive ||
    signals.altitudeSensitive ||
    signals.visibilitySensitive

  if (totalScore === 0 && !hasSensitivity) return null

  // Overall band
  let overall: EffortMeterProps['overall']
  if (totalScore <= 1) overall = 'rest'
  else if (totalScore <= 4) overall = 'light'
  else if (totalScore <= 7) overall = 'moderate'
  else overall = 'demanding'

  // --- Module score ------------------------------------------------
  // This is most valuable when effort is high (travellers over-estimate
  // their willingness and under-estimate fatigue) OR when there's a
  // single dominant axis they didn't think of (e.g. motion on a boat).
  let s = 46
  if (overall === 'demanding') s += 14
  else if (overall === 'moderate') s += 8
  else if (overall === 'light') s += 2
  // rest: baseline

  // Dominant outlier (one axis at 3 while others ≤1) = surprising fact
  const dominant = axes.filter((a) => a.level === 3).length
  const easy = axes.filter((a) => a.level <= 1).length
  if (dominant >= 1 && easy >= 3) s += 6

  // Multi-dimensional demand (e.g. hiking + altitude + heat)
  if (axes.filter((a) => a.level >= 2).length >= 3) s += 4

  // Redundancy damp: park activities already convey effort via theme
  if (signals.setting.includes('park') || signals.setting.includes('waterpark')) s -= 4

  s = Math.max(0, Math.min(72, s))

  return {
    id: 'effort-meter',
    score: s,
    slot: 'left-tertiary',
    reason: `overall=${overall}, total=${totalScore}, axes=${axes.map((a) => `${a.axis}:${a.level}`).join('|')}`,
    props: {
      axes,
      totalScore,
      overall,
    } satisfies EffortMeterProps,
  }
}
