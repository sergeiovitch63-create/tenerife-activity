/**
 * Probe script to test loadLimits with different combinations
 * 
 * Usage: npm run atl:limits:probe -- <eventId>
 * Example: npm run atl:limits:probe -- 184
 * 
 * Tests all combinations of:
 * - months: [prevMonth, currentMonth, nextMonth]
 * - langs: [ENG, CAS]
 * 
 * Displays a table with results for each combination.
 */

// Note: This script runs in Node.js, not Next.js
// We need to use fetch directly and handle env vars manually

function getBaseUrl(): string {
  const env = process.env.ATLANTICO_ENV?.toLowerCase().trim()
  
  if (env === 'test') {
    return 'https://testapi.atlanticoexcursiones.com'
  }
  
  // Default to production
  return 'https://api.atlanticoexcursiones.com'
}

function mapLocaleToAtlanticoLang(locale: string): string {
  const mapping: Record<string, string> = {
    'en': 'ENG',
    'es': 'CAS',
    'fr': 'FRA',
    'ru': 'RUS',
    'de': 'ALE',
    'it': 'ITA',
  }
  
  const normalized = locale.toLowerCase().trim()
  return mapping[normalized] || 'ENG'
}

interface ProbeResult {
  eventId: string
  lang: string
  monthStart: string
  status: number
  quote: number | null
  datesCount: number
  sessionsKeysCount: number
  sampleTime: string | null
  error?: string
}

/**
 * Fetch loadLimits and extract key metrics
 */
