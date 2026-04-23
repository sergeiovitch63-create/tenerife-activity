import type { ParsedPrice } from './types'

/**
 * Parse Atlantico loadPrices response.
 *
 * Modern JSON format (most common):
 *   { "PVPA":"58.00","PVPC":"39.00","PVPOS":"0.00",
 *     "COMA":"17.40","COMC":"7.80","COMOS":"0.00" }
 *   → PVPA/PVPC/PVPOS = Public price (Adult / Child / InfantS)
 *   → COMA/COMC/COMOS = commission
 *
 * Legacy pipe-separated:
 *   - per-person: "36.00|19.00|0.00|10.80|5.70|0.00"
 *   - per-day:    "3|36.00|19.00|7|110.80|35.70" (triplets)
 *
 * Empty arrays `[]` or empty strings → mode: 'unknown' (no price available).
 */
export function parsePriceString(raw: unknown): ParsedPrice {
  // Empty / array
  if (raw == null) return { mode: 'unknown', raw: '' }
  if (Array.isArray(raw) && raw.length === 0) return { mode: 'unknown', raw: '[]' }

  // Modern JSON object format
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const has = (k: string) => o[k] !== undefined && o[k] !== null
    if (has('PVPA') || has('PVPC') || has('COMA')) {
      const num = (v: unknown) => {
        const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
        return Number.isFinite(n) ? n : 0
      }
      return {
        mode: 'per-person',
        adult: num(o.PVPA),
        child: num(o.PVPC),
        infant: num(o.PVPOS),
        adultCommission: num(o.COMA),
        childCommission: num(o.COMC),
        infantCommission: num(o.COMOS),
        raw: JSON.stringify(o),
      }
    }
    return { mode: 'unknown', raw: JSON.stringify(o) }
  }

  // Legacy pipe-separated string
  const s = String(raw).trim()
  if (!s || s === '[]') return { mode: 'unknown', raw: s }
  const parts = s.split('|').map((p) => p.trim())
  const nums = parts.map((p) => {
    const n = parseFloat(p.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  })

  if (nums.length === 6) {
    return {
      mode: 'per-person',
      adult: nums[0], child: nums[1], infant: nums[2],
      adultCommission: nums[3], childCommission: nums[4], infantCommission: nums[5],
      raw: s,
    }
  }

  if (nums.length >= 3 && nums.length % 3 === 0) {
    const dayTiers: ParsedPrice['dayTiers'] = []
    for (let i = 0; i < nums.length; i += 3) {
      dayTiers.push({ upToDays: nums[i], price: nums[i + 1], commission: nums[i + 2] })
    }
    return { mode: 'per-day', dayTiers, raw: s }
  }

  return { mode: 'unknown', raw: s }
}

/**
 * Named HTML entities that appear in Atlantico content.
 * Covers standard set + typographic punctuation.
 */
const HTML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ',
  // Smart quotes
  rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201D', ldquo: '\u201C',
  sbquo: '\u201A', bdquo: '\u201E',
  // Dashes & ellipsis
  hellip: '…', mdash: '—', ndash: '–',
  // Symbols
  copy: '©', reg: '®', trade: '™', deg: '°',
  laquo: '«', raquo: '»', iexcl: '¡', iquest: '¿',
  middot: '·', bull: '•', sect: '§', para: '¶',
  acute: '\u00B4', grave: '`', tilde: '~', cedil: '¸',
  // Math / misc
  times: '×', divide: '÷', plusmn: '±', minus: '−',
  frac14: '¼', frac12: '½', frac34: '¾',
  // Accented letters (shouldn't appear if API is UTF-8, but safe net)
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë',
  aacute: 'á', agrave: 'à', acirc: 'â', auml: 'ä', aring: 'å',
  iacute: 'í', igrave: 'ì', icirc: 'î', iuml: 'ï',
  oacute: 'ó', ograve: 'ò', ocirc: 'ô', ouml: 'ö', otilde: 'õ',
  uacute: 'ú', ugrave: 'ù', ucirc: 'û', uuml: 'ü',
  yacute: 'ý', yuml: 'ÿ',
  ntilde: 'ñ', ccedil: 'ç',
  Eacute: 'É', Egrave: 'È', Ecirc: 'Ê', Euml: 'Ë',
  Aacute: 'Á', Agrave: 'À', Acirc: 'Â', Auml: 'Ä',
  Iacute: 'Í', Igrave: 'Ì', Icirc: 'Î', Iuml: 'Ï',
  Oacute: 'Ó', Ograve: 'Ò', Ocirc: 'Ô', Ouml: 'Ö',
  Uacute: 'Ú', Ugrave: 'Ù', Ucirc: 'Û', Uuml: 'Ü',
  Ntilde: 'Ñ', Ccedil: 'Ç',
}

function decodeHtmlEntities(s: string): string {
  return s
    // Numeric decimal: &#8217;
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n)
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : ''
    })
    // Numeric hex: &#x2019;
    .replace(/&#x([\da-f]+);/gi, (_, n) => {
      const code = parseInt(n, 16)
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : ''
    })
    // Named — case-sensitive (Eacute ≠ eacute)
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (match, name) => HTML_ENTITIES[name] ?? match)
}

/**
 * Clean HTML entities and tags from Atlantico descriptions.
 * Strips HTML tags, decodes entities, normalizes whitespace.
 */
export function cleanText(input: string | null | undefined): string {
  if (!input) return ''
  return decodeHtmlEntities(input)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol)[^>]*>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Preserve basic HTML structure (p, br, strong, em, ul, ol, li, a)
 * but strip everything dangerous (script, iframe, styles, event handlers).
 * Use with `dangerouslySetInnerHTML` — API content is trusted.
 */
export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return ''
  let html = decodeHtmlEntities(input)
  // Remove dangerous blocks entirely
  html = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*\/?>/gi, '')
    .replace(/<link[^>]*\/?>/gi, '')
  // Drop inline event handlers + javascript: URIs
  html = html
    .replace(/\s(on\w+)\s*=\s*"[^"]*"/gi, '')
    .replace(/\s(on\w+)\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
  // Drop class/style attrs to let our own styling apply cleanly
  html = html
    .replace(/\sclass\s*=\s*"[^"]*"/gi, '')
    .replace(/\sclass\s*=\s*'[^']*'/gi, '')
    .replace(/\sstyle\s*=\s*"[^"]*"/gi, '')
    .replace(/\sstyle\s*=\s*'[^']*'/gi, '')
  // Strip tags NOT in the allow list
  const allow = /^(p|br|strong|b|em|i|ul|ol|li|a|h1|h2|h3|h4|h5|h6|blockquote|div|span)$/i
  html = html.replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?\/?>/g, (match, tag) =>
    allow.test(tag) ? match : '',
  )
  return html.trim()
}

/**
 * Split "ids" comma-separated string from groupDetails → array of event codes
 */
export function parseIds(ids: string | null | undefined): string[] {
  if (!ids) return []
  return ids
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
}

export function toAtlanticoDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function fromAtlanticoDate(s: string): Date | null {
  if (!s) return null
  if (/^\d{8}$/.test(s)) return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s)
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}
