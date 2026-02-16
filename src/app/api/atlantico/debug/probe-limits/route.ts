/**
 * DEV-only API route to probe loadLimits with different combinations
 * 
 * GET /api/atlantico/debug/probe-limits?eventId=184
 * 
 * Tests all combinations of:
 * - months: [prevMonth, currentMonth, nextMonth]
 * - langs: [ENG, CAS]
 * 
 * Returns JSON with results table and analysis.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/atlantico/client'
import { mapLocaleToAtlanticoLang } from '@/lib/atlantico/lang'

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
  fullUrl: string
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
        fullUrl,
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
          fullUrl,
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
      fullUrl,
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
      fullUrl,
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

export async function GET(request: NextRequest) {
  // DEV-only route
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This route is only available in development' },
      { status: 403 }
    )
  }

  const { searchParams } = request.nextUrl
  const eventId = searchParams.get('eventId')

  if (!eventId) {
    return NextResponse.json(
      { error: 'eventId parameter is required' },
      { status: 400 }
    )
  }

  const monthStarts = getMonthStarts()
  const langs = ['ENG', 'CAS']

  const results: ProbeResult[] = []

  // Test all combinations
  for (const lang of langs) {
    for (const monthStart of monthStarts) {
      const result = await probeLoadLimits(eventId, lang, monthStart)
      results.push(result)

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  // Analysis
  const successful = results.filter(r => r.status === 200 && r.sessionsKeysCount > 0)
  const failed = results.filter(r => r.status !== 200 || r.error)
  const empty = results.filter(r => r.status === 200 && r.sessionsKeysCount === 0 && !r.error)

  const engResults = results.filter(r => r.lang === 'ENG')
  const casResults = results.filter(r => r.lang === 'CAS')

  const engHasSessions = engResults.some(r => r.sessionsKeysCount > 0)
  const casHasSessions = casResults.some(r => r.sessionsKeysCount > 0)

  let recommendation = ''
  if (casHasSessions && !engHasSessions) {
    recommendation = 'CAS works but ENG doesn\'t → Possible language/dispo issue'
  } else if (!engHasSessions && !casHasSessions) {
    recommendation = 'No months work for any language → eventId may be wrong OR event has no calendar'
  } else if (successful.length > 0 && empty.length > 0) {
    recommendation = 'Some months work → The selected month was just empty'
  } else if (successful.length === results.length) {
    recommendation = 'All combinations work → No issues detected'
  }

  // Log table to server console
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
  console.log('ANALYSIS:')
  console.log(`✅ ${successful.length} successful probe(s) with sessions`)
  console.log(`⚠️  ${empty.length} empty result(s) (status=200 but no sessions)`)
  console.log(`❌ ${failed.length} failed probe(s)`)
  console.log()
  console.log('RECOMMENDATION:')
  console.log(recommendation)
  console.log('='.repeat(100))
  console.log()

  return NextResponse.json({
    eventId,
    baseUrl: getBaseUrl(),
    results,
    analysis: {
      successful: successful.length,
      empty: empty.length,
      failed: failed.length,
      recommendation,
    },
  })
}