async function probeLoadLimits(
  eventId: string,
  lang: string,
  monthStart: string
): Promise<ProbeResult> {
  const baseUrl = getBaseUrl()
  const normalizedLang = mapLocaleToAtlanticoLang(lang)
  const endpoint = `/loadLimits/${eventId}/${normalizedLang}/${monthStart}`
  const fullUrl = `${baseUrl}${endpoint}`

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        ...(process.env.ATLANTICO_TOKEN ? { 'Authorization': `Bearer ${process.env.ATLANTICO_TOKEN}` } : {}),
      },
      cache: 'no-store',
    })

    const status = response.status
    const text = await response.text()

    if (!response.ok) {
      return {
        eventId,
        lang,
        monthStart,
        status,
        quote: null,
        datesCount: 0,
        sessionsKeysCount: 0,
        sampleTime: null,
        error: `HTTP ${status}: ${text.substring(0, 100)}`,
      }
    }

    // Parse JSON
    let raw: any
    try {
      raw = JSON.parse(text.trim())
    } catch {
      // Try double-encoded
      try {
        const once = JSON.parse(text.trim())
        if (typeof once === 'string') {
          raw = JSON.parse(once.trim())
        } else {
          raw = once
        }
      } catch {
        return {
          eventId,
          lang,
          monthStart,
          status,
          quote: null,
          datesCount: 0,
          sessionsKeysCount: 0,
          sampleTime: null,
          error: 'Invalid JSON response',
        }
      }
    }

    // Extract metrics
    const quote = typeof raw.quote === 'number' ? raw.quote : null

    // Count dates
    let datesCount = 0
    if (Array.isArray(raw.dates?.date)) {
      datesCount = raw.dates.date.length
    } else if (Array.isArray(raw.dates)) {
      datesCount = raw.dates.length
    }

    // Count session keys (YYYYMMDD format)
    const sessionKeys: string[] = []
    
    // Top-level YYYYMMDD keys
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const topLevelKeys = Object.keys(raw).filter(key => /^\d{8}$/.test(key))
      sessionKeys.push(...topLevelKeys)
    }

    // Nested sessions[YYYYMMDD]
    if (raw.sessions && typeof raw.sessions === 'object') {
      const nestedKeys = Object.keys(raw.sessions).filter(key => /^\d{8}$/.test(key))
      sessionKeys.push(...nestedKeys)
    }

    // Nested sessionsByDate[YYYYMMDD]
    if (raw.sessionsByDate && typeof raw.sessionsByDate === 'object') {
      const nestedKeys = Object.keys(raw.sessionsByDate).filter(key => /^\d{8}$/.test(key))
      sessionKeys.push(...nestedKeys)
    }

    // Get sample time from first session
    let sampleTime: string | null = null
    if (sessionKeys.length > 0) {
      const firstKey = sessionKeys[0]
      const firstSessionData = raw[firstKey] || raw.sessions?.[firstKey] || raw.sessionsByDate?.[firstKey]
      
      if (Array.isArray(firstSessionData) && firstSessionData.length > 0) {
        const firstSession = firstSessionData[0]
        sampleTime = firstSession.time || firstSession.sesTime || null
      } else if (firstSessionData && typeof firstSessionData === 'object') {
        sampleTime = firstSessionData.time || firstSessionData.sesTime || null
      }
    }

    return {
      eventId,
      lang,
      monthStart,
      status,
      quote,
      datesCount,
      sessionsKeysCount: sessionKeys.length,
      sampleTime,
    }
  } catch (error) {
    return {
      eventId,
      lang,
      monthStart,
      status: 0,
      quote: null,
      datesCount: 0,
      sessionsKeysCount: 0,
      sampleTime: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Format month start (YYYY-MM-01)
 */
function getMonthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

/**
 * Get previous, current, and next month starts
 */
function getMonthStarts(): string[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

  return [
    getMonthStart(prevYear, prevMonth),
    getMonthStart(currentYear, currentMonth),
    getMonthStart(nextYear, nextMonth),
  ]
}

/**
 * Display results as a table
 */
function displayTable(results: ProbeResult[]): void {
  console.log('\n' + '='.repeat(100))
  console.log('ATLANTICO LOADLIMITS PROBE RESULTS')
  console.log('='.repeat(100))
  console.log()

  // Header
  const header = [
    'eventId'.padEnd(10),
    'lang'.padEnd(6),
    'monthStart'.padEnd(12),
    'status'.padEnd(8),
    'quote'.padEnd(8),
    'datesCount'.padEnd(12),
    'sessionsKeys'.padEnd(14),
    'sampleTime'.padEnd(12),
    'error'.padEnd(30),
  ].join(' | ')

  console.log(header)
  console.log('-'.repeat(100))

  // Rows
  for (const result of results) {
    const row = [
      result.eventId.padEnd(10),
      result.lang.padEnd(6),
      result.monthStart.padEnd(12),
      String(result.status).padEnd(8),
      (result.quote !== null ? String(result.quote) : '—').padEnd(8),
      String(result.datesCount).padEnd(12),
      String(result.sessionsKeysCount).padEnd(14),
      (result.sampleTime || '—').padEnd(12),
      (result.error || '—').padEnd(30),
    ].join(' | ')

    console.log(row)
  }

  console.log('='.repeat(100))
  console.log()

  // Analysis
  console.log('ANALYSIS:')
  console.log('-'.repeat(100))

  const successful = results.filter(r => r.status === 200 && r.sessionsKeysCount > 0)
  const failed = results.filter(r => r.status !== 200 || r.error)
  const empty = results.filter(r => r.status === 200 && r.sessionsKeysCount === 0 && !r.error)

  if (successful.length > 0) {
    console.log(`✅ ${successful.length} successful probe(s) with sessions:`)
    for (const r of successful) {
      console.log(`   - ${r.lang}/${r.monthStart}: ${r.sessionsKeysCount} session keys`)
    }
  }

  if (empty.length > 0) {
    console.log(`⚠️  ${empty.length} empty result(s) (status=200 but no sessions):`)
    for (const r of empty) {
      console.log(`   - ${r.lang}/${r.monthStart}: quote=${r.quote}, datesCount=${r.datesCount}`)
    }
  }

  if (failed.length > 0) {
    console.log(`❌ ${failed.length} failed probe(s):`)
    for (const r of failed) {
      console.log(`   - ${r.lang}/${r.monthStart}: ${r.error || `HTTP ${r.status}`}`)
    }
  }

  // Recommendations
  console.log()
  console.log('RECOMMENDATIONS:')
  console.log('-'.repeat(100))

  const engResults = results.filter(r => r.lang === 'ENG')
  const casResults = results.filter(r => r.lang === 'CAS')

  const engHasSessions = engResults.some(r => r.sessionsKeysCount > 0)
  const casHasSessions = casResults.some(r => r.sessionsKeysCount > 0)

  if (casHasSessions && !engHasSessions) {
    console.log('⚠️  CAS works but ENG doesn\'t → Possible language/dispo issue')
  } else if (!engHasSessions && !casHasSessions) {
    console.log('❌ No months work for any language → eventId may be wrong OR event has no calendar')
  } else if (successful.length > 0 && empty.length > 0) {
    console.log('✅ Some months work → The selected month was just empty')
  } else if (successful.length === results.length) {
    console.log('✅ All combinations work → No issues detected')
  }

  console.log()
}

/**
 * Main function
 */
async function main() {
  const eventId = process.argv[2]

  if (!eventId) {
    console.error('Usage: npm run atl:limits:probe -- <eventId>')
    console.error('Example: npm run atl:limits:probe -- 184')
    process.exit(1)
  }

  console.log(`\n🔍 Probing loadLimits for eventId: ${eventId}`)
  console.log(`Base URL: ${getBaseUrl()}`)
  console.log()

  const monthStarts = getMonthStarts()
  const langs = ['ENG', 'CAS']

  const results: ProbeResult[] = []

  // Test all combinations
  for (const lang of langs) {
    for (const monthStart of monthStarts) {
      process.stdout.write(`Testing ${lang}/${monthStart}... `)
      const result = await probeLoadLimits(eventId, lang, monthStart)
      results.push(result)
      
      if (result.error) {
        console.log(`❌ ${result.error}`)
      } else if (result.sessionsKeysCount > 0) {
        console.log(`✅ ${result.sessionsKeysCount} session keys`)
      } else {
        console.log(`⚠️  Empty (status=${result.status}, quote=${result.quote})`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  // Display table
  displayTable(results)
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
}

export { probeLoadLimits, getMonthStarts, displayTable }
