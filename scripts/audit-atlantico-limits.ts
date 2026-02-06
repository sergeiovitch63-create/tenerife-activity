/**
 * AUDIT COMPLET - EventAvailableDays Atlántico
 * 
 * Analyse TOUS les tours + TOUTES leurs options (events) et vérifie,
 * pour chaque eventId, si loadLimits renvoie des disponibilités.
 * 
 * Usage: tsx scripts/audit-atlantico-limits.ts [classificationCode]
 * 
 * Génère 3 fichiers JSON dans data/audit/:
 * - limits_raw_sample.json (échantillon des réponses brutes)
 * - limits_summary_by_event.json (résumé factuel par eventId)
 * - limits_global_report.json (rapport global)
 */

// Note: This script runs in Node.js with tsx, not Next.js
// We need to handle imports and env vars manually

import * as fs from 'fs'
import * as path from 'path'

function getBaseUrl(): string {
  // Priority 1: Use ATLANTICO_BASE_URL if defined (for proxy setup)
  const baseUrl = process.env.ATLANTICO_BASE_URL
  if (baseUrl && baseUrl.trim()) {
    return baseUrl.trim()
  }
  
  // Priority 2: Fallback to ATLANTICO_ENV-based selection
  const env = process.env.ATLANTICO_ENV?.toLowerCase().trim()
  
  if (env === 'test') {
    return 'https://testapi.atlanticoexcursiones.com'
  }
  
  // Default to production
  return 'https://api.atlanticoexcursiones.com'
}

// Configuration
const MAX_CONCURRENCY = 3
const DELAY_BETWEEN_REQUESTS_MS = 200
const FETCH_TIMEOUT_MS = 15000
const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [500, 1500, 3000]
const MAX_RAW_SAMPLES = 30

// Types
interface RawSample {
  eventId: string
  month: string
  httpStatus: number
  rawResponseOrError: any
}

interface MonthSummary {
  month: string
  httpStatus: number
  hasSessions: boolean
  sessionsKeysCount: number | null
  hasDatesArray: boolean
  datesCount: number | null
  hasLimitArray: boolean
  hasUsedArray: boolean
  responseSizeBytes: number
  errorType: string | null
  eventDetailsStatus?: number | null
  eventDetailsName?: string | null
}

interface EventSummary {
  eventId: string
  months: MonthSummary[]
}

interface GlobalReport {
  scannedToursCount: number
  scannedEventIdsCount: number
  monthsTested: string[]
  okEventsCount: number
  eventsWithSessionsCount: number
  eventsWithDatesArrayCount: number
  eventsAlwaysEmptyCount: number
  eventsAlwaysErrorCount: number
  top10MostCommonErrorTypes: Array<{ errorType: string; count: number }>
  sampleAlwaysEmptyEventIds: string[]
  sampleAlwaysErrorEventIds: string[]
}

// Utils
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES
): Promise<{ status: number; text: string; error?: string }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          ...(process.env.ATLANTICO_TOKEN ? { 'Authorization': `Bearer ${process.env.ATLANTICO_TOKEN}` } : {}),
        },
        signal: controller.signal,
        cache: 'no-store',
      })
      
      clearTimeout(timeoutId)
      const text = await response.text()
      
      return {
        status: response.status,
        text,
      }
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (attempt < retries - 1) {
        const delayMs = RETRY_DELAYS_MS[attempt] || 3000
        await delay(delayMs)
        continue
      }
      
      // Last attempt failed
      const errorType = error.name === 'AbortError' ? 'TIMEOUT' : 
                       error.message?.includes('ECONNRESET') ? 'ECONNRESET' :
                       error.message?.includes('ENOTFOUND') ? 'ENOTFOUND' :
                       error.message?.includes('ECONNREFUSED') ? 'ECONNREFUSED' :
                       'UNKNOWN_ERROR'
      
      return {
        status: 0,
        text: '',
        error: errorType,
      }
    }
  }
  
  return {
    status: 0,
    text: '',
    error: 'MAX_RETRIES_EXCEEDED',
  }
}

