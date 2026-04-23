/**
 * Dynamic Packing List scorer — server-safe.
 *
 * Builds a tailored packing checklist by matching real API signals to
 * concrete items. Rejects activities where < 3 grounded items can be
 * produced (generic filler is not allowed).
 *
 * NOTE: The `icon` property holds the Lucide icon NAME as a string. The
 * client renderer resolves the name to the actual component to keep this
 * file free of React-only imports so it can run on the server.
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type PackingItemIconName =
  | 'Backpack'
  | 'Shirt'
  | 'Droplet'
  | 'Sun'
  | 'Footprints'
  | 'Camera'
  | 'Flashlight'
  | 'Waves'
  | 'ShieldAlert'
  | 'Banknote'
  | 'CircleCheck'

export type BuiltItem = {
  key: string
  reasonKey: string
  icon: PackingItemIconName
}

function buildPackingItems(signals: ActivitySignals): BuiltItem[] {
  const items: BuiltItem[] = []

  // Sun: outdoor + has daytime departure (09:00–17:00)
  const times: string[] = []
  for (const ev of signals._events) for (const t of ev.times ?? []) times.push(t)
  const hasDaytimeDeparture = times.some((t) => {
    const m = t.match(/^(\d{1,2}):/)
    if (!m) return false
    const h = parseInt(m[1], 10)
    return h >= 9 && h < 17
  })
  const isOutdoor = signals.weatherSensitive

  if (isOutdoor && hasDaytimeDeparture) {
    items.push({ key: 'sunscreen', reasonKey: 'sunOutdoor', icon: 'Sun' })
    items.push({ key: 'sunglasses', reasonKey: 'sunOutdoor', icon: 'Sun' })
    items.push({ key: 'hat', reasonKey: 'sunOutdoor', icon: 'Sun' })
  }

  // Altitude: warm layer for mid/high altitude
  if (signals.altitude === 'mid' || signals.altitude === 'high') {
    items.push({ key: 'warmLayer', reasonKey: 'warmLayerAltitude', icon: 'Shirt' })
  }

  // Long duration: water bottle
  if (signals.durationMinutes && signals.durationMinutes >= 120 && isOutdoor) {
    items.push({ key: 'waterBottle', reasonKey: 'waterDuration', icon: 'Droplet' })
  }

  // Hiking → boots
  if (signals.setting.includes('hiking')) {
    items.push({ key: 'hikingShoes', reasonKey: 'hikingTerrain', icon: 'Footprints' })
  }
  // Paragliding / Quad / Buggy / Bike → closed shoes
  else if (
    signals.setting.includes('paragliding') ||
    signals.setting.includes('quad') ||
    signals.setting.includes('buggy') ||
    signals.setting.includes('bike')
  ) {
    items.push({ key: 'closedShoes', reasonKey: 'generic', icon: 'Footprints' })
  }

  // Water activities
  const isWaterPlay =
    signals.setting.includes('snorkel') ||
    signals.setting.includes('diving') ||
    signals.setting.includes('beach') ||
    signals.keywords.has('water') ||
    (signals.setting.includes('boat') && signals.durationMinutes != null && signals.durationMinutes >= 180)

  if (isWaterPlay) {
    items.push({ key: 'swimsuit', reasonKey: 'waterSwim', icon: 'Waves' })
    items.push({ key: 'towel', reasonKey: 'waterSwim', icon: 'Waves' })
  }

  // Boat: dry bag + seasick pill if wave-sensitive
  if (
    signals.setting.includes('boat') ||
    signals.setting.includes('catamaran') ||
    signals.setting.includes('jetski')
  ) {
    if (!items.find((i) => i.key === 'dryBag')) {
      items.push({ key: 'dryBag', reasonKey: 'waves', icon: 'Backpack' })
    }
    if (signals.waveSensitive) {
      items.push({ key: 'seasickPill', reasonKey: 'waves', icon: 'ShieldAlert' })
    }
  }

  // Wildlife → camera
  if (
    signals.setting.includes('whale') ||
    signals.setting.includes('dolphin') ||
    signals.keywords.has('wildlife')
  ) {
    items.push({ key: 'camera', reasonKey: 'wildlife', icon: 'Camera' })
  }

  // Mirador → camera
  if (signals.setting.includes('mirador') && !items.find((i) => i.key === 'camera')) {
    items.push({ key: 'camera', reasonKey: 'generic', icon: 'Camera' })
  }

  // Stargazing → flashlight + warm layer
  if (signals.themes.has('stargazing')) {
    items.push({ key: 'flashlight', reasonKey: 'stargazing', icon: 'Flashlight' })
    if (!items.find((i) => i.key === 'warmLayer')) {
      items.push({ key: 'warmLayer', reasonKey: 'stargazing', icon: 'Shirt' })
    }
  }

  // Winery / gastro / culture → cash
  if (
    signals.setting.includes('winery') ||
    signals.keywords.has('gastro') ||
    signals.keywords.has('culture')
  ) {
    items.push({ key: 'cash', reasonKey: 'generic', icon: 'Banknote' })
  }

  // Adrenaline → ID
  if (
    signals.setting.includes('paragliding') ||
    signals.setting.includes('diving') ||
    signals.intensity === 'adrenaline'
  ) {
    items.push({ key: 'id', reasonKey: 'generic', icon: 'CircleCheck' })
  }

  return items
}

export function dynamicPackingListScorer(signals: ActivitySignals): ModuleScore | null {
  // Skip purely indoor activities
  if (!signals.weatherSensitive && !signals.themes.has('nature') && !signals.themes.has('water')) {
    if (!signals.setting.includes('winery')) return null
  }

  const items = buildPackingItems(signals)
  if (items.length < 3) return null

  let s = 55
  if (items.length >= 5) s = 70
  if (items.length >= 7) s = 80
  if (signals.altitude === 'high') s = Math.max(s, 85)
  if (signals.themes.has('stargazing')) s = Math.max(s, 85)
  if (signals.setting.includes('diving') || signals.setting.includes('snorkel')) s = Math.max(s, 80)

  return {
    id: 'dynamic-packing-list',
    score: s,
    slot: 'left-secondary',
    reason: `${items.length} items for ${signals.setting.join('+') || 'activity'}`,
    props: { items },
  }
}
