/**
 * Bucket-List-Rank scorer — server-safe.
 *
 * Positions the activity on the "iconic-Tenerife → niche-alternative"
 * spectrum, based on the signature settings + social-proof numbers the
 * activity carries on its own. This is the intentional antonym of
 * `hidden-gem-badge`: gems are off-beat, bucket-list items are the
 * picture-postcard things travellers feel they'd regret missing.
 *
 * Archetype ladder (from top to bottom):
 *  - `icon`          : Tenerife's defining experience (Teide, whale-watching
 *                       from Los Cristianos, Siam Park, Masca ravine).
 *                       Needs a signature setting + strong social proof.
 *  - `must-do`        : famous, high-rated, the obvious choice in its slice.
 *  - `crowd-favorite` : popular, well-reviewed, less iconic.
 *  - `alternative`    : solid pick that's NOT the picture-postcard one
 *                       (e.g. yacht vs. giant catamaran).
 *  - `unique`         : distinctive offer that sidesteps the usual ranking
 *                       (volcanic caving, stargazing dinner, vineyard at
 *                       altitude). Signals this is a memorable pick without
 *                       claiming it's the iconic Tenerife one.
 *
 * Only the top two rungs (`icon`, `must-do`) fire above the default
 * threshold — the rest are silent. The bottom rungs would crowd the
 * page without adding information.
 *
 * Renders at the top of the page (left-primary slot) as a compact
 * "where this sits in the catalogue" badge with a one-line rationale.
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type BucketListArchetype =
  | 'icon'
  | 'must-do'
  | 'crowd-favorite'
  | 'alternative'
  | 'unique'

export type BucketListSignalKey =
  | 'teide-summit'
  | 'whale-watching'
  | 'siam-park'
  | 'loro-parque'
  | 'masca-ravine'
  | 'paragliding-signature'
  | 'sunset-catamaran'
  | 'stargazing-dinner'
  | 'volcanic-caving'
  | 'high-altitude-vineyard'

export type BucketListProps = {
  archetype: BucketListArchetype
  /** Keys for the specific iconic match that triggered the rank. */
  signalKeys: BucketListSignalKey[]
  /** Raw social-proof numbers the card can surface. */
  tripAdvisor: number | null
  recom: number | null
  /** Short rationale key for the card subtitle. */
  rationaleKey: string
}

