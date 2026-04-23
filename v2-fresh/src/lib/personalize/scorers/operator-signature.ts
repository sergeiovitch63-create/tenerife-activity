/**
 * Operator-Signature scorer — server-safe.
 *
 * Value-story answers "is this a good price?". Operator-signature
 * answers the other half of the trust equation: "is this operator
 * actually set up to run a real product, or are they winging it?"
 *
 * We score catalog maturity and customer-care infrastructure from
 * signals the Atlantico group already carries — explicitly NOT the
 * reputation metrics used in value-story (tadvisor, recom, discount,
 * isNew). No overlap.
 *
 * Signals we reward:
 *  - catalogDepth   : number of events (options) — specialist vs generalist
 *  - pickupPoints   : intPoints.length — real transport network vs lip-service
 *  - pickupIncluded : _group.pickup parsed as ≥1 — transfer is bundled
 *  - hasVideo       : invested in video production
 *  - hasDetailedRoute: editorial description beyond a single blurb
 *  - hasFaq         : customer-care maturity (they've fielded questions)
 *  - imageRichness  : image count — catalog investment
 *
 * Maturity tiers derived from aggregated signal count:
 *   0-2 : emerging
 *   3-4 : established
 *   5+  : seasoned
 *
 * Skip rules:
 *  - Fewer than 2 signals present — nothing honest to say.
 */

import type { ActivitySignals, ModuleScore } from '../types'

export type OperatorMaturity = 'emerging' | 'established' | 'seasoned'

export type OperatorSignalKind =
  | 'catalogDepth'
  | 'pickupNetwork'
  | 'pickupIncluded'
  | 'videoProduction'
  | 'detailedRoute'
  | 'faqLibrary'
  | 'imageDepth'

export type OperatorSignal = {
  kind: OperatorSignalKind
  /** Optional quantitative value for the renderer (e.g. "7 options", "12 pickup points"). */
  n?: number
}

export type OperatorSignatureProps = {
  signals: OperatorSignal[]
  maturity: OperatorMaturity
  /** Count of events — used by the renderer for the headline. */
  catalogDepth: number
}

function parseNum(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const s = String(raw).replace(',', '.').trim()
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

export function operatorSignatureScorer(signals: ActivitySignals): ModuleScore | null {
  const g = signals._group

  const out: OperatorSignal[] = []

  const catalogDepth = signals._events.length
  if (catalogDepth >= 2) out.push({ kind: 'catalogDepth', n: catalogDepth })

  const intPoints = Array.isArray(g.intPoints) ? g.intPoints.length : 0
  if (intPoints >= 3) out.push({ kind: 'pickupNetwork', n: intPoints })

  const pickupFlag = parseNum(g.pickup)
  if (pickupFlag != null && pickupFlag >= 1) out.push({ kind: 'pickupIncluded' })

  if (signals.hasVideo) out.push({ kind: 'videoProduction' })
  if (signals.hasDetailedRoute) out.push({ kind: 'detailedRoute' })
  if (signals.hasFaq) out.push({ kind: 'faqLibrary' })

  if (signals.imageCount >= 8) out.push({ kind: 'imageDepth', n: signals.imageCount })

  // Hard skip: thin signal set — don't surface a half-empty trust strip.
  if (out.length < 2) return null

  // --- Maturity tier -----------------------------------------------
  let maturity: OperatorMaturity
  if (out.length >= 5) maturity = 'seasoned'
  else if (out.length >= 3) maturity = 'established'
  else maturity = 'emerging'

  // --- Scoring -----------------------------------------------------
  let s = 44 // baseline

  // Each concrete signal adds weight, diminishing returns past 5
  s += Math.min(18, out.length * 3)

  // Depth amplifiers
  if (catalogDepth >= 4) s += 4
  if (catalogDepth >= 8) s += 3
  if (intPoints >= 8) s += 4

  // Editorial signals — rare + high-value
  if (signals.hasDetailedRoute && signals.hasFaq) s += 4

  // Emerging operators still deserve to show — but cap the story
  if (maturity === 'emerging') s = Math.min(s, 54)

  s = Math.max(0, Math.min(72, s))

  return {
    id: 'operator-signature',
    score: s,
    slot: 'right-inline',
    reason: `maturity=${maturity}, signals=${out.length}, catalog=${catalogDepth}`,
    props: {
      signals: out,
      maturity,
      catalogDepth,
    } satisfies OperatorSignatureProps,
  }
}
