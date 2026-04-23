/**
 * Value-Story scorer — server-safe.
 *
 * The booking sidebar shows a price. It doesn't explain whether that price
 * is a bargain or a premium, and it doesn't carry the social-proof that
 * converts hesitant browsers. Atlantico groups already carry three unused
 * reputation fields — `tadvisor`, `recom`, `discount` — plus `isNew` and
 * `priceTier`. This scorer stitches them into a compact "why this is a
 * fair deal" story under the price.
 *
 * We emit a bundle of structured points (TripAdvisor rating, top-rated
 * flag, operator recommendation %, active discount, premium/value tier,
 * new-on-platform badge). The card renders whichever ones have real data.
 *
 * Scoring keeps it sidebar-worthy: a high TripAdvisor or a meaningful
 * discount is always worth showing; without either, we don't surface at
 * all to avoid an empty-feeling card.
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type ValueStoryPoint =
  | { kind: 'tripAdvisor'; rating: number }
  | { kind: 'topRated' }
  | { kind: 'recommended'; percent: number }
  | { kind: 'discount'; percent: number }
  | { kind: 'priceTier'; tier: 'low' | 'mid' | 'high' | 'premium' }
  | { kind: 'freshCatalog' }
  | { kind: 'freeCancellation' }
  | { kind: 'instantConfirmation' }

export type ValueStoryProps = {
  points: ValueStoryPoint[]
  /** Primary headline tone: great-deal / fair / premium. */
  vibe: 'great-deal' | 'fair' | 'premium' | 'new'
}

function parseNum(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const s = String(raw).replace(',', '.').trim()
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function parseIsNew(raw: unknown): boolean {
  if (raw == null) return false
  const s = String(raw).toLowerCase().trim()
  return s === '1' || s === 'true' || s === 'yes' || s === 'on' || s === 'new'
}

export function valueStoryScorer(signals: ActivitySignals): ModuleScore | null {
  const g = signals._group

  const tadvisor = parseNum(g.tadvisor)     // typically 0..5
  const recom = parseNum(g.recom)           // typically 0..100
  const discount = parseNum(g.discount)     // typically 0..100 (percent)
  const isNew = parseIsNew(g.isNew)

  const points: ValueStoryPoint[] = []

  // --- TripAdvisor -------------------------------------------------
  // Atlantico stores 0-5 ratings; trust anything ≥3.5 as worth surfacing.
  if (tadvisor != null && tadvisor >= 3.5 && tadvisor <= 5) {
    points.push({ kind: 'tripAdvisor', rating: tadvisor })
    if (tadvisor >= 4.7) points.push({ kind: 'topRated' })
  }

  // --- Operator recommendation percentage --------------------------
  // 0..100 scale. Only surface strong signals (≥85%) to avoid faint praise.
  if (recom != null && recom >= 85 && recom <= 100) {
    points.push({ kind: 'recommended', percent: Math.round(recom) })
  }

  // --- Active discount ---------------------------------------------
  if (discount != null && discount >= 5 && discount <= 80) {
    points.push({ kind: 'discount', percent: Math.round(discount) })
  }

  // --- Price tier narration ----------------------------------------
  // `low` / `mid` are implicit "good value", `premium` says "you get what
  // you pay for". We never say "expensive" — we flip the frame.
  if (signals.priceTier === 'low' || signals.priceTier === 'mid') {
    points.push({ kind: 'priceTier', tier: signals.priceTier })
  } else if (signals.priceTier === 'premium') {
    points.push({ kind: 'priceTier', tier: 'premium' })
  }

  // --- Fresh catalog flag -----------------------------------------
  if (isNew) points.push({ kind: 'freshCatalog' })

  // --- Booking policy points (always worth repeating) --------------
  points.push({ kind: 'freeCancellation' })
  points.push({ kind: 'instantConfirmation' })

  // Hard skip: no reputation AND no discount = same as the sidebar
  // already shows. Don't pad the page with boilerplate policy chips.
  const hasReputation =
    (tadvisor != null && tadvisor >= 3.5) ||
    (recom != null && recom >= 85)
  const hasDiscount = discount != null && discount >= 5
  if (!hasReputation && !hasDiscount && !isNew) return null

  // --- Vibe --------------------------------------------------------
  let vibe: ValueStoryProps['vibe']
  if (hasDiscount && discount! >= 20) vibe = 'great-deal'
  else if (signals.priceTier === 'premium') vibe = 'premium'
  else if (isNew && !hasReputation) vibe = 'new'
  else vibe = 'fair'

  // --- Scoring -----------------------------------------------------
  let s = 46 // just above the 40 threshold — always outranks boilerplate
  if (tadvisor != null && tadvisor >= 4.5) s += 14
  else if (tadvisor != null && tadvisor >= 4.0) s += 8
  else if (tadvisor != null && tadvisor >= 3.5) s += 4

  if (recom != null && recom >= 95) s += 8
  else if (recom != null && recom >= 85) s += 4

  if (hasDiscount) {
    // Bigger discount = stronger signal, but diminishing returns past 30%.
    s += Math.min(12, Math.round((discount as number) * 0.6))
  }
  if (isNew) s += 3

  // New + no reputation is a weaker story — cap it.
  if (vibe === 'new') s = Math.min(s, 55)

  // Premium without TripAdvisor support is not a value story at all.
  if (vibe === 'premium' && !hasReputation && !hasDiscount) {
    return null
  }

  s = Math.max(0, Math.min(86, s))

  return {
    id: 'value-story',
    score: s,
    slot: 'right-inline',
    reason: `vibe=${vibe}, ta=${tadvisor ?? '—'}, recom=${recom ?? '—'}, discount=${discount ?? '—'}`,
    props: {
      points,
      vibe,
    } satisfies ValueStoryProps,
  }
}
