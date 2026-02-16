#!/usr/bin/env node
/**
 * Test pricing pipeline for eventCode 1317 with wdays availability
 * 
 * Verifies:
 * 1. Availability with wdays format returns nextDate
 * 2. Prices endpoint returns price > 0
 * 3. UI would display "From €X"
 */

const BASE_URL = 'http://localhost:3000'
const TIMEOUT_MS = 15000

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

async function testPricingPipeline() {
  console.log('🧪 Testing Pricing Pipeline for eventCode 1317\n')
  console.log('='.repeat(60))

  const eventCode = '1317'
  const lang = 'ENG'
  const testMonth = '2026-01-01'

  // Step 1: Test availability endpoint
  console.log('\n📅 Step 1: Fetch availability with wdays format')
  console.log(`URL: ${BASE_URL}/api/atlantico/availability/${eventCode}/${lang}?month=${testMonth}`)
  
  try {
    const availUrl = `${BASE_URL}/api/atlantico/availability/${eventCode}/${lang}?month=${testMonth}`
    const availResponse = await fetchWithTimeout(availUrl, TIMEOUT_MS)
    
    if (!availResponse.ok) {
      console.log(`❌ Availability failed: HTTP ${availResponse.status}`)
      return false
    }

    const availData = await availResponse.json()
    console.log(`✅ Availability response received`)
    console.log(`   Keys: ${Object.keys(availData).join(', ')}`)
    
    // Check for wdays format
    const hasWdays = availData?.dates && typeof availData.dates === 'object' && Array.isArray(availData.dates.wdays)
    const wdays = hasWdays ? availData.dates.wdays : null
    const hasDatesArray = Array.isArray(availData?.dates)
    
    console.log(`   Has wdays: ${hasWdays ? 'Yes' : 'No'}`)
    if (hasWdays) {
      console.log(`   Wdays: [${wdays.join(', ')}]`)
    }
    console.log(`   Has dates array: ${hasDatesArray ? 'Yes' : 'No'}`)
    if (hasDatesArray) {
      console.log(`   Dates array length: ${availData.dates.length}`)
    }

    if (!hasWdays && !hasDatesArray) {
      console.log(`❌ No availability format found (neither wdays nor dates array)`)
      return false
    }

    // Step 2: Test pricing endpoint with computed nextDate
    // We need to compute nextDate from wdays if available
    let nextDate = null
    
    if (hasWdays && wdays.length > 0) {
      // Compute nextDate from wdays (simplified - in real code this is in limits.ts)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const year = 2026
      const month = 0 // January (0-indexed)
      const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
      const startDay = isCurrentMonth ? today.getDate() : 1
      
      // Find first matching weekday
      for (let day = startDay; day <= 31; day++) {
        try {
          const candidateDate = new Date(year, month, day)
          const weekday = candidateDate.getDay() === 0 ? 7 : candidateDate.getDay() // 1=Mon, 7=Sun
          
          if (wdays.includes(weekday)) {
            const candidateYMD = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            if (candidateDate >= today) {
              nextDate = candidateYMD
              break
            }
          }
        } catch (e) {
          // Invalid date, continue
        }
      }
    } else if (hasDatesArray && availData.dates.length > 0) {
      // Use first date from array
      nextDate = availData.dates[0]
    }

    if (!nextDate) {
      console.log(`❌ Could not compute nextDate from availability`)
      return false
    }

    console.log(`\n📆 Step 2: Computed nextDate`)
    console.log(`   nextDate: ${nextDate}`)

    // Step 3: Test prices endpoint
    console.log(`\n💰 Step 3: Fetch prices for nextDate`)
    console.log(`URL: ${BASE_URL}/api/atlantico/prices/${eventCode}?date=${nextDate}`)
    
    const priceUrl = `${BASE_URL}/api/atlantico/prices/${eventCode}?date=${nextDate}`
    const priceResponse = await fetchWithTimeout(priceUrl, TIMEOUT_MS)
    
    if (!priceResponse.ok) {
      console.log(`❌ Prices failed: HTTP ${priceResponse.status}`)
      return false
    }

    const priceData = await priceResponse.json()
    console.log(`✅ Prices response received`)
    console.log(`   Keys: ${Object.keys(priceData).slice(0, 10).join(', ')}`)
    
    // Check for PVPA field
    const pvpa = priceData.PVPA || priceData.pvpa
    const price = typeof pvpa === 'string' ? parseFloat(pvpa) : (typeof pvpa === 'number' ? pvpa : null)
    
    console.log(`   PVPA: ${pvpa} (parsed: ${price})`)
    
    if (price === null || isNaN(price) || price <= 0) {
      // Try other fields
      const pvpc = priceData.PVPC || priceData.pvpc
      const price2 = typeof pvpc === 'string' ? parseFloat(pvpc) : (typeof pvpc === 'number' ? pvpc : null)
      console.log(`   PVPC: ${pvpc} (parsed: ${price2})`)
      
      if (price2 !== null && !isNaN(price2) && price2 > 0) {
        console.log(`\n✅ SUCCESS: Price found (PVPC): €${price2}`)
        console.log(`   UI would display: "From €${price2}"`)
        return true
      }
      
      console.log(`❌ No valid price found in response`)
      return false
    }

    console.log(`\n✅ SUCCESS: Price found (PVPA): €${price}`)
    console.log(`   UI would display: "From €${price}"`)
    return true

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`)
    return false
  }
}

// Run test
testPricingPipeline()
  .then((success) => {
    console.log('\n' + '='.repeat(60))
    if (success) {
      console.log('✅ Pricing pipeline test PASSED')
      process.exit(0)
    } else {
      console.log('❌ Pricing pipeline test FAILED')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })























