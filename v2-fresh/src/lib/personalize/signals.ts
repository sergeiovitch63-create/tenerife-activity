/**
 * Signal extraction — pure, side-effect-free.
 *
 * Takes a raw Atlantico activity and derives a rich set of signals that
 * module scorers can query. Runs once per activity at page render time.
 *
 * IMPORTANT: keep this pure and fast. No fetches, no async.
 */

import type { AtlanticoGroup, AtlanticoEvent } from '@/lib/atlantico/types'
import type {
  ActivitySignals,
  GeoZone,
  AltitudeBand,
  Theme,
  ThemeSet,
  Setting,
} from './types'

// ---------------------------------------------------------------------
// Keyword dictionaries (EN/FR/ES/DE/IT — activity descriptions come in
// the user's locale, so we match across all six). Keep lowercase.
// ---------------------------------------------------------------------

const KW = {
  // Themes
  adrenaline: [
    'adrenaline', 'adrénaline', 'adrenalina', 'nervenkitzel',
    'thrill', 'sensation', 'emoción', 'emozione',
    'extreme', 'extrême', 'extremo', 'estremo',
    'speed', 'vitesse', 'velocidad', 'velocità',
  ],
  family: [
    'family', 'famille', 'familia', 'familie', 'famiglia',
    'kid', 'kids', 'enfant', 'niño', 'niños', 'kind', 'kinder', 'bambino', 'bambini',
    'child-friendly', 'famille-friendly',
  ],
  romantic: [
    'romantic', 'romantique', 'romántico', 'romantisch', 'romantico',
    'couple', 'pareja', 'coppia', 'paar',
    'sunset', 'coucher', 'atardecer', 'sonnenuntergang', 'tramonto',
    'private', 'privé', 'privado', 'privat', 'privato',
  ],
  wildlife: [
    'whale', 'baleine', 'ballena', 'wal', 'balena',
    'dolphin', 'dauphin', 'delfín', 'delfin', 'delfino',
    'turtle', 'tortue', 'tortuga', 'schildkröte', 'tartaruga',
    'wildlife', 'faune', 'fauna', 'wildtier', 'animales',
    'bird', 'oiseau', 'pájaro', 'uccello',
  ],
  gastro: [
    'wine', 'vin', 'vino', 'wein',
    'tasting', 'dégustation', 'cata', 'verkostung', 'degustazione',
    'dinner', 'dîner', 'cena', 'abendessen',
    'restaurant', 'gastronomy', 'gastronomie', 'gastronomía', 'gastronomia',
    'culinary', 'culinaire', 'culinario',
    'cheese', 'fromage', 'queso', 'käse', 'formaggio',
  ],
  culture: [
    'museum', 'musée', 'museo', 'museum',
    'history', 'histoire', 'historia', 'geschichte', 'storia',
    'heritage', 'patrimoine', 'patrimonio', 'erbe',
    'monument', 'iglesia', 'kirche', 'chiesa',
    'la laguna', 'orotava', 'santa cruz',
  ],
  nature: [
    'nature', 'naturaleza', 'natur',
    'forest', 'forêt', 'bosque', 'wald', 'foresta',
    'volcano', 'volcan', 'volcán', 'vulkan', 'vulcano',
    'teide', 'anaga', 'masca',
    'hiking', 'randonnée', 'senderismo', 'wandern', 'trekking',
  ],
  water: [
    'snorkel', 'snorkeling',
    'diving', 'plongée', 'buceo', 'tauchen', 'immersione',
    'surf', 'surfing',
    'paddle', 'kayak',
    'swim', 'nage', 'natación', 'schwimmen', 'nuoto',
    'sail', 'voile', 'vela', 'segel',
  ],
  stargazing: [
    'stargazing', 'étoile', 'estrella', 'stern', 'stella',
    'astronomy', 'astronomie', 'astronomía', 'astronomia',
    'observatorio', 'observatoire', 'observatory',
    'night', 'nuit', 'noche', 'nacht', 'notte',
  ],

  // Settings
  boat: ['boat', 'bateau', 'barco', 'boot', 'barca', 'ship', 'navire', 'barco', 'schiff', 'nave'],
  catamaran: ['catamaran', 'catamarán'],
  yacht: ['yacht', 'yate'],
  jetski: ['jet ski', 'jet-ski', 'jetski', 'moto acuática', 'moto d\'acqua'],
  paragliding: ['paragliding', 'parapente', 'parapendio', 'gleitschirm'],
  quad: ['quad', 'atv', 'quad bike'],
  buggy: ['buggy', 'ssv'],
  bike: ['bike', 'vélo', 'bici', 'fahrrad'],
  hiking: ['hike', 'hiking', 'trek', 'randonnée', 'senderismo', 'wanderung', 'trekking'],
  waterpark: ['siam park', 'aqualand', 'water park', 'parc aquatique', 'parque acuático'],
  park: ['loro parque', 'jungle park', 'monkey park', 'aqualand'],
  winery: ['bodega', 'winery', 'vignoble', 'vigneto', 'weingut'],
  volcano: ['teide', 'volcan', 'volcano', 'volcán'],
  whale: ['whale', 'ballena', 'baleine'],
  dolphin: ['dolphin', 'delfín', 'dauphin', 'delfino'],
  sunset: ['sunset', 'coucher', 'atardecer', 'sonnenuntergang', 'tramonto', 'puesta de sol'],
  sunrise: ['sunrise', 'amanecer', 'lever'],
  mirador: ['mirador', 'viewpoint', 'belvédère'],
  beach: ['beach', 'plage', 'playa', 'strand', 'spiaggia'],
}

