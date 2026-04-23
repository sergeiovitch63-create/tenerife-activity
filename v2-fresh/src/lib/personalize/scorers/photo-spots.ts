/**
 * Photo-Spots scorer — server-safe.
 *
 * Most activity pages sell logistics. They rarely sell the *image* —
 * the moment the traveller will actually remember. This module picks
 * 3-4 archetypal photo moments based on the activity's zone + dominant
 * setting, giving the page a dose of inspiration next to the practical
 * cards.
 *
 * We deliberately don't try to tie suggestions to specific coordinates
 * or event points. That would require a curated dataset per operator;
 * here we emit zone × setting templates (south-boat → "Marina de
 * Los Cristianos au lever du jour", "La Gomera en silhouette", …).
 *
 * Skipped when:
 *  - zone is unknown AND no strong setting signal exists
 *  - enclosed venues (park, waterpark) — the operator's own marketing
 *    already handles the imagery, our archetypes would feel stock
 *  - the activity has fewer than 3 photos on the listing (suggests a
 *    sparse listing that our suggestions would outshine, making users
 *    expect visuals that aren't there)
 */

import type { ActivitySignals, GeoZone, ModuleScore, Setting } from '../types'

export type PhotoSpot = {
  /** Stable key the client resolves to localized title + caption. */
  key: string
  /** Icon name; client maps to a Lucide component. */
  icon: PhotoSpotIcon
}

export type PhotoSpotIcon =
  | 'Sunrise'
  | 'Sunset'
  | 'Mountain'
  | 'Waves'
  | 'Bird'
  | 'Fish'
  | 'Ship'
  | 'Wind'
  | 'Trees'
  | 'Telescope'
  | 'Camera'
  | 'Sparkles'

export type PhotoSpotsProps = {
  spots: PhotoSpot[]
  archetype: string // human-readable — e.g. "south-boat-sunset"
}

type Archetype = { key: string; spots: PhotoSpot[] }

/**
 * Archetype table — keyed by a compound (zone, primary setting) tag.
 * Order inside `spots` is visual priority: first = hero shot, later =
 * candid / wildcard. The renderer may trim to 3.
 */
const ARCHETYPES: Record<string, Archetype> = {
  'south-boat-sunset': {
    key: 'southBoatSunset',
    spots: [
      { key: 'marinaDeparture', icon: 'Ship' },
      { key: 'gomeraSilhouette', icon: 'Mountain' },
      { key: 'sunsetDeck', icon: 'Sunset' },
      { key: 'dolphinPod', icon: 'Fish' },
    ],
  },
  'south-boat': {
    key: 'southBoat',
    spots: [
      { key: 'marinaDeparture', icon: 'Ship' },
      { key: 'bowWaves', icon: 'Waves' },
      { key: 'gomeraSilhouette', icon: 'Mountain' },
      { key: 'dolphinPod', icon: 'Fish' },
    ],
  },
  'south-paragliding': {
    key: 'southParagliding',
    spots: [
      { key: 'tauchoTakeoff', icon: 'Wind' },
      { key: 'aerialCoastline', icon: 'Camera' },
      { key: 'canopySelfie', icon: 'Sparkles' },
    ],
  },
  'south-beach': {
    key: 'southBeach',
    spots: [
      { key: 'playaDelDuque', icon: 'Waves' },
      { key: 'palmWalkway', icon: 'Trees' },
      { key: 'teideBackdrop', icon: 'Mountain' },
    ],
  },
  'center-volcano-sunset': {
    key: 'centerVolcanoSunset',
    spots: [
      { key: 'canadasPlateau', icon: 'Mountain' },
      { key: 'teideCone', icon: 'Mountain' },
      { key: 'sunsetRoques', icon: 'Sunset' },
      { key: 'milkyWay', icon: 'Telescope' },
    ],
  },
  'center-volcano': {
    key: 'centerVolcano',
    spots: [
      { key: 'canadasPlateau', icon: 'Mountain' },
      { key: 'teideCone', icon: 'Mountain' },
      { key: 'roquesDeGarcia', icon: 'Camera' },
      { key: 'minasDeSanJose', icon: 'Mountain' },
    ],
  },
  'west-boat': {
    key: 'westBoat',
    spots: [
      { key: 'gigantesCliffs', icon: 'Mountain' },
      { key: 'mascaBay', icon: 'Waves' },
      { key: 'turtleEncounter', icon: 'Fish' },
      { key: 'cliffReflection', icon: 'Camera' },
    ],
  },
  'west-hiking': {
    key: 'westHiking',
    spots: [
      { key: 'mascaDescent', icon: 'Mountain' },
      { key: 'laurelForest', icon: 'Trees' },
      { key: 'atlanticOverlook', icon: 'Camera' },
    ],
  },
  'north-nature': {
    key: 'northNature',
    spots: [
      { key: 'orotavaBalconies', icon: 'Camera' },
      { key: 'anagaMist', icon: 'Trees' },
      { key: 'puertoCostal', icon: 'Waves' },
    ],
  },
  'north-wildlife': {
    key: 'northWildlife',
    spots: [
      { key: 'orcaShow', icon: 'Fish' },
      { key: 'parrotColour', icon: 'Bird' },
      { key: 'gardenTrails', icon: 'Trees' },
    ],
  },
  'east-culture': {
    key: 'eastCulture',
    spots: [
      { key: 'lagunaStreets', icon: 'Camera' },
      { key: 'anagaHighland', icon: 'Trees' },
      { key: 'tenganaCoast', icon: 'Waves' },
    ],
  },
  'ocean-diving': {
    key: 'oceanDiving',
    spots: [
      { key: 'blueWater', icon: 'Waves' },
      { key: 'reefLife', icon: 'Fish' },
      { key: 'surfaceCrew', icon: 'Camera' },
    ],
  },
  'generic-adrenaline': {
    key: 'genericAdrenaline',
    spots: [
      { key: 'actionShot', icon: 'Sparkles' },
      { key: 'gearCloseup', icon: 'Camera' },
      { key: 'afterGlow', icon: 'Sunrise' },
    ],
  },
  'generic-nature': {
    key: 'genericNature',
    spots: [
      { key: 'landscape', icon: 'Mountain' },
      { key: 'trailDetail', icon: 'Trees' },
      { key: 'summitSelfie', icon: 'Camera' },
    ],
  },
}

