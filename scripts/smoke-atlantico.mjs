#!/usr/bin/env node
/**
 * Smoke test for Atlantico API endpoints
 * 
 * This script tests the internal Next.js API routes for Atlantico integration.
 * 
 * Prerequisites:
 * - The Next.js dev server must be running: `pnpm dev`
 * - The server should be accessible at http://localhost:3000
 * 
 * Usage:
 *   pnpm smoke:atlantico
 * 
 * The script will:
 * - Test each endpoint with a 10s timeout
 * - Display URL, status, content-type, and first 200 chars of response
 * - Exit with code 0 if all endpoints return 200, otherwise exit with code 1
 */

const BASE_URL = 'http://localhost:3000'
const TIMEOUT_MS = 10000

// Endpoints to test (basic)
const BASIC_ENDPOINTS = [
  '/api/atlantico/health',
  '/api/atlantico/group/31/ENG',
  '/api/atlantico/event/1317/ENG',
  '/api/atlantico/catalog?lang=ENG&page=-1',
]

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

/**
 * Test a single endpoint
 */
async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint}`

  try {
    const response = await fetchWithTimeout(url, TIMEOUT_MS)
    const contentType = response.headers.get('content-type') || 'unknown'
    
    // Read response body (limit to first 200 chars for display)
    let bodyPreview = ''
    try {
      const text = await response.text()
      bodyPreview = text.trim().substring(0, 200)
      if (text.length > 200) {
        bodyPreview += '...'
      }
    } catch (error) {
      bodyPreview = `[Error reading body: ${error.message}]`
    }

    return {
      url,
      status: response.status,
      contentType,
      bodyPreview,
      success: response.status === 200,
      error: null,
    }
  } catch (error) {
    return {
      url,
      status: null,
      contentType: null,
      bodyPreview: null,
      success: false,
      error: error.message,
    }
  }
}

/**
 * Map locale code to Atlantico language code
 * Returns both short (en) and long (ENG) formats
 */
function getLanguageVariants(locale = 'en') {
  const localeMap = {
    en: 'ENG',
    es: 'ESP',
    de: 'GER',
    fr: 'FRA',
    it: 'ITA',
    ru: 'RUS',
    pl: 'POL',
  }
  const long = localeMap[locale] || 'ENG'
  return [locale, long]
}

/**
 * Extract groupCode from item with priority: code || groupCode || id
 * Only use id if it looks like a group code (not numeric-only event code)
 */
function extractGroupCode(item) {
  if (!item || typeof item !== 'object') {
    return null
  }

  // Priority 1: code field
  if (item.code && typeof item.code === 'string' && item.code.trim().length > 0) {
    return item.code.trim()
  }

  // Priority 2: groupCode field
  if (item.groupCode && typeof item.groupCode === 'string' && item.groupCode.trim().length > 0) {
    return item.groupCode.trim()
  }

  // Priority 3: id field (only if it looks like a group code, not just numeric)
  if (item.id) {
    const idStr = String(item.id).trim()
    // If id is purely numeric and short, it's likely an event code, skip it
    // If id has letters or is longer, it might be a group code
    if (idStr.length > 0 && (!/^\d{1,4}$/.test(idStr) || idStr.length > 4)) {
      return idStr
    }
  }

  return null
}

/**
 * Test catalog endpoint and extract groupCodes
 * Supports both language formats and multiple response shapes
 */
async function getGroupCodesFromCatalog() {
  const langVariants = getLanguageVariants('en') // Try 'en' first, then 'ENG'
  let lastError = null
  let lastUrl = null
  let lastResponseText = null

  // Try both language formats
  for (const lang of langVariants) {
    try {
      // Try catalog/[lang] first (preferred)
      let url = `${BASE_URL}/api/atlantico/catalog/${lang}`
      lastUrl = url
      
      console.log(`\n📡 Fetching: ${url}`)
      
      let response = await fetchWithTimeout(url, TIMEOUT_MS)
      lastResponseText = await response.text()
      
      // If 404, try fallback catalog?lang=ENG&page=-1
      if (!response.ok && response.status === 404) {
        url = `${BASE_URL}/api/atlantico/catalog?lang=${lang}&page=-1`
        lastUrl = url
        console.log(`   ⚠️  HTTP ${response.status}, trying fallback: ${url}`)
        response = await fetchWithTimeout(url, TIMEOUT_MS)
        lastResponseText = await response.text()
      }
      
      // Print first 200 chars of JSON
      const preview = lastResponseText.trim().substring(0, 200)
      console.log(`   Response preview (first 200 chars): ${preview}${lastResponseText.length > 200 ? '...' : ''}`)
      
      if (!response.ok) {
        console.log(`   ⚠️  HTTP ${response.status}, trying next language variant...`)
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
        continue
      }

      // Parse JSON
      let data
      try {
        data = JSON.parse(lastResponseText)
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${parseError.message}`)
      }

      // Extract items array from various response shapes
      let items = []
      
      // Shape 1: Array root
      if (Array.isArray(data)) {
        items = data
        console.log(`   ✅ Found array root with ${items.length} items`)
      }
      // Shape 2: { items: [...] }
      else if (Array.isArray(data.items)) {
        items = data.items
        console.log(`   ✅ Found items array with ${items.length} items`)
      }
      // Shape 3: { groups: [...] }
      else if (Array.isArray(data.groups)) {
        items = data.groups
        console.log(`   ✅ Found groups array with ${items.length} items`)
      }
      // Shape 4: { tours: [...] }
      else if (Array.isArray(data.tours)) {
        items = data.tours
        console.log(`   ✅ Found tours array with ${items.length} items`)
      }
      // Shape 5: { data: [...] }
      else if (Array.isArray(data.data)) {
        items = data.data
        console.log(`   ✅ Found data array with ${items.length} items`)
      }
      // Unknown shape
      else {
        const keys = Object.keys(data || {})
        throw new Error(
          `Unknown response shape. Expected array root, items, groups, tours, or data array. ` +
          `Found keys: ${keys.length > 0 ? keys.join(', ') : 'none'}. ` +
          `Response structure: ${JSON.stringify(data).substring(0, 300)}`
        )
      }

      if (items.length === 0) {
        console.log(`   ⚠️  Empty items array, trying next language variant...`)
        lastError = new Error('Empty items array')
        continue
      }

      // Extract groupCodes from items (_raw.group or _raw.groupCode)
      const groupCodes = []
      for (const item of items.slice(0, 5)) {
        const groupCode = item._raw?.group || item._raw?.groupCode || extractGroupCode(item)
        if (groupCode) {
          groupCodes.push(groupCode)
        }
      }

      if (groupCodes.length === 0) {
        // Show first item structure for debugging
        const firstItem = items[0]
        const firstItemKeys = firstItem ? Object.keys(firstItem) : []
        const firstItemRawKeys = firstItem?._raw ? Object.keys(firstItem._raw) : []
        throw new Error(
          `No groupCodes found in items. ` +
          `First item keys: ${firstItemKeys.length > 0 ? firstItemKeys.join(', ') : 'none'}. ` +
          `First item _raw keys: ${firstItemRawKeys.length > 0 ? firstItemRawKeys.join(', ') : 'none'}. ` +
          `First item sample: ${JSON.stringify(firstItem).substring(0, 200)}`
        )
      }

      console.log(`   ✅ Extracted ${groupCodes.length} groupCode(s): ${groupCodes.join(', ')}`)
      return groupCodes

    } catch (error) {
      lastError = error
      console.log(`   ❌ Error with lang="${lang}": ${error.message}`)
      // Continue to next language variant
      continue
    }
  }

  // If we get here, all language variants failed
  console.log(`\n❌ Failed to extract groupCodes from catalog endpoint`)
  console.log(`   Last URL tried: ${lastUrl}`)
  if (lastResponseText) {
    const preview = lastResponseText.trim().substring(0, 200)
    console.log(`   Last response preview: ${preview}${lastResponseText.length > 200 ? '...' : ''}`)
  }
  if (lastError) {
    console.log(`   Last error: ${lastError.message}`)
  }
  throw new Error(
    `Could not extract groupCodes from catalog endpoint. ` +
    `Tried languages: ${langVariants.join(', ')}. ` +
    `Last error: ${lastError?.message || 'Unknown'}`
  )
}

