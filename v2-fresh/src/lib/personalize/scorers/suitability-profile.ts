/**
 * Suitability Profile scorer — server-safe.
 *
 * Produces a physical-demand rating (1-5) and a list of facts grounded
 * in actual API fields (childAge, pickup, duration, altitude, setting).
 * Needs at least 2 derivable facts to render.
 *
 * Icon references are stored as string names; the client renderer
 * resolves them to Lucide components.
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type SuitabilityIconName =
  | 'Users'
  | 'Baby'
  | 'Activity'
  | 'Car'
  | 'Mountain'
  | 'Waves'
  | 'Sun'
  | 'Flame'
  | 'Clock'

export type SuitabilityFact = {
  key: string
  icon: SuitabilityIconName
  tone: 'good' | 'info' | 'warn'
  textKey: string
  params?: Record<string, string | number>
}

function computeDemand(signals: ActivitySignals): number {
  let demand = 1

  if (signals.intensity === 'moderate') demand = 2
  if (signals.intensity === 'adrenaline') demand = 4

  if (signals.setting.includes('hiking')) {
    demand = Math.max(demand, 3)
    if (signals.altitude === 'high') demand = 5
    else if (signals.altitude === 'mid') demand = 4
  }

  if (signals.setting.includes('climbing') || signals.setting.includes('caving')) {
    demand = Math.max(demand, 4)
  }

  if (signals.setting.includes('paragliding')) demand = Math.max(demand, 3)
  if (signals.setting.includes('diving')) demand = Math.max(demand, 3)
  if (signals.setting.includes('surf')) demand = Math.max(demand, 3)
  if (signals.setting.includes('jetski')) demand = Math.max(demand, 3)
  if (signals.setting.includes('quad') || signals.setting.includes('buggy')) demand = Math.max(demand, 3)
  if (signals.setting.includes('bike')) demand = Math.max(demand, 3)

  // Long duration pushes demand up one notch
  if (signals.durationMinutes && signals.durationMinutes >= 300 && demand < 5) {
    demand = Math.min(5, demand + 1)
  }

  // Passive boat is RELAXED
  const isPassiveBoat =
    (signals.setting.includes('boat') ||
      signals.setting.includes('catamaran') ||
      signals.setting.includes('yacht')) &&
    !signals.setting.includes('jetski') &&
    !signals.setting.includes('fishing') &&
    !signals.setting.includes('diving')
  if (isPassiveBoat) demand = Math.min(demand, 2)

  // Purely indoor = low
  if (
    signals.setting.includes('winery') ||
    signals.setting.includes('restaurant') ||
    signals.setting.includes('museum')
  ) {
    demand = 1
  }

  return demand
}

function buildFacts(signals: ActivitySignals): SuitabilityFact[] {
  const facts: SuitabilityFact[] = []

  // 1. Minimum age — ONLY if we actually have the data
  if (signals.minChildAge != null) {
    if (signals.minChildAge <= 2 || signals.hasInfantAge) {
      facts.push({ key: 'infants-ok', icon: 'Baby', tone: 'good', textKey: 'infantsOk' })
    } else if (signals.minChildAge <= 5) {
      facts.push({
        key: 'young-children',
        icon: 'Users',
        tone: 'good',
        textKey: 'youngChildren',
        params: { age: signals.minChildAge },
      })
    } else {
      facts.push({
        key: 'min-age',
        icon: 'Users',
        tone: 'info',
        textKey: 'minAge',
        params: { age: signals.minChildAge },
      })
    }
  }

  // 2. Pickup — only if group.pickup is explicitly set
  const pickupRaw = signals._group.pickup
  const pickupIncluded =
    pickupRaw != null &&
    String(pickupRaw).trim() !== '' &&
    String(pickupRaw).trim() !== '0' &&
    String(pickupRaw).toLowerCase() !== 'false'
  if (pickupIncluded) {
    facts.push({ key: 'pickup', icon: 'Car', tone: 'good', textKey: 'pickupIncluded' })
  }

  // 3. Duration
  if (signals.durationMinutes) {
    const h = Math.floor(signals.durationMinutes / 60)
    const m = signals.durationMinutes % 60
    const label = m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
    facts.push({
      key: 'duration',
      icon: 'Clock',
      tone: 'info',
      textKey: 'duration',
      params: { time: label },
    })
  }

  // 4. Altitude warning
  if (signals.altitude === 'high') {
    facts.push({ key: 'altitude-high', icon: 'Mountain', tone: 'warn', textKey: 'altitudeHigh' })
  } else if (signals.altitude === 'mid' && signals.setting.includes('hiking')) {
    facts.push({ key: 'altitude-mid', icon: 'Mountain', tone: 'info', textKey: 'altitudeMid' })
  }

  // 5. Motion / seasickness warning
  const longBoat = signals.waveSensitive && (signals.durationMinutes ?? 0) >= 180
  if (longBoat) {
    facts.push({ key: 'motion', icon: 'Waves', tone: 'warn', textKey: 'motionRisk' })
  }

  // 6. Sun exposure
  const sunExposed =
    signals.weatherSensitive &&
    (signals.setting.includes('hiking') ||
      signals.setting.includes('quad') ||
      signals.setting.includes('buggy') ||
      signals.setting.includes('bike') ||
      signals.setting.includes('paragliding')) &&
    (signals.durationMinutes ?? 0) >= 120
  if (sunExposed) {
    facts.push({ key: 'sun', icon: 'Sun', tone: 'warn', textKey: 'sunExposure' })
  }

  // 7. Fitness / nerve needed
  const needsFitness =
    signals.setting.includes('paragliding') ||
    signals.setting.includes('jetski') ||
    signals.setting.includes('diving') ||
    signals.setting.includes('climbing')
  if (needsFitness) {
    facts.push({ key: 'fitness', icon: 'Activity', tone: 'info', textKey: 'fitnessNeeded' })
  }

  // 8. Calima advisory — only at altitude
  if (signals.calimaSensitive && signals.altitude !== 'sea') {
    facts.push({ key: 'calima', icon: 'Flame', tone: 'info', textKey: 'calimaInfo' })
  }

  return facts
}

export function suitabilityProfileScorer(signals: ActivitySignals): ModuleScore | null {
  const facts = buildFacts(signals)
  const demand = computeDemand(signals)

  if (facts.length < 2) return null

  let s = 50
  if (facts.length >= 3) s = 60
  if (facts.length >= 4) s = 70
  if (facts.length >= 5) s = 78

  if (demand >= 4) s += 8
  if (signals.setting.includes('hiking')) s += 5
  if (signals.setting.includes('paragliding')) s += 5
  if (signals.minChildAge != null) s += 3

  s = Math.min(95, s)

  return {
    id: 'suitability-profile',
    score: s,
    slot: 'left-secondary',
    reason: `${facts.length} facts, demand ${demand}/5`,
    props: {
      demand,
      facts,
    },
  }
}