/**
 * Match a single keyword against the text. Multi-word / hyphenated tokens
 * ("la laguna", "jet-ski") use plain substring. Single words require a
 * leading Unicode letter-boundary so "bike" doesn't match "bikini",
 * "surf" doesn't match "surface", etc. We do the boundary check manually
 * because JS `\b` is ASCII-only and would miss accented keywords like
 * "étoile" placed after a space.
 */
function matchKeyword(lower: string, kw: string): boolean {
  if (kw.includes(' ') || kw.includes('-') || kw.includes("'")) {
    return lower.includes(kw)
  }
  const LETTER_OR_DIGIT = /[\p{L}\p{N}_]/u
  let idx = 0
  while ((idx = lower.indexOf(kw, idx)) !== -1) {
    const prev = idx === 0 ? '' : lower[idx - 1]
    if (!LETTER_OR_DIGIT.test(prev)) return true
    idx += kw.length
  }
  return false
}

function extractKeywords(text: string): Set<string> {
  const lower = text.toLowerCase()
  const hits = new Set<string>()
  for (const [tag, words] of Object.entries(KW)) {
    for (const w of words) {
      if (matchKeyword(lower, w)) {
        hits.add(tag)
        break
      }
    }
  }
  return hits
}

/**
 * Match keywords against a NARROWER text blob — meant for deriving the
 * activity's core identity (settings). Descriptions, FAQs and cancellation
 * policies routinely namecheck "Teide views" or "after a day at the beach"
 * without the experience actually being a Teide tour or a beach day. So
 * `deriveSettings` runs against title + willDo + event names + category
 * only, while `extractKeywords` still scans everything for broader themes.
 */
function extractStrongKeywords(text: string): Set<string> {
  return extractKeywords(text)
}

// ---------------------------------------------------------------------
// Zone detection — based on lat/lng when available, else keyword fallback
// Tenerife bounding box: ~28.0-28.6 N, ~-16.9 to -16.1 W
// ---------------------------------------------------------------------

function detectZone(lat: number | null, lng: number | null, text: string): GeoZone {
  if (lat != null && lng != null) {
    // Rough quadrants of the island
    if (lat >= 28.40 && lng >= -16.60) return 'north'
    if (lat >= 28.35 && lng < -16.60) return 'west'
    if (lat < 28.25) return 'south'
    if (lat >= 28.25 && lng >= -16.45) return 'east'
    if (lat >= 28.20 && lat < 28.40 && lng >= -16.70 && lng < -16.45) return 'center'
  }
  const lower = text.toLowerCase()
  if (/\b(adeje|cristianos|americas|los cristianos|costa adeje|medano)\b/.test(lower)) return 'south'
  if (/\b(puerto de la cruz|orotava|la laguna|bajamar|garachico)\b/.test(lower)) return 'north'
  if (/\b(gigantes|masca|santiago del teide|buenavista)\b/.test(lower)) return 'west'
  if (/\b(teide|cañadas|vilaflor|las cañadas)\b/.test(lower)) return 'center'
  if (/\b(santa cruz|anaga|taganana)\b/.test(lower)) return 'east'
  return 'unknown'
}