function parseEventIds(ids: unknown): number[] {
  if (!ids) return []
  
  // If array, convert to numbers
  if (Array.isArray(ids)) {
    return ids
      .map(x => Number(x))
      .filter(n => Number.isFinite(n) && n > 0)
  }
  
  // If string, split by comma and parse
  if (typeof ids === 'string') {
    return ids
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => Number(s))
      .filter(n => Number.isFinite(n) && n > 0)
  }
  
  // If number, return as array
  if (typeof ids === 'number' && Number.isFinite(ids) && ids > 0) {
    return [ids]
  }
  
  return []
}

function analyzeRawResponse(raw: any, httpStatus: number, errorType: string | null): Omit<MonthSummary, 'month' | 'httpStatus' | 'errorType'> {
  if (httpStatus !== 200 || errorType || !raw) {
    return {
      hasSessions: false,
      sessionsKeysCount: null,
      hasDatesArray: false,
      datesCount: null,
      hasLimitArray: false,
      hasUsedArray: false,
      responseSizeBytes: 0,
    }
  }
  
  const hasSessions = raw?.dates?.sessions && typeof raw.dates.sessions === 'object'
  const sessionsKeysCount = hasSessions ? Object.keys(raw.dates.sessions).length : null
  
  const hasDatesArray = Array.isArray(raw?.dates?.date)
  const datesCount = hasDatesArray ? raw.dates.date.length : null
  
  const hasLimitArray = Array.isArray(raw?.dates?.limit)
  const hasUsedArray = Array.isArray(raw?.dates?.used)
  
  const responseSizeBytes = JSON.stringify(raw).length
  
  return {
    hasSessions,
    sessionsKeysCount,
    hasDatesArray,
    datesCount,
    hasLimitArray,
    hasUsedArray,
    responseSizeBytes,
  }
}