function parseNum(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const s = String(raw).replace(',', '.').trim()
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Match iconic Tenerife signatures against an activity's signals.
 * Returns the set of signature matches (empty = not iconic).
 */
function matchIconicSignals(s: ActivitySignals): BucketListSignalKey[] {
  const hits: BucketListSignalKey[] = []

  // Teide summit / high-altitude volcano visit
  if (
    s.setting.includes('volcano') &&
    (s.altitude === 'high' || s.altitude === 'mid') &&
    (s.themes.has('mountain') || s.themes.has('nature'))
  ) {
    hits.push('teide-summit')
  }

  // Whale / dolphin watching (Tenerife is a top-3 global spot)
  if (s.setting.includes('whale') || s.setting.includes('dolphin')) {
    hits.push('whale-watching')
  }

  // Siam Park (world-ranked waterpark, south)
  if (s.setting.includes('waterpark') && s.zone === 'south' && s.imageCount >= 8) {
    hits.push('siam-park')
  }

  // Loro Parque (world-ranked zoo, north)
  if (
    (s.setting.includes('zoo') || s.setting.includes('aquarium')) &&
    s.zone === 'north' &&
    s.imageCount >= 8
  ) {
    hits.push('loro-parque')
  }

  // Masca ravine (famous trek)
  if (
    s.setting.includes('hiking') &&
    s.zone === 'west' &&
    (s.intensity === 'adrenaline' || s.intensity === 'moderate')
  ) {
    hits.push('masca-ravine')
  }

  // Paragliding from south / high-altitude launch
  if (s.setting.includes('paragliding') && s.altitude !== 'sea') {
    hits.push('paragliding-signature')
  }

  // Sunset catamaran in south (picture-postcard experience)
  if (
    s.setting.includes('catamaran') &&
    s.zone === 'south' &&
    (s.setting.includes('sunset') || s.themes.has('romantic'))
  ) {
    hits.push('sunset-catamaran')
  }

  // Stargazing dinner (signature Teide experience, rare)
  if (s.themes.has('stargazing') && s.themes.has('gastro')) {
    hits.push('stargazing-dinner')
  }

  // Volcanic caving / lava tube
  if (s.setting.includes('caving')) {
    hits.push('volcanic-caving')
  }

  // High-altitude winery (Vilaflor / Güímar)
  if (
    (s.setting.includes('winery') || s.setting.includes('tasting')) &&
    (s.altitude === 'mid' || s.altitude === 'high')
  ) {
    hits.push('high-altitude-vineyard')
  }

  return hits
}

export function bucketListRankScorer(signals: ActivitySignals): ModuleScore | null {
  const tripAdvisor = parseNum(signals._group.tadvisor)
  const recom = parseNum(signals._group.recom)

  // The Atlantico dataset doesn't reliably carry numeric ratings
  // (those fields are sometimes stuffed with SEO text or 0/1 flags),
  // so we lean on content-investment as the proxy for "this is a
  // real flagship, not a minor listing". `richContent` = operator
  // invested in production quality.
  const richContent =
    (signals.imageCount >= 8 ? 1 : 0) +
    (signals.hasVideo ? 1 : 0) +
    (signals.hasDetailedRoute ? 1 : 0) +
    (signals.hasFaq ? 1 : 0)
  const strongContent = richContent >= 3
  const decentContent = richContent >= 2

  // Numeric social proof when available — still used to amplify
  const strongTA = tripAdvisor != null && tripAdvisor >= 4.5
  const excellentTA = tripAdvisor != null && tripAdvisor >= 4.7
  const strongRecom = recom != null && recom >= 90
  const excellentRecom = recom != null && recom >= 96

  const iconicHits = matchIconicSignals(signals)

  const topSignature =
    iconicHits.includes('teide-summit') ||
    iconicHits.includes('whale-watching') ||
    iconicHits.includes('siam-park') ||
    iconicHits.includes('loro-parque') ||
    iconicHits.includes('masca-ravine')

  // Decide archetype. `icon` requires a top-tier Tenerife signature
  // AND either a peer-reviewed rating or a deep, well-produced listing.
  // `must-do` just needs an iconic hit + decent production quality.
  let archetype: BucketListArchetype
  let rationaleKey = 'rationale_general'

  if (topSignature && (excellentTA || excellentRecom || strongContent)) {
    archetype = 'icon'
    rationaleKey = `rationale_${iconicHits[0]}`
  } else if (iconicHits.length > 0 && (strongTA || strongRecom || decentContent)) {
    archetype = 'must-do'
    rationaleKey = `rationale_${iconicHits[0]}`
  } else if (iconicHits.length > 0) {
    archetype = 'crowd-favorite'
    rationaleKey = `rationale_${iconicHits[0]}`
  } else if ((strongTA && strongRecom) || (strongContent && signals.imageCount >= 12)) {
    archetype = 'alternative'
    rationaleKey = 'rationale_alternative'
  } else if (
    // Unique = distinctive setting without top-tier proof
    signals.setting.includes('caving') ||
    signals.setting.includes('climbing') ||
    signals.themes.has('stargazing') ||
    (signals.setting.includes('winery') && signals.altitude !== 'sea')
  ) {
    archetype = 'unique'
    rationaleKey = 'rationale_unique'
  } else {
    // Nothing special to say — don't surface the module.
    return null
  }

  // --- Scoring -----------------------------------------------------
  // Icon and must-do fire above threshold; everything else stays silent
  // unless force-included via options. Left-primary is prime real-estate
  // so we gate aggressively.
  let s = 0
  if (archetype === 'icon') s = 82
  else if (archetype === 'must-do') s = 66
  else if (archetype === 'crowd-favorite') s = 38 // just under threshold
  else if (archetype === 'alternative') s = 30
  else if (archetype === 'unique') s = 30

  // Bump for multiple iconic signals (cross-signature)
  if (iconicHits.length >= 2) s += 4

  // Bump for stellar TA + recom concurrence
  if (excellentTA && excellentRecom) s += 4

  // Small damper if the activity also looks like a hidden gem (antonym
  // of bucket-list — avoid double-claiming "icon" and "off-beaten-path").
  const hiddenGemLike =
    signals.zone !== 'south' &&
    (signals.themes.has('wellness') ||
      signals.setting.includes('mirador') ||
      (signals.themes.has('culture') && !signals.themes.has('family')))
  if (hiddenGemLike && archetype !== 'icon') s -= 8

  s = Math.max(0, Math.min(92, s))

  return {
    id: 'bucket-list-rank',
    score: s,
    slot: 'left-primary',
    reason: `archetype=${archetype}, hits=[${iconicHits.join(',')}], ta=${tripAdvisor ?? '—'}, recom=${recom ?? '—'}`,
    props: {
      archetype,
      signalKeys: iconicHits,
      tripAdvisor,
      recom,
      rationaleKey,
    } satisfies BucketListProps,
  }
}
