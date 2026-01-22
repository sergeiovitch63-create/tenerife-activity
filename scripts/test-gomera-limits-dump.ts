/**
 * Test script for Gomera VIP Tour limits dump endpoint
 * 
 * Calls the debug endpoint and displays results in a clear format.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const ENDPOINT = '/api/atlantico/debug/gomera-limits-dump'

async function testGomeraLimitsDump(monthStart: string, lang: string = 'EN', forceLangs: boolean = true) {
  const url = `${BASE_URL}${ENDPOINT}?monthStart=${encodeURIComponent(monthStart)}&lang=${encodeURIComponent(lang)}&forceLangs=${forceLangs}`
  
  console.log('🚀 Testing Gomera VIP Tour Limits Dump')
  console.log(`📄 URL: ${url}\n`)

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Error:', data.error || `HTTP ${response.status}`)
      process.exit(1)
    }

    console.log('='.repeat(80))
    console.log('📊 RESULTS')
    console.log('='.repeat(80))
    console.log(`Month: ${data.meta.monthStart}`)
    console.log(`Tested at: ${data.meta.testedAt}`)
    console.log(`Force langs: ${data.meta.forceLangs}\n`)

    for (const result of data.results) {
      console.log(`\n🔍 EventId: ${result.eventId}`)
      console.log(`   Attempts: ${result.attempts.length}`)
      
      if (result.best) {
        const best = result.best
        console.log(`   ✅ Best result: lang=${best.lang}, datesCount=${best.datesCount}, sessionsCount=${best.sessionsCount}`)
        
        if (best.normalized) {
          const stats = best.normalized.stats
          console.log(`   📈 Stats:`)
          console.log(`      - Dates with data: ${stats.datesCount}`)
          console.log(`      - Days available: ${stats.daysAvailableCount}`)
          console.log(`      - Days full: ${stats.daysFullCount}`)
          console.log(`      - Total sessions: ${stats.totalSessions}`)

          if (stats.daysAvailableCount > 0) {
            console.log(`\n   📅 First 5 available dates:`)
            const availableDates = Object.entries(best.normalized.days)
              .filter(([_, day]: [string, any]) => day.status === 'available')
              .slice(0, 5)

            for (const [date, day] of availableDates) {
              const dayData = day as { sessions: Array<{ time: string; available?: number; used?: number; limit?: number }> }
              console.log(`      - ${date}: ${dayData.sessions.length} session(s)`)
              if (dayData.sessions.length > 0) {
                const firstSession = dayData.sessions[0]
                console.log(`        Example: ${firstSession.time} (available: ${firstSession.available ?? 'N/A'}, used: ${firstSession.used ?? 'N/A'}, limit: ${firstSession.limit ?? 'N/A'})`)
              }
            }
          } else {
            console.log(`   ⚠️  No available dates found`)
          }
        } else {
          console.log(`   ⚠️  No normalized data (raw response may be empty or invalid)`)
        }

        // Show all attempts summary
        console.log(`\n   📋 All attempts:`)
        for (const attempt of result.attempts) {
          const status = attempt.error ? '❌ ERROR' : 
                        attempt.datesCount > 0 ? '✅ SUCCESS' : 
                        '⚠️  EMPTY'
          console.log(`      ${status} lang=${attempt.lang}, dates=${attempt.datesCount}, sessions=${attempt.sessionsCount}, http=${attempt.httpStatus || 'N/A'}`)
          if (attempt.error) {
            console.log(`         Error: ${attempt.error}`)
          }
        }
      } else {
        console.log(`   ❌ No successful attempts`)
        console.log(`   📋 All attempts:`)
        for (const attempt of result.attempts) {
          const status = attempt.error ? '❌ ERROR' : '⚠️  EMPTY'
          console.log(`      ${status} lang=${attempt.lang}, dates=${attempt.datesCount}, sessions=${attempt.sessionsCount}, http=${attempt.httpStatus || 'N/A'}`)
          if (attempt.error) {
            console.log(`         Error: ${attempt.error}`)
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ Test completed')
    console.log('='.repeat(80))
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Get command line arguments
const args = process.argv.slice(2)
const monthStart = args[0] || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
const lang = args[1] || 'EN'
const forceLangs = args[2] !== 'false'

// Run the test
testGomeraLimitsDump(monthStart, lang, forceLangs).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