function pickArchetype(
  zone: GeoZone,
  settings: Setting[],
  isSunset: boolean,
): Archetype | null {
  const has = (s: Setting) => settings.includes(s)

  // --- South coast ------------------------------------------------
  if (zone === 'south') {
    if (has('boat') || has('catamaran') || has('yacht')) {
      return isSunset ? ARCHETYPES['south-boat-sunset'] : ARCHETYPES['south-boat']
    }
    if (has('paragliding')) return ARCHETYPES['south-paragliding']
    if (has('beach')) return ARCHETYPES['south-beach']
  }

  // --- Centre (Teide) ---------------------------------------------
  if (zone === 'center') {
    if (has('volcano')) {
      return isSunset || has('night') || has('sunset')
        ? ARCHETYPES['center-volcano-sunset']
        : ARCHETYPES['center-volcano']
    }
    if (has('hiking')) return ARCHETYPES['generic-nature']
  }

  // --- West (Gigantes / Masca) -----------------------------------
  if (zone === 'west') {
    if (has('boat') || has('catamaran') || has('yacht')) return ARCHETYPES['west-boat']
    if (has('hiking')) return ARCHETYPES['west-hiking']
  }

  // --- North -------------------------------------------------------
  if (zone === 'north') {
    if (has('whale') || has('dolphin') || has('zoo') || has('aquarium')) {
      return ARCHETYPES['north-wildlife']
    }
    return ARCHETYPES['north-nature']
  }

  // --- East --------------------------------------------------------
  if (zone === 'east') return ARCHETYPES['east-culture']

  // --- Open ocean --------------------------------------------------
  if (zone === 'ocean') {
    if (has('diving') || has('fishing')) return ARCHETYPES['ocean-diving']
    if (has('boat') || has('catamaran') || has('yacht')) return ARCHETYPES['south-boat']
  }

  // --- Fall-back by setting (when zone is weak) -------------------
  if (has('volcano')) {
    return isSunset
      ? ARCHETYPES['center-volcano-sunset']
      : ARCHETYPES['center-volcano']
  }
  if (has('boat') || has('catamaran') || has('yacht')) return ARCHETYPES['south-boat']
  if (has('hiking')) return ARCHETYPES['generic-nature']
  if (has('paragliding') || has('jetski') || has('quad') || has('buggy')) {
    return ARCHETYPES['generic-adrenaline']
  }

  return null
}

export function photoSpotsScorer(signals: ActivitySignals): ModuleScore | null {
  // Carve-outs: parks and waterparks have their own imagery; sparse
  // listings would raise expectations the page can't meet.
  if (signals.setting.includes('park') || signals.setting.includes('waterpark')) return null
  if (signals.imageCount < 3) return null

  const zone: GeoZone = signals.zone ?? 'unknown'
  const isSunset =
    signals.setting.includes('sunset') ||
    signals.setting.includes('night') ||
    signals.themes.has('stargazing')

  const archetype = pickArchetype(zone, signals.setting, isSunset)
  if (!archetype) return null

  // Trim to 3 by default; 4 when there's a genuinely iconic fourth.
  const spots = archetype.spots.slice(0, archetype.spots.length >= 4 ? 4 : 3)

  // --- Scoring -----------------------------------------------------
  // Baseline — an inspirational card is always *nice*, rarely critical.
  let s = 44
  if (signals.themes.has('photography')) s += 10
  if (signals.themes.has('romantic') || isSunset) s += 6
  if (zone !== 'unknown' && zone !== 'ocean') s += 4  // zone-specific spots land better
  if (signals.hasVideo) s += 4                        // listing already visual-rich = reinforces
  if (signals.imageCount >= 8) s += 4                 // rich media = trust the spot suggestions

  // Damp when zone is weak AND we fell through to a generic archetype.
  if (archetype.key.startsWith('generic') && zone === 'unknown') s -= 10

  s = Math.max(0, Math.min(74, s))

  return {
    id: 'photo-spots',
    score: s,
    slot: 'left-tertiary',
    reason: `archetype=${archetype.key}, zone=${zone}, spots=${spots.length}`,
    props: {
      spots,
      archetype: archetype.key,
    } satisfies PhotoSpotsProps,
  }
}