/**
 * Derive altitude from the SETTINGS the activity actually has, not from
 * ambient mentions in the description. "Views of the Teide" in a boat
 * trip's body copy was triggering 'mid' altitude, and "3000 animals" at
 * Loro Parque was triggering 'high' — both wrong.
 *
 *   - Teide tour (volcano in setting) + stargazing / hiking / mirador → high
 *   - Teide tour (cable car, driving) alone                           → mid
 *   - Paragliding launches from ~700 m                                 → mid
 *   - Pure hiking (Anaga / Masca)                                     → mid
 *   - Everything else (coastal catamaran, parks, beach)                → sea
 */
function detectAltitude(settings: Setting[], keywords: Set<string>): AltitudeBand {
  // Teide identity: either volcano made it into the narrow setting (name/event
  // clearly says "Teide"), OR the broader text mentions Teide + a high-altitude
  // cue (stargazing, mirador) — that pattern catches marketing-flavored names
  // like "Couchers de Soleil et étoiles" that omit "Teide" from the title.
  const isTeideActivity = settings.includes('volcano') ||
    (keywords.has('volcano') && (keywords.has('stargazing') || keywords.has('mirador')))
  if (isTeideActivity) {
    if (keywords.has('stargazing') || keywords.has('hiking') ||
        settings.includes('mirador') || keywords.has('mirador')) {
      return 'high'
    }
    return 'mid'
  }
  if (settings.includes('paragliding')) return 'mid'
  if (settings.includes('hiking')) return 'mid'
  return 'sea'
}

// ---------------------------------------------------------------------
// Intensity inference
// ---------------------------------------------------------------------

function detectIntensity(
  keywords: Set<string>,
  duration: number | null,
): 'relaxed' | 'moderate' | 'adrenaline' {
  if (
    keywords.has('adrenaline') ||
    keywords.has('jetski') ||
    keywords.has('paragliding') ||
    keywords.has('quad') ||
    keywords.has('buggy')
  ) return 'adrenaline'
  if (keywords.has('hiking') || keywords.has('bike') || keywords.has('diving')) return 'moderate'
  if (keywords.has('gastro') || keywords.has('winery') || keywords.has('yacht') || keywords.has('romantic'))
    return 'relaxed'
  return 'moderate'
}

// ---------------------------------------------------------------------
// Theme set
// ---------------------------------------------------------------------

function deriveThemes(
  keywords: Set<string>,
  isFamily: boolean,
  intensity: string,
  settings: Setting[],
): ThemeSet {
  const themes: ThemeSet = new Set<Theme>()
  // Enclosed venues (zoos, water parks) shouldn't inherit outdoor
  // mountain/nature themes just because the description namechecks Teide or
  // "walking paths". Suppress those unless there's an explicit `nature` kw.
  const isEnclosedVenue = settings.includes('park') || settings.includes('waterpark')

  if (keywords.has('adrenaline') || intensity === 'adrenaline') themes.add('adrenaline')
  if (isFamily || keywords.has('family') || keywords.has('park') || keywords.has('waterpark'))
    themes.add('family')
  if (keywords.has('romantic') || keywords.has('sunset') || keywords.has('yacht'))
    themes.add('romantic')
  if (keywords.has('wildlife') || keywords.has('whale') || keywords.has('dolphin'))
    themes.add('wildlife')
  if (keywords.has('gastro') || keywords.has('winery')) themes.add('gastro')
  if (keywords.has('culture')) themes.add('culture')

  if (isEnclosedVenue) {
    if (keywords.has('nature')) themes.add('nature')
    // no mountain for parks
  } else {
    if (keywords.has('nature') || keywords.has('volcano') || keywords.has('hiking'))
      themes.add('nature')
    if (keywords.has('volcano') || keywords.has('hiking')) themes.add('mountain')
  }

  if (keywords.has('water') || keywords.has('boat') || keywords.has('diving'))
    themes.add('water')
  if (keywords.has('stargazing')) themes.add('stargazing')
  return themes
}

/**
 * Settings are the activity's CORE identity — they must come from a narrow
 * text source (title + willDo + event names + category) so ambient mentions
 * in description/FAQ body don't pollute the signal.
 *
 * Example: Loro Parque's desc mentions "volcanic island", "walking paths" and
 * a restaurant near the "beach" — none of which make the park a volcano /
 * hiking / beach activity.
 *
 * Note: we still honour the 'sunset' setting if a late event slot exists,
 * because sunset-themed catamaran tours legitimately use a dedicated event
 * (e.g. Freebird's "Sunset" 18:00 event).
 */
