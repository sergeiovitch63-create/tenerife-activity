/**
 * Date range tours config - Car rental
 * Groups in the same tour list (classification): start + end date, price per day
 * Days between start and end are highlighted in blue
 */

export const DATE_RANGE_GROUP = '165'

/** All group codes that use date range + per-day pricing (car rental, moto, etc.) */
export const DATE_RANGE_GROUP_CODES = ['165', '166', '460', '189', '53', '306', '127']

function normalizeGroupCode(g: string | number | undefined): string {
  if (g == null) return ''
  return String(g).trim()
}

/**
 * Check if group uses date range selection (start + end date) and per-day pricing
 */
export function isDateRangeGroup(tGroup: string | number | undefined): boolean {
  const code = normalizeGroupCode(tGroup)
  return DATE_RANGE_GROUP_CODES.includes(code)
}
