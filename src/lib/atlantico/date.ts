/**
 * Date utilities for Atlantico API
 */

/**
 * Convert Date to YYYY-MM-DD format
 */
export function toYMD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get first day of month in YYYY-MM-01 format
 */
export function firstDayOfMonth(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

/**
 * Parse YYYYMMDD string to Date
 */
export function parseYYYYMMDD(str: string): Date | null {
  if (!str || typeof str !== 'string' || str.length !== 8) {
    return null
  }
  
  const year = parseInt(str.substring(0, 4), 10)
  const month = parseInt(str.substring(4, 6), 10) - 1
  const day = parseInt(str.substring(6, 8), 10)
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null
  }
  
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }
  
  return date
}

/**
 * Check if date is today or in the future
 */
export function isFutureOrToday(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)
  return checkDate >= today
}