function deriveSettings(strongKeywords: Set<string>, hasLateEvent: boolean): Setting[] {
  const candidates: Setting[] = []
  const map: Record<string, Setting> = {
    boat: 'boat', catamaran: 'catamaran', yacht: 'yacht', jetski: 'jetski',
    paragliding: 'paragliding', quad: 'quad', buggy: 'buggy', bike: 'bike',
    hiking: 'hiking', waterpark: 'waterpark', park: 'park',
    winery: 'winery', volcano: 'volcano', whale: 'whale', dolphin: 'dolphin',
    sunset: 'sunset', sunrise: 'sunrise', mirador: 'mirador', beach: 'beach',
  }
  for (const [kw, setting] of Object.entries(map)) {
    if (!strongKeywords.has(kw)) continue
    // Sunset must be backed by a late-afternoon departure — otherwise it's
    // just a word in the title that doesn't match the actual schedule.
    if (setting === 'sunset' && !hasLateEvent) continue
    candidates.push(setting)
  }
  return candidates
}

// ---------------------------------------------------------------------
// Environmental sensitivity flags
// ---------------------------------------------------------------------

function isWeatherSensitive(keywords: Set<string>, settings: Setting[]): boolean {
  // Outdoor activities are weather-sensitive
  const outdoor = ['boat', 'catamaran', 'yacht', 'jetski', 'paragliding', 'quad', 'buggy',
                   'bike', 'hiking', 'volcano', 'whale', 'dolphin', 'mirador', 'beach'] as Setting[]
  return settings.some(s => outdoor.includes(s))
}

function isWindSensitive(settings: Setting[]): boolean {
  return settings.some(s => ['paragliding', 'boat', 'catamaran', 'yacht', 'jetski'].includes(s))
}

function isWaveSensitive(settings: Setting[]): boolean {
  return settings.some(s => ['boat', 'catamaran', 'jetski', 'whale', 'dolphin'].includes(s))
}

function isVisibilitySensitive(settings: Setting[], altitude: AltitudeBand): boolean {
  return altitude === 'mid' || altitude === 'high' || settings.includes('stargazing' as Setting) ||
    settings.includes('mirador')
}

function isAltitudeSensitive(altitude: AltitudeBand): boolean {
  return altitude === 'mid' || altitude === 'high'
}

function isCalimaSensitive(settings: Setting[], altitude: AltitudeBand): boolean {
  // Calima is worst outdoors at altitude and for respiratory-sensitive activities
  return altitude !== 'sea' ||
    settings.some(s => ['paragliding', 'hiking', 'quad', 'buggy', 'bike'].includes(s))
}

// ---------------------------------------------------------------------
// Price tier
// ---------------------------------------------------------------------

function priceTier(raw: string | null): 'low' | 'mid' | 'high' | 'premium' {
  if (!raw) return 'mid'
  const num = parseFloat(String(raw).replace(/[^\d.]/g, ''))
  if (!num || isNaN(num)) return 'mid'
  if (num < 30) return 'low'
  if (num < 60) return 'mid'
  if (num < 120) return 'high'
  return 'premium'
}

// ---------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------

function parseDurationToMinutes(raw: string | null): number | null {
  if (!raw) return null
  const lower = raw.toLowerCase().trim()

  // "3h30" → 210 min
  const hhmm = lower.match(/(\d+)\s*h\s*(\d+)/)
  if (hhmm) return parseInt(hhmm[1]) * 60 + parseInt(hhmm[2])

  // "3h", "3 hours", "3.5 h"
  const hoursMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(h|hour|heure|hora|ora|stunde)/)
  if (hoursMatch) {
    const h = parseFloat(hoursMatch[1].replace(',', '.'))
    return Math.round(h * 60)
  }

  // "180 min", "20m", "45 minute"
  const minutesMatch = lower.match(/^(\d+)\s*m(in|inute|inuto)?$/)
  if (minutesMatch) return parseInt(minutesMatch[1])

  // Range "2 - 4" — Atlantico convention is hours. Use the midpoint.
  const rangeMatch = lower.match(/^(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)$/)
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1].replace(',', '.'))
    const hi = parseFloat(rangeMatch[2].replace(',', '.'))
    return Math.round(((lo + hi) / 2) * 60)
  }

  // Bare number — Atlantico stores "5", "8" as hours
  const bareMatch = lower.match(/^(\d+(?:[.,]\d+)?)$/)
  if (bareMatch) {
    const n = parseFloat(bareMatch[1].replace(',', '.'))
    if (n > 0 && n <= 24) return Math.round(n * 60)
  }

  return null
}

