/**
 * Event-Highlights scorer — server-safe.
 *
 * When a tour has multiple variants (e.g. Freebird's "Classic" vs "Premium"
 * vs "Adults-only dinner", Teide's "Coucher + étoiles" vs "Bus + coucher"),
 * most users don't read OptionCard.tsx line-by-line. They pick by feel.
 *
 * This module surfaces the 2-3 most _substantively different_ variants as
 * quick-compare cards: name, richest inclusions (icon chips), available
 * days/week, price-from. The UX is "here are the flavours, pick the one
 * that matches your plan" — without drowning the page in 6 schedule tables.
 *
 * Ranked by content richness: icons count > description > price presence >
 * name specificity. Generic labels ("Base", "Option 1", "Standard") get
 * penalised so curated variants rise.
 *
 * Skipped when:
 *  - <2 events (nothing to compare)
 *  - no events pass the placeholder filter (all times are "-")
 *  - enclosed venues with a single effective option (park/waterpark)
 */
import type { ActivitySignals, ModuleScore } from '../types'

export type EventHighlight = {
  code: string
  name: string
  /** Raw icon filenames — client resolves via `iconFor`/`iconLabel`. */
  icons: string[]
  /** Count of days/week the variant runs (0-7). */
  daysPerWeek: number
  /** First available time across the week ("HH:MM") or null. */
  firstTime: string | null
  /** Adult price (EUR) if we could parse it from the event's price string. */
  priceFrom: number | null
  /** Short one-liner — first sentence of desc, stripped. Empty if none. */
  teaser: string
  /** Count of schedule days the scorer found valid — for sort stability. */
  _qualityScore: number
}

export type EventHighlightsProps = {
  highlights: EventHighlight[]
  /** Total number of variants offered (for "+X more" hint in UI). */
  totalVariants: number
}

const GENERIC_NAME_RE = /\b(base|basic|standard|option\s*\d+|variant|classique|classic|standard|estándar|standard|обычн|базов)\b/i

function parseAdultPrice(price: string | null | undefined): number | null {
  if (!price) return null
  const parts = price.split('|')
  if (parts.length < 1) return null
  const n = parseFloat(parts[0])
  return Number.isFinite(n) && n > 0 ? n : null
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function firstSentence(text: string, max = 110): string {
  const clean = stripHtml(text)
  if (!clean) return ''
  const cut = clean.split(/(?<=[.!?…])\s/)[0] ?? clean
  return cut.length > max ? cut.slice(0, max - 1).trimEnd() + '…' : cut
}

function earliestTime(times: string[] | undefined): string | null {
  if (!times || times.length === 0) return null
  const valid = times
    .map((t) => (t ?? '').trim())
    .filter((t) => /^\d{1,2}:\d{2}/.test(t))
    .sort()
  return valid[0] ?? null
}

function countValidDays(days: number[] | undefined, times: string[] | undefined): number {
  if (!days) return 0
  let n = 0
  for (let i = 0; i < 7; i++) {
    const d = days[i] ?? 0
    const t = (times?.[i] ?? '').trim()
    if (d !== 0 && t && t !== '-' && /^\d{1,2}:\d{2}/.test(t)) n++
  }
  return n
}

export function eventHighlightsScorer(signals: ActivitySignals): ModuleScore | null {
  const events = signals._events ?? []
  if (events.length < 2) return null

  // Enclosed-venue carve-out: zoos/parks often list repeat "ticket" variants
  // that aren't really distinct experiences.
  if (signals.setting.includes('park') || signals.setting.includes('waterpark')) return null

  // Build candidate list with quality scores.
  const candidates: EventHighlight[] = events
    .map((e) => {
      const daysPerWeek = countValidDays(e.days, e.times)
      const firstTime = earliestTime(e.times)
      const priceFrom = parseAdultPrice(e.price)
      const teaser = e.desc ? firstSentence(e.desc) : ''
      const icons = (e.icons ?? []).slice(0, 6)

      // Quality heuristic — content density + distinctness.
      let q = 0
      q += Math.min(5, icons.length)                 // up to +5 for rich chips
      q += daysPerWeek > 0 ? 2 : -3                  // placeholder filter
      q += teaser.length > 30 ? 2 : 0                // has a real description
      q += priceFrom != null ? 1 : 0                 // has explicit pricing
      q += e.name && !GENERIC_NAME_RE.test(e.name) ? 3 : 0 // named variant
      q += e.name.length >= 20 ? 1 : 0               // specific long-form name

      return {
        code: e.code,
        name: e.name || '—',
        icons,
        daysPerWeek,
        firstTime,
        priceFrom,
        teaser,
        _qualityScore: q,
      }
    })
    .filter((h) => h.daysPerWeek > 0) // drop placeholder-only variants

  if (candidates.length < 2) return null

  // Sort by quality descending, keep top 3. Tie-break by price ascending
  // so the cheaper "good enough" option wins a tie.
  candidates.sort((a, b) => {
    if (b._qualityScore !== a._qualityScore) return b._qualityScore - a._qualityScore
    return (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity)
  })

  const highlights = candidates.slice(0, 3)

  // Baseline score — depends on how many real variants we actually found.
  // 2 variants = useful, 3+ = comparison table pays off.
  let s = 48
  if (candidates.length >= 3) s += 10
  if (candidates.length >= 5) s += 4
  // If all top highlights share identical icons + similar names, the module
  // has little to say — damp it to the threshold.
  const iconSets = highlights.map((h) => h.icons.slice().sort().join('|'))
  const iconsAllSame = iconSets.every((s) => s === iconSets[0])
  if (iconsAllSame && highlights.every((h) => h.icons.length <= 1)) s -= 10
  // Rich icon variance → the comparison is genuinely informative.
  const uniqueIcons = new Set<string>()
  for (const h of highlights) for (const i of h.icons) uniqueIcons.add(i)
  if (uniqueIcons.size >= 6) s += 6

  s = Math.min(82, s)

  return {
    id: 'event-highlights',
    score: s,
    slot: 'left-secondary',
    reason: `${candidates.length} variants, top=${highlights[0].name.slice(0, 24)}, icons=${uniqueIcons.size}`,
    props: {
      highlights,
      totalVariants: candidates.length,
    } satisfies EventHighlightsProps,
  }
}