// Main audit function
async function auditAtlanticoLimits(classificationCode?: string) {
  console.log('🔍 AUDIT COMPLET - EventAvailableDays Atlántico')
  console.log('='.repeat(60))
  
  const baseUrl = getBaseUrl()
  console.log(`📍 Base URL: ${baseUrl}`)
  console.log(`📅 Months: current + next month`)
  console.log(`⚡ Concurrency: ${MAX_CONCURRENCY}`)
  console.log(`⏱️  Delay: ${DELAY_BETWEEN_REQUESTS_MS}ms`)
  console.log('')
  
  // Step 1: Get all tours
  console.log('📋 Step 1: Fetching all tours...')
  const lang = 'ENG'
  const groupsListUrl = `${baseUrl}/groupsList/${lang}/-1${classificationCode ? `/${classificationCode}` : ''}`
  
  let tours: any[] = []
  try {
    const response = await fetchWithRetry(groupsListUrl)
    if (response.status === 200) {
      try {
        const data = JSON.parse(response.text)
        tours = Array.isArray(data) ? data : Array.isArray(data.groups) ? data.groups : Array.isArray(data.data) ? data.data : []
      } catch (parseError) {
        console.error('❌ Failed to parse groupsList response')
        console.error('Response preview:', response.text.substring(0, 500))
        process.exit(1)
      }
    } else {
      console.error(`❌ Failed to fetch tours: HTTP ${response.status}`)
      if (response.error) {
        console.error(`   Error type: ${response.error}`)
      }
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error fetching tours:', error)
    process.exit(1)
  }
  
  console.log(`✅ Found ${tours.length} tours`)
  console.log('')
  
  // Step 1.5: Sample tours from groupsList
  console.log('📋 Step 1.5: Sampling tours data...')
  const toursSamples = tours.slice(0, 5).map(tour => ({
    id: tour.id || tour.Id || null,
    code: tour.code || tour.Code || null,
    name: tour.name || tour.Name || tour.title || tour.Title || null,
    ids: tour.ids || tour.Ids || null,
    idsType: typeof (tour.ids || tour.Ids),
    idsValue: String(tour.ids || tour.Ids || ''),
  }))
  
  // Step 2: Extract all eventIds
  console.log('📋 Step 2: Extracting eventIds from tours...')
  const eventIdsSetFromGroupsList = new Set<number>()
  const eventIdsSetFromGroupDetails = new Set<number>()
  const tourEventMap = new Map<string, number[]>() // tourId -> eventIds[]
  const groupDetailsSamples: any[] = []
  
  let processedTours = 0
  const semaphore = { count: 0 }
  
  async function processTour(tour: any) {
    while (semaphore.count >= MAX_CONCURRENCY) {
      await delay(50)
    }
    semaphore.count++
    
    try {
      const tourId = String(tour.id || tour.Id || '')
      if (!tourId) {
        return
      }
      
      // Try to extract from groupsList first (if ids present)
      const idsFromTour = tour.ids || tour.Ids
      if (idsFromTour) {
        const eventIdsFromTour = parseEventIds(idsFromTour)
        eventIdsFromTour.forEach(id => eventIdsSetFromGroupsList.add(id))
      }
      
      // Then fetch groupDetails
      const groupDetailsUrl = `${baseUrl}/groupDetails/${tourId}/${lang}`
      const response = await fetchWithRetry(groupDetailsUrl)
      
      if (response.status === 200) {
        try {
          const details = JSON.parse(response.text)
          
          // Sample first 5 groupDetails
          if (groupDetailsSamples.length < 5) {
            groupDetailsSamples.push({
              tourId,
              id: details.id || details.Id || null,
              code: details.code || details.Code || null,
              name: details.name || details.Name || details.title || details.Title || null,
              ids: details.ids || details.Ids || null,
              idsType: typeof (details.ids || details.Ids),
              idsValue: String(details.ids || details.Ids || ''),
            })
          }
          
          const idsFromDetails = details.ids || details.Ids || ''
          const eventIds = parseEventIds(idsFromDetails)
          
          if (eventIds.length > 0) {
            tourEventMap.set(tourId, eventIds)
            eventIds.forEach(id => eventIdsSetFromGroupDetails.add(id))
          }
        } catch (parseError) {
          console.warn(`⚠️  Failed to parse groupDetails for tour ${tourId}`)
        }
      }
      
      processedTours++
      if (processedTours % 10 === 0) {
        console.log(`   Processed ${processedTours}/${tours.length} tours...`)
      }
      
      await delay(DELAY_BETWEEN_REQUESTS_MS)
    } finally {
      semaphore.count--
    }
  }
  
  await Promise.all(tours.map(tour => processTour(tour)))
  
  // Merge both sources
  const allEventIds = new Set<number>()
  eventIdsSetFromGroupsList.forEach(id => allEventIds.add(id))
  eventIdsSetFromGroupDetails.forEach(id => allEventIds.add(id))
  
  const eventIds = Array.from(allEventIds).sort((a, b) => a - b)
  console.log(`✅ Found ${eventIds.length} unique eventIds`)
  console.log(`   From groupsList: ${eventIdsSetFromGroupsList.size}`)
  console.log(`   From groupDetails: ${eventIdsSetFromGroupDetails.size}`)
  console.log('')
  
  // Save samples
  const auditDir = path.join(process.cwd(), 'data', 'audit')
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true })
  }
  
  fs.writeFileSync(
    path.join(auditDir, 'samples_ids.json'),
    JSON.stringify({
      toursSamples,
      groupDetailsSamples,
    }, null, 2)
  )
  
  fs.writeFileSync(
    path.join(auditDir, 'eventIds_sources_compare.json'),
    JSON.stringify({
      toursCount: tours.length,
      uniqueEventIdsFromGroupsList: Array.from(eventIdsSetFromGroupsList).sort((a, b) => a - b),
      uniqueEventIdsFromGroupDetails: Array.from(eventIdsSetFromGroupDetails).sort((a, b) => a - b),
      overlapCount: Array.from(eventIdsSetFromGroupsList).filter(id => eventIdsSetFromGroupDetails.has(id)).length,
      totalUniqueEventIds: eventIds.length,
    }, null, 2)
  )
  
  console.log('📁 Saved samples to data/audit/samples_ids.json')
  console.log('📁 Saved comparison to data/audit/eventIds_sources_compare.json')
  console.log('')
  
  // Step 3: Get months to test
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`
  const monthsToTest = [currentMonth, nextMonth]
  
  console.log(`📅 Step 3: Testing ${eventIds.length} eventIds across ${monthsToTest.length} months`)
  console.log(`   Months: ${monthsToTest.join(', ')}`)
  console.log('')
  
  // Step 4: Test loadLimits for each eventId
  const rawSamples: RawSample[] = []
  const eventSummaries = new Map<string, EventSummary>()
  const errorTypeCounts = new Map<string, number>()
  
  let processedEvents = 0
  const semaphore2 = { count: 0 }
  
  async function processEventId(eventId: number) {
    while (semaphore2.count >= MAX_CONCURRENCY) {
      await delay(50)
    }
    semaphore2.count++
    
    try {
      const months: MonthSummary[] = []
      
      for (const month of monthsToTest) {
        const loadLimitsUrl = `${baseUrl}/loadLimits/${String(eventId)}/${lang}/${month}`
        const response = await fetchWithRetry(loadLimitsUrl)
        
        let raw: any = null
        let errorType: string | null = response.error || null
        
        if (response.status === 200 && !errorType) {
          try {
            const trimmed = response.text.trim()
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              raw = JSON.parse(trimmed)
            } else if (trimmed.startsWith('"')) {
              const once = JSON.parse(trimmed)
              if (typeof once === 'string') {
                raw = JSON.parse(once)
              } else {
                raw = once
              }
            } else {
              errorType = 'PARSE_ERROR'
              raw = { _rawText: response.text.substring(0, 500) }
            }
          } catch (parseError) {
            errorType = 'PARSE_ERROR'
            raw = { _rawText: response.text.substring(0, 500) }
          }
        } else if (response.status !== 200) {
          errorType = `HTTP_${response.status}`
        }
        
        // Count error types
        if (errorType) {
          errorTypeCounts.set(errorType, (errorTypeCounts.get(errorType) || 0) + 1)
        }
        
        const analysis = analyzeRawResponse(raw, response.status, errorType)
        
        months.push({
          month,
          httpStatus: response.status,
          errorType,
          ...analysis,
        })
        
        // Add to raw samples (max 30)
        if (rawSamples.length < MAX_RAW_SAMPLES) {
          rawSamples.push({
            eventId: String(eventId),
            month,
            httpStatus: response.status,
            rawResponseOrError: errorType ? { error: errorType, status: response.status } : raw,
          })
        }
        
        await delay(DELAY_BETWEEN_REQUESTS_MS)
      }
      
      // Check eventDetails for empty/error events
      const hasAnyError = months.some(m => m.errorType !== null)
      const hasAnyData = months.some(m => m.hasSessions || m.hasDatesArray)
      
      if (hasAnyError || !hasAnyData) {
        const eventDetailsUrl = `${baseUrl}/eventDetails/${eventId}/${lang}`
        const eventDetailsResponse = await fetchWithRetry(eventDetailsUrl)
        
        for (const monthSummary of months) {
          monthSummary.eventDetailsStatus = eventDetailsResponse.status
          if (eventDetailsResponse.status === 200) {
            try {
              const details = JSON.parse(eventDetailsResponse.text)
              monthSummary.eventDetailsName = details.name || details.Name || details.title || details.Title || null
            } catch {
              // Ignore parse errors
            }
          }
        }
        
        await delay(DELAY_BETWEEN_REQUESTS_MS)
      }
      
      eventSummaries.set(String(eventId), {
        eventId: String(eventId),
        months,
      })
      
      processedEvents++
      if (processedEvents % 50 === 0) {
        console.log(`   Processed ${processedEvents}/${eventIds.length} eventIds...`)
      }
    } finally {
      semaphore2.count--
    }
  }
  
  await Promise.all(eventIds.map(id => processEventId(id)))
  
  console.log(`✅ Processed ${processedEvents} eventIds`)
  console.log('')
  
  // Step 5: Generate reports
  console.log('📊 Step 5: Generating reports...')
  
  // Calculate global stats
  const okEvents = new Set<string>()
  const eventsWithSessions = new Set<string>()
  const eventsWithDatesArray = new Set<string>()
  const alwaysEmptyEvents: string[] = []
  const alwaysErrorEvents: string[] = []
  
  for (const [eventId, summary] of eventSummaries.entries()) {
    const hasOk = summary.months.some(m => m.httpStatus === 200)
    const hasSessions = summary.months.some(m => m.hasSessions)
    const hasDatesArray = summary.months.some(m => m.hasDatesArray)
    const allEmpty = summary.months.every(m => !m.hasSessions && !m.hasDatesArray && m.httpStatus === 200)
    const allError = summary.months.every(m => m.errorType !== null || m.httpStatus !== 200)
    
    if (hasOk) okEvents.add(eventId)
    if (hasSessions) eventsWithSessions.add(eventId)
    if (hasDatesArray) eventsWithDatesArray.add(eventId)
    if (allEmpty) alwaysEmptyEvents.push(eventId)
    if (allError) alwaysErrorEvents.push(eventId)
  }
  
  const top10Errors = Array.from(errorTypeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([errorType, count]) => ({ errorType, count }))
  
  const globalReport: GlobalReport = {
    scannedToursCount: tours.length,
    scannedEventIdsCount: eventIds.length,
    monthsTested: monthsToTest,
    okEventsCount: okEvents.size,
    eventsWithSessionsCount: eventsWithSessions.size,
    eventsWithDatesArrayCount: eventsWithDatesArray.size,
    eventsAlwaysEmptyCount: alwaysEmptyEvents.length,
    eventsAlwaysErrorCount: alwaysErrorEvents.length,
    top10MostCommonErrorTypes: top10Errors,
    sampleAlwaysEmptyEventIds: alwaysEmptyEvents.slice(0, 20),
    sampleAlwaysErrorEventIds: alwaysErrorEvents.slice(0, 20),
  }
  
  // Write files (auditDir already created earlier)
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true })
  }
  
  fs.writeFileSync(
    path.join(auditDir, 'limits_raw_sample.json'),
    JSON.stringify(rawSamples, null, 2)
  )
  
  fs.writeFileSync(
    path.join(auditDir, 'limits_summary_by_event.json'),
    JSON.stringify(Array.from(eventSummaries.values()), null, 2)
  )
  
  fs.writeFileSync(
    path.join(auditDir, 'limits_global_report.json'),
    JSON.stringify(globalReport, null, 2)
  )
  
  console.log('✅ Reports generated!')
  console.log('')
  console.log('📁 Files written to:')
  console.log(`   ${path.join(auditDir, 'limits_raw_sample.json')}`)
  console.log(`   ${path.join(auditDir, 'limits_summary_by_event.json')}`)
  console.log(`   ${path.join(auditDir, 'limits_global_report.json')}`)
  console.log('')
  console.log('📊 SUMMARY:')
  console.log(`   Scanned tours: ${globalReport.scannedToursCount}`)
  console.log(`   Scanned eventIds: ${globalReport.scannedEventIdsCount}`)
  console.log(`   Events with sessions: ${globalReport.eventsWithSessionsCount}`)
  console.log(`   Events always empty: ${globalReport.eventsAlwaysEmptyCount}`)
  console.log(`   Events always error: ${globalReport.eventsAlwaysErrorCount}`)
  console.log('')
}

// Run
const classificationCode = process.argv[2]
auditAtlanticoLimits(classificationCode).catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