/**
 * Test debug-pricing endpoint
 */
async function testDebugPricing(groupCode) {
  const url = `${BASE_URL}/api/atlantico/debug-pricing/${groupCode}/ENG`
  
  try {
    const response = await fetchWithTimeout(url, TIMEOUT_MS)
    const contentType = response.headers.get('content-type') || 'unknown'
    
    let body = null
    try {
      body = await response.json()
    } catch (error) {
      body = { error: `Failed to parse JSON: ${error.message}` }
    }

    return {
      groupCode,
      status: response.status,
      contentType,
      body,
      success: response.status === 200,
      error: null,
    }
  } catch (error) {
    return {
      groupCode,
      status: null,
      contentType: null,
      body: null,
      success: false,
      error: error.message,
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔥 Atlantico API Smoke Test\n')
  
  // Test basic endpoints
  console.log(`Testing ${BASIC_ENDPOINTS.length} basic endpoint(s)...\n`)
  const basicResults = []

  for (const endpoint of BASIC_ENDPOINTS) {
    const result = await testEndpoint(endpoint)
    basicResults.push(result)

    // Display result
    console.log(`📍 ${result.url}`)
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`)
    } else {
      console.log(`   Status: ${result.status}`)
      console.log(`   Content-Type: ${result.contentType}`)
      console.log(`   Body preview: ${result.bodyPreview || '(empty)'}`)
      console.log(`   ${result.success ? '✅ OK' : '❌ FAILED'}`)
    }
    console.log()
  }

  // Test catalog and debug-pricing
  console.log('─'.repeat(50))
  console.log('Testing catalog and debug-pricing...\n')
  
  let groupCodes = []
  try {
    groupCodes = await getGroupCodesFromCatalog()
  } catch (error) {
    console.log(`\n❌ Failed to extract groupCodes: ${error.message}`)
    console.log('   Skipping debug-pricing tests\n')
    groupCodes = []
  }
  
  if (groupCodes.length === 0) {
    console.log('⚠️  No groupCodes found, skipping debug-pricing tests\n')
  } else {
    console.log(`Found ${groupCodes.length} groupCode(s), testing debug-pricing...\n`)
    
    const pricingResults = []
    for (const groupCode of groupCodes) {
      const result = await testDebugPricing(groupCode)
      pricingResults.push(result)
    }

    // Display pricing results table
    console.log('Debug Pricing Results:')
    console.log('─'.repeat(80))
    console.log('groupCode'.padEnd(20) + ' | cheapest'.padEnd(15) + ' | nextDate'.padEnd(15) + ' | status')
    console.log('─'.repeat(80))
    
    for (const result of pricingResults) {
      const cheapest = result.body?.cheapestOption?.minPrice
        ? `€${result.body.cheapestOption.minPrice}`
        : 'N/A'
      const nextDate = result.body?.cheapestOption?.nextDate || 'N/A'
      const status = result.success ? '✅ OK' : `❌ ${result.error || `HTTP ${result.status}`}`
      
      console.log(
        String(result.groupCode).padEnd(20) + ' | ' +
        cheapest.padEnd(15) + ' | ' +
        nextDate.padEnd(15) + ' | ' +
        status
      )
    }
    console.log('─'.repeat(80))
    console.log()
  }

  // Summary
  const basicSuccessCount = basicResults.filter((r) => r.success).length
  const totalBasicCount = basicResults.length

  console.log('─'.repeat(50))
  console.log(`Basic Endpoints: ${basicSuccessCount}/${totalBasicCount} passed`)

  if (basicSuccessCount === totalBasicCount) {
    console.log('✅ All basic endpoints returned 200 OK')
    process.exit(0)
  } else {
    console.log('❌ Some basic endpoints failed')
    const failed = basicResults.filter((r) => !r.success)
    failed.forEach((r) => {
      console.log(`   - ${r.url}: ${r.error || `Status ${r.status}`}`)
    })
    process.exit(1)
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