// ---------------------------------------------------------------------
// Age parsing — "2-11" or "2 11" etc.
// ---------------------------------------------------------------------

function parseAgeRange(raw: string | null | undefined): { min: number | null; max: number | null } {
  if (!raw) return { min: null, max: null }
  const matches = raw.match(/(\d+)\s*[-–—]\s*(\d+)/)
  if (matches) return { min: parseInt(matches[1]), max: parseInt(matches[2]) }
  return { min: null, max: null }
}

// ---------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------

export function extractSignals(
  group: AtlanticoGroup,
  events: AtlanticoEvent[] = [],
): ActivitySignals {
  // Full blob — used for broad keyword / theme extraction.
  const textBlob = [
    group.name, group.desc, group.willDo, group.canTitle, group.canDesc, group.faq,
    ...events.map(e => [e.name, e.desc, e.route].filter(Boolean).join(' ')),
  ].filter(Boolean).join(' ')

  // Narrow blob — used ONLY for deriving the activity's core identity
  // (settings). Keeps ambient "view of Teide" / "3000 animals" / "beach
  // access" mentions from body copy out of the setting list.
  const strongBlob = [
    group.name, group.willDo, group.category,
    ...events.map(e => e.name).filter(Boolean),
  ].filter(Boolean).join(' ')

  const keywords = extractKeywords(textBlob)
  const strongKeywords = extractStrongKeywords(strongBlob)

  // "Sunset" only counts as a setting if the schedule actually has a
  // late-afternoon departure somewhere (≥ 15:00). Otherwise it's a word
  // in the marketing copy that doesn't match reality.
  const hasLateEvent = events.some(e =>
    (e.times ?? []).some(t => {
      const m = t.match(/^(\d{1,2}):/)
      if (!m) return false
      return parseInt(m[1], 10) >= 15
    }),
  )

  const lat = group.latitud ? parseFloat(group.latitud) : null
  const lng = group.longitud ? parseFloat(group.longitud) : null

  const zone = detectZone(
    Number.isFinite(lat as number) ? lat : null,
    Number.isFinite(lng as number) ? lng : null,
    textBlob,
  )

  const durationMinutes = parseDurationToMinutes(group.duration)
  const childAgeRange = parseAgeRange(group.childAge)
  const infantAgeRange = parseAgeRange(group.infantAge)
  const hasChildAge = childAgeRange.min != null
  const hasInfantAge = infantAgeRange.min != null
  const isFamilyFriendly =
    (hasChildAge && (childAgeRange.min ?? 99) <= 5) ||
    keywords.has('family') ||
    keywords.has('park') ||
    keywords.has('waterpark')

  const settings = deriveSettings(strongKeywords, hasLateEvent)
  const altitude = detectAltitude(settings, keywords)
  const intensity = detectIntensity(keywords, durationMinutes)
  const themes = deriveThemes(keywords, isFamilyFriendly, intensity, settings)

  return {
    code: group.code,
    name: group.name,
    category: group.category ?? null,
    durationMinutes,
    priceTier: priceTier(group.price),

    lat: Number.isFinite(lat as number) ? lat : null,
    lng: Number.isFinite(lng as number) ? lng : null,
    zone,
    altitude,

    hasChildAge,
    minChildAge: childAgeRange.min,
    maxChildAge: childAgeRange.max,
    hasInfantAge,
    isFamilyFriendly,

    themes,
    intensity,
    setting: settings,

    weatherSensitive: isWeatherSensitive(keywords, settings),
    windSensitive: isWindSensitive(settings),
    waveSensitive: isWaveSensitive(settings),
    visibilitySensitive: isVisibilitySensitive(settings, altitude),
    altitudeSensitive: isAltitudeSensitive(altitude),
    calimaSensitive: isCalimaSensitive(settings, altitude),

    hasVideo: !!group.video,
    imageCount: group.images?.length ?? 0,
    hasDetailedRoute: events.some(e => (e.route && e.route.length > 50) || (e.desc && e.desc.length > 100)),
    hasFaq: !!group.faq && group.faq.length > 50,
    hasMultipleEvents: events.length > 1,

    keywords,

    _group: group,
    _events: events,
  }
}
