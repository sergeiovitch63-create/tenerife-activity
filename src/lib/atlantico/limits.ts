/**
 * Utilities for parsing loadLimits response and finding next available date
 */

import { parseYYYYMMDD, isFutureOrToday, toYMD, firstDayOfMonth } from './date'

/**
 * Get weekday number (1=Monday, 7=Sunday) from a Date
 * JavaScript getDay() returns 0=Sunday, 1=Monday, ..., 6=Saturday
 * We convert to 1=Monday, 2=Tuesday, ..., 7=Sunday (Atlantico format)
 */
function getWeekdayNumber(date: Date): number {
  const day = date.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  return day === 0 ? 7 : day // Convert to 1=Monday, ..., 7=Sunday
}

/**
 * Compute next available date from wdays array for a given month
 * @param wdays Array of weekday numbers (1=Monday, 7=Sunday)
 * @param monthStart YYYY-MM-01 format string
 * @returns YYYY-MM-DD format string or null
 */
function computeNextDateFromWdays(wdays: number[], monthStart: string): string | null {
  if (!Array.isArray(wdays) || wdays.length === 0) {
    return null
  }

  // Parse month start
  const monthMatch = monthStart.match(/^(\d{4})-(\d{2})-01$/)
  if (!monthMatch) {
    return null
  }

  const year = parseInt(monthMatch[1], 10)
  const month = parseInt(monthMatch[2], 10) - 1 // JavaScript months are 0-indexed

  // Check if requested month is current month
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  // Start from today if current month, else first day of month
  const startDate = isCurrentMonth ? new Date(today) : new Date(year, month, 1)
  startDate.setHours(0, 0, 0, 0)

  // Get last day of month
  const lastDay = new Date(year, month + 1, 0).getDate()

  // Iterate through days in month starting from startDate
  for (let day = startDate.getDate(); day <= lastDay; day++) {
    const candidateDate = new Date(year, month, day)
    const weekday = getWeekdayNumber(candidateDate)

    if (wdays.includes(weekday)) {
      // Check if date is today or in the future
      if (isFutureOrToday(candidateDate)) {
        return toYMD(candidateDate)
      }
    }
  }

  return null
}

/**
 * Pick next available date from loadLimits response
 * Returns YYYY-MM-DD format or null
 */
export function pickNextAvailableDateFromLimits(limitsResponse: any, requestedMonth?: string): string | null {
  if (!limitsResponse || typeof limitsResponse !== 'object') {
    return null
  }

  // Format 0: Object with dates.wdays (weekdays array)
  // Example: { dates: { wdays: [1,2,3,4,5,6,7] } }
  if (limitsResponse.dates && typeof limitsResponse.dates === 'object' && !Array.isArray(limitsResponse.dates)) {
    const wdays = limitsResponse.dates.wdays
    if (Array.isArray(wdays) && wdays.length > 0) {
      // Use requestedMonth if provided, otherwise use current month
      const monthStart = requestedMonth || firstDayOfMonth(new Date())
      const nextDate = computeNextDateFromWdays(wdays, monthStart)
      if (nextDate) {
        return nextDate
      }
    }
  }

  // Format 1: Array of dates with limit/used arrays
  if (Array.isArray(limitsResponse.dates) && Array.isArray(limitsResponse.limit)) {
    const dates = limitsResponse.dates
    const limits = limitsResponse.limit
    const used = limitsResponse.used || []

    for (let i = 0; i < dates.length; i++) {
      const dateStr = String(dates[i])
      const limit = typeof limits[i] === 'number' ? limits[i] : 0
      const usedCount = typeof used[i] === 'number' ? used[i] : 0
      const remaining = limit - usedCount

      if (remaining > 0) {
        const date = parseYYYYMMDD(dateStr)
        if (date && isFutureOrToday(date)) {
          return toYMD(date)
        }
      }
    }
  }

  // Format 2: Object with date keys
  if (typeof limitsResponse === 'object' && !Array.isArray(limitsResponse)) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Try to find date-like keys
    const dateKeys = Object.keys(limitsResponse)
      .filter((key) => /^\d{8}$/.test(key))
      .sort()

    for (const dateKey of dateKeys) {
      const date = parseYYYYMMDD(dateKey)
      if (!date || !isFutureOrToday(date)) {
        continue
      }

      const dayData = limitsResponse[dateKey]
      if (dayData && typeof dayData === 'object') {
        const limit = typeof dayData.limit === 'number' ? dayData.limit : 0
        const used = typeof dayData.used === 'number' ? dayData.used : 0
        const remaining = limit - used

        if (remaining > 0) {
          return toYMD(date)
        }
      } else if (typeof dayData === 'number' && dayData > 0) {
        // Simple format: date key -> remaining count
        return toYMD(date)
      }
    }
  }

  // Format 3: Array of objects with date property
  if (Array.isArray(limitsResponse)) {
    const availableDates = limitsResponse
      .map((item) => {
        if (!item || typeof item !== 'object') return null

        const dateStr = item.date || item.dateStr || item.day
        if (!dateStr) return null

        const date = parseYYYYMMDD(String(dateStr))
        if (!date || !isFutureOrToday(date)) return null

        const limit = typeof item.limit === 'number' ? item.limit : 0
        const used = typeof item.used === 'number' ? item.used : 0
        const remaining = limit - used

        if (remaining > 0) {
          return { date, remaining }
        }
        return null
      })
      .filter((item): item is { date: Date; remaining: number } => item !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (availableDates.length > 0) {
      return toYMD(availableDates[0].date)
    }
  }

  return null
}


