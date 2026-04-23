import type { AtlanticoLimits } from './types'

function pad(n: number): string { return String(n).padStart(2, '0') }
function mondayDow(d: Date): number { return (d.getDay() + 6) % 7 }

/**
 * Return the next date (YYYY-MM-DD) on which this option is bookable:
 * - wdays template says the weekday is operated
 * - no specific block (limit=0) or full day (used>=limit) on that date
 *
 * Returns null if no date found within 180 days lookahead.
 */
export function findNextAvailableDate(limits: AtlanticoLimits | null): string | null {
  if (!limits?.dates) return null
  const { wdays = [], date: dateArr = [], limit: limitArr = [], used: usedArr = [] } = limits.dates
  if (wdays.length !== 7) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let offset = 0; offset < 180; offset++) {
    const d = new Date(today)
    d.setDate(today.getDate() + offset)
    const dow = mondayDow(d)
    if (Number(wdays[dow]) === 0) continue

    const apiDate = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
    const idx = dateArr.indexOf(apiDate)
    if (idx !== -1) {
      const cap = Number(limitArr[idx] ?? 0)
      const u = Number(usedArr[idx] ?? 0)
      if (cap === 0) continue
      if (Math.max(0, cap - u) <= 0) continue
    }

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  return null
}
