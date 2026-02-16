/**
 * AUDIT #2 - Dump brut de l'API Atlántico
 * 
 * Pour 10 eventIds, dump la réponse BRUTE (texte) de loadLimits et eventDetails
 * pour comprendre le format exact renvoyé par l'API.
 * 
 * Usage: tsx scripts/audit2-dump-raw.ts
 */

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
const FETCH_TIMEOUT_MS = 15000
const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [500, 1500, 3000]

// Sample eventIds: 5 aléatoires depuis sampleAlwaysEmptyEventIds + 5 connus du site
const SAMPLE_EVENT_IDS = [
  // 5 eventIds connus du site (exemples)
  2737, 2738, 2739, 184, 546,
  // 5 eventIds à prendre depuis sampleAlwaysEmptyEventIds (sera rempli dynamiquement)
  // Ces IDs seront lus depuis limits_global_report.json si disponible
]

// Types
interface EventDetailsDump {
  status: number
  bodyTextFirst500: string
  jsonKeys: string[] | null
  json: any | null
}

interface LoadLimitsDump {
  status: number
  bodyTextFirst800: string
  jsonParseOk: boolean
  jsonTopKeys: string[] | null
  hasDatesKey: boolean
  datesKeys: string[] | null
  samplePaths: {
    datesSessionsType: string
    datesDateType: string
    altSessionsType: string
    altDatesType: string
  }
}

interface EventDump {
  eventId: number
  eventDetails: EventDetailsDump
  loadLimits: LoadLimitsDump
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
      
      return {
        status: 0,
        text: '',
        error: error.name === 'AbortError' ? 'TIMEOUT' : 'UNKNOWN_ERROR',
      }
    }
  }
  
  return {
    status: 0,
    text: '',
    error: 'MAX_RETRIES_EXCEEDED',
  }
}

function tryParseJson(text: string): { success: boolean; json: any; keys: string[] | null } {
  try {
    const trimmed = text.trim()
    if (!trimmed) {
      return { success: false, json: null, keys: null }
    }
    
    // Try direct parse
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const json = JSON.parse(trimmed)
      return { success: true, json, keys: Object.keys(json) }
    }
    
    // Try double-encoded
    if (trimmed.startsWith('"')) {
      const once = JSON.parse(trimmed)
      if (typeof once === 'string') {
        const tt = once.trim()
        if (tt.startsWith('{') || tt.startsWith('[')) {
          const json = JSON.parse(tt)
          return { success: true, json, keys: Object.keys(json) }
        }
      }
      return { success: true, json: once, keys: typeof once === 'object' && once !== null ? Object.keys(once) : null }
    }
    
    return { success: false, json: null, keys: null }
  } catch {
    return { success: false, json: null, keys: null }
  }
}

function safeGetType(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  return typeof value
}

function safeGetKeys(obj: any): string[] | null {
  if (!obj || typeof obj !== 'object') return null
  try {
    return Object.keys(obj)
  } catch {
    return null
  }
}

