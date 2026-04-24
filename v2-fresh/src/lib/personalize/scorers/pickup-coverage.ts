/**
 * Pickup-Coverage scorer — server-safe.
 *
 * Atlantico groups carry a `pickup` flag (0/1) and lat/lng. Our signal
 * extractor distils these into `zone` + coordinates, but no module has
 * communicated "we come to you" until now. For tourists staying anywhere
 * from Adeje to Puerto de la Cruz, whether the operator covers their
 * hotel is the single logistics question that makes or breaks a booking.
 *
 * We emit:
 *  - `hasPickup` — is pickup available at all?
 *  - `primaryZones` — zones typically served based on departure zone +
 *    the island's geography (south-dep operators rarely cross to the
 *    north and vice-versa).
 *  - `meetingPoint` — the zone where the activity starts, so guests who
 *    want self-drive understand where they're heading.
 *  - `durationHint` — rough "add X min transfer" nudge.
 *
 * Skipped when we have no coordinate + no zone to reason about, or when
 * pickup is explicitly not offered AND the activity is zone-free
 * (ocean-based, where pickup is basically always at the marina only).
 */

import type { ActivitySignals, GeoZone, ModuleScore } from '../types'

export type PickupCoverageProps = {
  hasPickup: boolean
  /** The zone the activity starts from — where self-drivers meet. */
  meetingPoint: GeoZone
  /** Zones where pickup is likely offered. */
  primaryZones: GeoZone[]
  /** Zones we don't expect pickup from (communicated so users aren't misled). */
  outOfRangeZones: GeoZone[]
  /** Short nudge for transfer time ("typically 20–40 min"). */
  transferHintKey: 'short' | 'medium' | 'long' | null
  /** True if the activity ships from an ocean marina (sea-based). */
  isMarineDeparture: boolean
}

// Primary + secondary pickup zones keyed by the activity's departure zone.
// Based on how Atlantico operators typically route buses: south-based trips
// cover south + sometimes south-west; north-based trips cover north; central
// Teide departures tend to collect from both coasts.
const COVERAGE: Record<GeoZone, { primary: GeoZone[]; oor: GeoZone[] }> = {
  south: { primary: ['south'], oor: ['north', 'east'] },
  north: { primary: ['north'], oor: ['south'] },
  west: { primary: ['south', 'west'], oor: ['north', 'east'] },
  center: { primary: ['south', 'north', 'center'], oor: ['east'] },
  east: { primary: ['east', 'north'], oor: ['south', 'west'] },
  ocean: { primary: ['south'], oor: ['north', 'east'] },
  unknown: { primary: [], oor: [] },
}

function pickupFlag(raw: unknown): boolean {
  if (raw == null) return false
  const s = String(raw).toLowerCase().trim()
  return s === '1' || s === 'on' || s === 'yes' || s === 'true'
}

function transferHint(zone: GeoZone, isMarine: boolean): PickupCoverageProps['transferHintKey'] {
  if (isMarine) return 'short'
  if (zone === 'center') return 'long'
  if (zone === 'west' || zone === 'east') return 'medium'
  if (zone === 'south' || zone === 'north') return 'short'
  return null
}

export function pickupCoverageScorer(signals: ActivitySignals): ModuleScore | null {
  const zone: GeoZone = signals.zone ?? 'unknown'
  const hasPickup = pickupFlag(signals._group.pickup)

  // Sanity: if we have neither pickup nor a usable zone, there is nothing
  // to say that isn't already in the sidebar.
  if (!hasPickup && zone === 'unknown') return null

  // Hard skip — ocean departures without pickup means you meet at a
  // marina and self-drive from wherever. Marine-only, no-pickup activities
  // are almost always diving/fishing charters — sidebar already covers it.
  if (!hasPickup && zone === 'ocean') return null

  const coverage = COVERAGE[zone] ?? COVERAGE.unknown
  const isMarineDeparture =
    signals.setting.includes('boat') ||
    signals.setting.includes('catamaran') ||
    signals.setting.includes('yacht') ||
    signals.setting.includes('fishing') ||
    signals.setting.includes('diving')

  const primaryZones = hasPickup ? coverage.primary : []
  const outOfRangeZones = hasPickup ? coverage.oor : []
  const transferHintKey = hasPickup ? transferHint(zone, isMarineDeparture) : null

  // --- Scoring ----------------------------------------------------
  // Baseline: pickup is always actionable info (even a "no pickup, meet
  // at the marina" is a logistics answer). But if we have neither pickup
  // nor good zone reasoning, we already returned null above.
  let s = 50
  if (hasPickup) s += 14                // explicit pickup = very useful signal
  if (hasPickup && primaryZones.length >= 2) s += 6 // multi-zone coverage
  if (zone === 'center') s += 6         // Teide trips — transfer is a big question
  if (isMarineDeparture && hasPickup) s += 4 // boat + pickup is a classic combo
  if (!hasPickup && isMarineDeparture) s -= 6 // marina-meet is implied, less urgent
  if (zone === 'unknown') s -= 10
  if (signals.setting.includes('park') || signals.setting.includes('waterpark')) {
    // Parks usually sell tickets only (no transfer); the card still
    // clarifies "meet at the park" but it's less of a revelation.
    s -= 8
  }
  s = Math.max(0, Math.min(82, s))

  return {
    id: 'pickup-coverage',
    score: s,
    slot: 'right-inline',
    reason: `pickup=${hasPickup}, zone=${zone}, primary=${primaryZones.join('+') || '—'}`,
    props: {
      hasPickup,
      meetingPoint: zone,
      primaryZones,
      outOfRangeZones,
      transferHintKey,
      isMarineDeparture,
    } satisfies PickupCoverageProps,
  }
}
