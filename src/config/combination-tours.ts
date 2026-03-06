/**
 * Combination tours config - Twin Ticket (Siam Park + Loro Parque)
 * Group 168, events 21, 22, 23: each option = 2 activities requiring 2 dates
 *
 * For payment: we use the SAME t_id for both API calls (one per park/date).
 * Atlantico Twin Ticket: one product, one price. We send two bookings with same
 * t_id, different tourDate - total charged once (split 50/50 per call if needed).
 *
 * If Atlantico uses different t_ids for Siam vs Loro, update siamParkTId/loroParqueTId.
 */

export const COMBINATION_GROUP = '168'
export const COMBINATION_EVENT_IDS = ['21', '22', '23']

/** Normalize for comparison - handles "168", "tfs_168", "group168", 168, etc. */
function normalizeGroupCode(g: string | number | undefined): string {
  if (g == null) return ''
  const s = String(g).trim().toLowerCase()
  if (s === '168') return '168'
  if (s.includes('168')) return '168'
  return s
}

/** Normalize event ID - handles "21", 21, "021", "evt_21", etc. */
function normalizeEventId(e: string | number | undefined): string {
  if (e == null) return ''
  const s = String(e).trim()
  const num = parseInt(s, 10)
  if (!isNaN(num)) return String(num)
  const match = s.match(/\b(21|22|23)\b/)
  if (match) return match[1]!
  return s
}

export interface CombinationConfig {
  /** Display label for first date (Siam Park) */
  labelDate1: string
  /** Display label for second date (Loro Parque) */
  labelDate2: string
  /** t_id for first activity - same as combo event for Twin Ticket */
  tId1: string
  /** t_id for second activity - same as combo event for Twin Ticket */
  tId2: string
  /** t_group for both */
  tGroup: string
}

/**
 * Check if (group, eventId) is a combination requiring two dates
 */
export function isCombinationEvent(tGroup: string | number | undefined, eventId: string | number | undefined): boolean {
  const g = normalizeGroupCode(tGroup)
  const e = normalizeEventId(eventId)
  if (g !== '168' || !e) return false
  return COMBINATION_EVENT_IDS.includes(e)
}

/**
 * Get combination config for group 168
 * Uses same t_id for both - Twin Ticket is one product, two visit dates
 */
export function getCombinationConfig(tGroup: string, eventId: string): CombinationConfig | null {
  if (!isCombinationEvent(tGroup, eventId)) return null
  const tid = String(eventId).trim()
  return {
    labelDate1: 'Siam Park',
    labelDate2: 'Loro Parque',
    tId1: tid,
    tId2: tid,
    tGroup: COMBINATION_GROUP,
  }
}