// Main audit function
async function audit2DumpRaw() {
  console.log('🔍 AUDIT #2 - Dump brut de l\'API Atlántico')
  console.log('='.repeat(60))
  
  const baseUrl = getBaseUrl()
  console.log(`📍 Base URL: ${baseUrl}`)
  console.log('')
  
  // Step 1: Load sampleAlwaysEmptyEventIds from previous audit if available
  let eventIdsToTest = [...SAMPLE_EVENT_IDS]
  const auditDir = path.join(process.cwd(), 'data', 'audit')
  const globalReportPath = path.join(auditDir, 'limits_global_report.json')
  
  if (fs.existsSync(globalReportPath)) {
    try {
      const globalReport = JSON.parse(fs.readFileSync(globalReportPath, 'utf-8'))
      const sampleAlwaysEmpty = globalReport.sampleAlwaysEmptyEventIds || []
      
      // Convert strings to numbers
      const emptyEventIds = sampleAlwaysEmpty
        .map((id: any) => {
          const num = typeof id === 'string' ? parseInt(id, 10) : id
          return Number.isFinite(num) ? num : null
        })
        .filter((id: any): id is number => id !== null)
        .slice(0, 5)
      
      // Replace the last 5 with empty eventIds
      eventIdsToTest = [
        ...SAMPLE_EVENT_IDS.slice(0, 5), // Keep the 5 known ones
        ...emptyEventIds, // Add the 5 empty ones
      ]
      
      console.log(`📋 Loaded ${emptyEventIds.length} eventIds from previous audit`)
    } catch (error) {
      console.warn('⚠️  Could not load previous audit, using default eventIds')
    }
  }
  
  // Remove duplicates and filter invalid
  eventIdsToTest = Array.from(new Set(eventIdsToTest.filter(id => Number.isFinite(id) && id > 0)))
  
  console.log(`📋 Testing ${eventIdsToTest.length} eventIds:`)
  console.log(`   ${eventIdsToTest.join(', ')}`)
  console.log('')
  
  const lang = 'ENG'
  const month = '2026-01-01'
  const dumps: EventDump[] = []
  
  let eventDetailsNon200 = 0
  let loadLimitsParseOk = 0
  
  // Step 2: Process each eventId
  for (let i = 0; i < eventIdsToTest.length; i++) {
    const eventId = eventIdsToTest[i]
    console.log(`[${i + 1}/${eventIdsToTest.length}] Processing eventId ${eventId}...`)
    
    // 2.1: eventDetails
    const eventDetailsUrl = `${baseUrl}/eventDetails/${eventId}/${lang}`
    const eventDetailsResponse = await fetchWithRetry(eventDetailsUrl)
    
    const eventDetailsText = eventDetailsResponse.text || ''
    const eventDetailsParse = tryParseJson(eventDetailsText)
    
    if (eventDetailsResponse.status !== 200) {
      eventDetailsNon200++
    }
    
    const eventDetailsDump: EventDetailsDump = {
      status: eventDetailsResponse.status,
      bodyTextFirst500: eventDetailsText.substring(0, 500),
      jsonKeys: eventDetailsParse.keys,
      json: eventDetailsParse.success && eventDetailsParse.json && JSON.stringify(eventDetailsParse.json).length < 10000
        ? eventDetailsParse.json
        : null,
    }
    
    // 2.2: loadLimits
    const loadLimitsUrl = `${baseUrl}/loadLimits/${eventId}/${lang}/${month}`
    const loadLimitsResponse = await fetchWithRetry(loadLimitsUrl)
    
    const loadLimitsText = loadLimitsResponse.text || ''
    const loadLimitsParse = tryParseJson(loadLimitsText)
    
    if (loadLimitsParse.success) {
      loadLimitsParseOk++
    }
    
    const loadLimitsJson = loadLimitsParse.json
    const hasDatesKey = loadLimitsJson && typeof loadLimitsJson === 'object' && 'dates' in loadLimitsJson
    const datesKeys = hasDatesKey && loadLimitsJson.dates
      ? safeGetKeys(loadLimitsJson.dates)
      : null
    
    const loadLimitsDump: LoadLimitsDump = {
      status: loadLimitsResponse.status,
      bodyTextFirst800: loadLimitsText.substring(0, 800),
      jsonParseOk: loadLimitsParse.success,
      jsonTopKeys: loadLimitsParse.keys,
      hasDatesKey: hasDatesKey || false,
      datesKeys,
      samplePaths: {
        datesSessionsType: safeGetType(loadLimitsJson?.dates?.sessions),
        datesDateType: safeGetType(loadLimitsJson?.dates?.date),
        altSessionsType: safeGetType(loadLimitsJson?.sessions),
        altDatesType: safeGetType(loadLimitsJson?.date),
      },
    }
    
    dumps.push({
      eventId,
      eventDetails: eventDetailsDump,
      loadLimits: loadLimitsDump,
    })
    
    // Delay between requests
    await delay(200)
  }
  
  console.log('')
  console.log('✅ Processing complete!')
  console.log('')
  
  // Step 3: Save dump file
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true })
  }
  
  const dumpFilePath = path.join(auditDir, 'audit2_dump_raw.json')
  fs.writeFileSync(dumpFilePath, JSON.stringify(dumps, null, 2))
  
  // Step 4: Console output
  console.log('📊 STATISTICS:')
  console.log(`   EventDetails status != 200: ${eventDetailsNon200}/${eventIdsToTest.length}`)
  console.log(`   LoadLimits parse JSON OK: ${loadLimitsParseOk}/${eventIdsToTest.length}`)
  console.log('')
  console.log('📁 Dump file saved to:')
  console.log(`   ${dumpFilePath}`)
  console.log('')
}

// Run
audit2DumpRaw().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})












