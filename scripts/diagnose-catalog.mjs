#!/usr/bin/env node
/**
 * Quick diagnostic script for STEP 0
 * Tests catalog and tours endpoints to identify why tours returns 0
 */

const BASE_URL = 'http://localhost:3000'
const TIMEOUT_MS = 10000

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
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

async function testEndpoint(name, url) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`${name}`)
  console.log(`URL: ${url}`)
  console.log(`${'='.repeat(60)}`)

  try {
    const response = await fetchWithTimeout(url, TIMEOUT_MS)
    const text = await response.text()
    const preview = text.trim().substring(0, 200)
    
    console.log(`Status: ${response.status}`)
    console.log(`Content-Type: ${response.headers.get('content-type') || 'unknown'}`)
    console.log(`Response preview (first 200 chars):`)
    console.log(preview + (text.length > 200 ? '...' : ''))
    
    if (response.ok) {
      try {
        const data = JSON.parse(text)
        if (Array.isArray(data)) {
          console.log(`✅ Array with ${data.length} items`)
        } else if (data.items && Array.isArray(data.items)) {
          console.log(`✅ Object with items array: ${data.items.length} items`)
        } else if (data.groups && Array.isArray(data.groups)) {
          console.log(`✅ Object with groups array: ${data.groups.length} groups`)
        } else {
          console.log(`⚠️  Response structure: ${Object.keys(data).join(', ')}`)
        }
      } catch (e) {
        console.log(`⚠️  Could not parse JSON`)
      }
    } else {
      console.log(`❌ HTTP ${response.status}`)
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

async function main() {
  console.log('🔍 STEP 0: Catalog Endpoint Diagnostics\n')

  // Test 1: Known working catalog endpoint
  await testEndpoint(
    'Test 1: /api/atlantico/catalog?lang=ENG&page=-1',
    `${BASE_URL}/api/atlantico/catalog?lang=ENG&page=-1`
  )

  // Test 2: Tours endpoint (currently returns 0)
  await testEndpoint(
    'Test 2: /api/atlantico/tours/ENG',
    `${BASE_URL}/api/atlantico/tours/ENG`
  )

  // Test 3: Direct groupsList call (what tours uses internally)
  // We can't call this directly, but we can check what tours endpoint logs
  console.log(`\n${'='.repeat(60)}`)
  console.log('Note: tours endpoint calls /groupsList/ENG/-1 internally')
  console.log('Check server logs for [TOURS] output to see groupsList response')
  console.log(`${'='.repeat(60)}`)

  // Test 4: Catalog by lang route
  await testEndpoint(
    'Test 3: /api/atlantico/catalog/ENG',
    `${BASE_URL}/api/atlantico/catalog/ENG`
  )
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})














