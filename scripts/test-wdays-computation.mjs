#!/usr/bin/env node
/**
 * Test wdays computation logic
 * 
 * Verifies:
 * 1. monthStart "2026-01-01", wdays [1..7] => returns first valid day
 * 2. wdays [6,7] => returns first Sat/Sun in Jan 2026
 */

// Simulate the computation logic from limits.ts
function getWeekdayNumber(date) {
  const day = date.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  return day === 0 ? 7 : day // Convert to 1=Monday, ..., 7=Sunday
}

function toYMD(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isFutureOrToday(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)
  return checkDate >= today
}

function computeNextDateFromWdays(wdays, monthStart) {
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

console.log('🧪 Testing wdays computation\n')
console.log('='.repeat(60))

// Test 1: All weekdays [1..7] for Jan 2026
console.log('\nTest 1: wdays [1,2,3,4,5,6,7] for 2026-01-01')
const result1 = computeNextDateFromWdays([1, 2, 3, 4, 5, 6, 7], '2026-01-01')
console.log(`Result: ${result1}`)
console.log(`Expected: 2026-01-01 (or first valid day in Jan 2026)`)
console.log(result1 && result1.startsWith('2026-01') ? '✅ PASS' : '❌ FAIL')

// Test 2: Only weekends [6,7] for Jan 2026
console.log('\nTest 2: wdays [6,7] for 2026-01-01')
// Jan 1, 2026 is a Thursday (weekday 4), so first Sat/Sun would be Jan 3 (Sat=6) or Jan 4 (Sun=7)
const result2 = computeNextDateFromWdays([6, 7], '2026-01-01')
console.log(`Result: ${result2}`)
console.log(`Expected: 2026-01-03 (first Saturday) or 2026-01-04 (first Sunday)`)
console.log(result2 && (result2 === '2026-01-03' || result2 === '2026-01-04') ? '✅ PASS' : '❌ FAIL')

// Test 3: Verify weekday mapping
console.log('\nTest 3: Weekday mapping verification')
const testDate1 = new Date(2026, 0, 1) // Jan 1, 2026 (Thursday)
const testDate2 = new Date(2026, 0, 3) // Jan 3, 2026 (Saturday)
const testDate3 = new Date(2026, 0, 4) // Jan 4, 2026 (Sunday)
console.log(`Jan 1, 2026 (Thu): weekday=${getWeekdayNumber(testDate1)} (expected 4)`)
console.log(`Jan 3, 2026 (Sat): weekday=${getWeekdayNumber(testDate2)} (expected 6)`)
console.log(`Jan 4, 2026 (Sun): weekday=${getWeekdayNumber(testDate3)} (expected 7)`)
console.log(
  getWeekdayNumber(testDate1) === 4 &&
  getWeekdayNumber(testDate2) === 6 &&
  getWeekdayNumber(testDate3) === 7
    ? '✅ PASS'
    : '❌ FAIL'
)

console.log('\n' + '='.repeat(60))
console.log('✅ All tests completed')























