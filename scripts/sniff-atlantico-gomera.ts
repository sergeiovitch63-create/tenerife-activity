/**
 * Sniff Atlantico API endpoints for Gomera VIP Tour availability
 * 
 * This script uses Playwright to:
 * 1. Open the Gomera VIP Tour page on atlanticoexcursiones.com
 * 2. Monitor network requests for availability/calendar endpoints
 * 3. Simulate user interactions (zone selection, date picker, time selection)
 * 4. Log all relevant API calls with their exact parameters
 */

import { chromium, type Browser, type Page, type Request } from 'playwright'
import { writeFileSync } from 'fs'
import { join } from 'path'

const TARGET_URL = 'https://www.atlanticoexcursiones.com/excursion-Gomera-VIP-Tour-Tenerife-TFS_511.html'

interface SniffedRequest {
  method: string
  url: string
  headers: Record<string, string>
  postData?: string
  postDataSize?: number
  timestamp: number
}

const sniffedRequests: SniffedRequest[] = []
const urlFrequency: Map<string, number> = new Map()

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = { ...headers }
  // Remove or redact sensitive headers
  if (sanitized.cookie) {
    sanitized.cookie = '[REDACTED]'
  }
  if (sanitized.authorization) {
    sanitized.authorization = '[REDACTED]'
  }
  return sanitized
}

async function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function setupNetworkMonitoring(page: Page): Promise<void> {
  page.on('request', (request: Request) => {
    const url = request.url()
    const resourceType = request.resourceType()
    // Capture ALL XHR/fetch requests (no keyword filter)
    if (resourceType === 'xhr' || resourceType === 'fetch') {
      const headers = request.headers()
      const postData = request.postData()
      const postDataSize = postData ? postData.length : 0

      // Track URL frequency
      urlFrequency.set(url, (urlFrequency.get(url) || 0) + 1)

      sniffedRequests.push({
        method: request.method(),
        url,
        headers: sanitizeHeaders(headers),
        postData: postData || undefined,
        postDataSize,
        timestamp: Date.now(),
      })

      console.log(`[REQUEST] ${request.method()} ${url}${postDataSize > 0 ? ` (POST ${postDataSize} bytes)` : ''}`)
    }
  })

  page.on('response', async (response) => {
    const url = response.url()
    const resourceType = response.request().resourceType()
    if (resourceType === 'xhr' || resourceType === 'fetch') {
      try {
        const contentType = response.headers()['content-type'] || ''
        if (contentType.includes('application/json')) {
          const body = await response.text()
          console.log(`[RESPONSE] ${response.status()} ${url} (${body.length} bytes)`)
          if (body.length < 2000) {
            console.log(`  Body: ${body}`)
          } else {
            console.log(`  Body (first 1000 chars): ${body.substring(0, 1000)}`)
          }
        }
      } catch (err) {
        // Ignore errors reading response
      }
    }
  })
}

async function scrollToBookingSection(page: Page): Promise<void> {
  console.log('[INTERACTION] Scrolling to booking section...')
  
  // Try to find booking/reservation section
  const bookingSelectors = [
    '[id*="reserva"]',
    '[id*="booking"]',
    '[class*="reserva"]',
    '[class*="booking"]',
    '.booking-widget',
    '.reservation-widget',
    'h2:has-text("Gestiona")',
    'h2:has-text("reserva")',
  ]

  for (const selector of bookingSelectors) {
    try {
      const element = await page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 })) {
        await element.scrollIntoViewIfNeeded()
        console.log(`[INTERACTION] Scrolled to booking section via: ${selector}`)
        await waitFor(1000)
        return
      }
    } catch (err) {
      // Continue
    }
  }

  // Fallback: scroll down progressively
  console.log('[INTERACTION] Progressive scroll down...')
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.5))
    await waitFor(500)
  }
}

async function simulateUserInteractions(page: Page): Promise<void> {
  console.log('\n[INTERACTION] Starting user simulation...')

  try {
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    await waitFor(2000)

    // Scroll to booking section
    await scrollToBookingSection(page)
    await page.waitForLoadState('networkidle', { timeout: 5000 })

    // Try to select "desde zona Sur" (South zone)
    console.log('[INTERACTION] Looking for zone selector...')
    const zoneSelectors = [
      'select[name*="zona"]',
      'select[name*="zone"]',
      'select[id*="zona"]',
      'select[id*="zone"]',
      'button:has-text("Sur")',
      'button:has-text("South")',
      '[data-zone="sur"]',
      '[data-zone="south"]',
    ]

    let zoneSelected = false
    for (const selector of zoneSelectors) {
      try {
        const element = await page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          if (selector.includes('select')) {
            // It's a select element - try to find option with Sur/South text
            const options = await element.locator('option').all()
            for (const opt of options) {
              const text = await opt.textContent()
              if (text && /Sur|South/i.test(text)) {
                await element.selectOption({ label: text.trim() })
                console.log(`[INTERACTION] Selected zone via: ${selector} (${text.trim()})`)
                break
              }
            }
          } else {
            // It's a button or other element
            await element.click()
            console.log(`[INTERACTION] Clicked zone via: ${selector}`)
          }
          zoneSelected = true
          await page.waitForLoadState('networkidle', { timeout: 5000 })
          await waitFor(1500)
          break
        }
      } catch (err) {
        // Continue to next selector
      }
    }

    if (!zoneSelected) {
      console.log('[INTERACTION] Zone selector not found, continuing...')
    }

    // Try to select language "English" if available
    console.log('[INTERACTION] Looking for language selector...')
    const langSelectors = [
      'select[name*="lang"]',
      'select[name*="idioma"]',
      'select[id*="lang"]',
      'select[id*="idioma"]',
      'button:has-text("English")',
      'a[href*="lang=en"]',
      'a[href*="lang=ENG"]',
    ]

    for (const selector of langSelectors) {
      try {
        const element = await page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          if (selector.includes('select')) {
            // Try to find option with English/ENG text
            const options = await element.locator('option').all()
            for (const opt of options) {
              const text = await opt.textContent()
              if (text && /English|ENG/i.test(text)) {
                await element.selectOption({ label: text.trim() })
                console.log(`[INTERACTION] Selected language via: ${selector} (${text.trim()})`)
                break
              }
            }
          } else {
            await element.click()
            console.log(`[INTERACTION] Clicked language via: ${selector}`)
          }
          await waitFor(2000) // Wait for page reload if language changes
          break
        }
      } catch (err) {
        // Continue
      }
    }

    // Try to click "Comprobar disponibilidad" button
    console.log('[INTERACTION] Looking for "Comprobar disponibilidad" button...')
    const checkAvailabilitySelectors = [
      'button:has-text("Comprobar disponibilidad")',
      'button:has-text("Check availability")',
      'button:has-text("disponibilidad")',
      'button:has-text("availability")',
      'a:has-text("Comprobar disponibilidad")',
      '[onclick*="dispon"]',
      '[onclick*="availability"]',
    ]

    for (const selector of checkAvailabilitySelectors) {
      try {
        const element = await page.locator(selector).first()
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click()
          console.log(`[INTERACTION] Clicked "Comprobar disponibilidad" via: ${selector}`)
          await page.waitForLoadState('networkidle', { timeout: 5000 })
          await waitFor(2000)
          break
        }
      } catch (err) {
        // Continue
      }
    }

    // Try to open date picker / "Selecione una fecha"
    console.log('[INTERACTION] Looking for date picker / "Selecione una fecha"...')
    const datePickerSelectors = [
      'input[type="date"]',
      'input[name*="date"]',
      'input[id*="date"]',
      'input[placeholder*="date"]',
      'input[placeholder*="fecha"]',
      '.datepicker',
      '[data-datepicker]',
      'button:has-text("Select date")',
      'button:has-text("Elegir fecha")',
      'button:has-text("Selecione una fecha")',
      'div:has-text("Selecione una fecha")',
      '[placeholder*="Selecione"]',
      '[placeholder*="Select"]',
      'div[onclick*="date"]',
      'div[onclick*="fecha"]',
    ]

    let datePickerOpened = false
    for (const selector of datePickerSelectors) {
      try {
        const element = await page.locator(selector).first()
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click()
          console.log(`[INTERACTION] Opened date picker via: ${selector}`)
          datePickerOpened = true
          await page.waitForLoadState('networkidle', { timeout: 5000 })
          await waitFor(1500)
          break
        }
      } catch (err) {
        // Continue
      }
    }

    if (!datePickerOpened) {
      console.log('[INTERACTION] Date picker not found, trying calendar...')
      // Try calendar buttons
      const calendarSelectors = [
        '.calendar',
        '.datepicker-calendar',
        '[role="calendar"]',
        'table.calendar',
      ]

      for (const selector of calendarSelectors) {
        try {
          const calendar = await page.locator(selector).first()
          if (await calendar.isVisible({ timeout: 1000 })) {
            console.log(`[INTERACTION] Found calendar: ${selector}`)
            // Try to click first available date
            const availableDates = await calendar.locator('td:not(.disabled), td:not(.unavailable), button:not([disabled])').all()
            if (availableDates.length > 0) {
              await availableDates[0].click()
              console.log('[INTERACTION] Clicked first available date')
              await waitFor(1500)
            }
            break
          }
        } catch (err) {
          // Continue
        }
      }
    } else {
      // If date picker opened, try to select a date
      await waitFor(1000)
      // Look for available dates in the picker
      const availableDateSelectors = [
        '.datepicker-day:not(.disabled)',
        '.calendar-day:not(.disabled)',
        'td:not(.disabled)',
        'button:not([disabled])',
      ]

      for (const selector of availableDateSelectors) {
        try {
          const dates = await page.locator(selector).all()
          if (dates.length > 0) {
            await dates[0].click()
            console.log(`[INTERACTION] Selected date via: ${selector}`)
            await page.waitForLoadState('networkidle', { timeout: 5000 })
            await waitFor(1500)
            break
          }
        } catch (err) {
          // Continue
        }
      }
    }

    // Try to open time/ hour selector
    console.log('[INTERACTION] Looking for time selector...')
    const timeSelectors = [
      'select[name*="hora"]',
      'select[name*="time"]',
      'select[id*="hora"]',
      'select[id*="time"]',
      'select[name*="ses"]',
      'select[name*="session"]',
      'button:has-text("Select time")',
      'button:has-text("Elegir hora")',
    ]

    for (const selector of timeSelectors) {
      try {
        const element = await page.locator(selector).first()
        if (await element.isVisible({ timeout: 2000 })) {
          if (selector.includes('select')) {
            // Try to select first option
            const options = await element.locator('option').all()
            if (options.length > 1) {
              // Skip first option (usually "Select...")
              await element.selectOption({ index: 1 })
              console.log(`[INTERACTION] Selected time via: ${selector}`)
            }
          } else {
            await element.click()
            console.log(`[INTERACTION] Opened time selector via: ${selector}`)
          }
          await page.waitForLoadState('networkidle', { timeout: 5000 })
          await waitFor(1500)
          break
        }
      } catch (err) {
        // Continue
      }
    }

    // Wait for any additional requests after interactions
    console.log('[INTERACTION] Final wait for network activity...')
    await page.waitForLoadState('networkidle', { timeout: 5000 })
    await waitFor(2000)
  } catch (err) {
    console.error('[INTERACTION] Error during simulation:', err)
  }
}

async function saveDebugFiles(page: Page): Promise<void> {
  try {
    // Save screenshot
    const screenshotPath = join(process.cwd(), 'debug-gomera.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`[DEBUG] Saved screenshot to: ${screenshotPath}`)

    // Try to find the booking/reservation section
    const bookingSelectors = [
      '[id*="reserva"]',
      '[id*="booking"]',
      '[class*="reserva"]',
      '[class*="booking"]',
      '.booking-widget',
      '.reservation-widget',
      'h2:has-text("Gestiona")',
      'h2:has-text("reserva")',
    ]

    let bookingHTML = ''
    for (const selector of bookingSelectors) {
      try {
        const element = await page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          bookingHTML = await element.innerHTML()
          console.log(`[DEBUG] Found booking section via: ${selector}`)
          break
        }
      } catch (err) {
        // Continue
      }
    }

    // If no specific section found, get body HTML
    if (!bookingHTML) {
      bookingHTML = await page.locator('body').innerHTML()
      console.log('[DEBUG] Using full body HTML')
    }

    const debugPath = join(process.cwd(), 'debug-gomera.html')
    writeFileSync(debugPath, bookingHTML, 'utf-8')
    console.log(`[DEBUG] Saved debug HTML to: ${debugPath}`)
  } catch (err) {
    console.error('[DEBUG] Error saving files:', err)
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting Atlantico Gomera VIP Tour API Sniffer')
  console.log(`📄 Target URL: ${TARGET_URL}\n`)

  let browser: Browser | null = null

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })

    const page = await context.newPage()

    // Setup network monitoring
    await setupNetworkMonitoring(page)

    // Navigate to page
    console.log('[NAVIGATION] Loading page...')
    await page.goto(TARGET_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    console.log('[NAVIGATION] Page loaded\n')

    // Simulate user interactions
    await simulateUserInteractions(page)

    // Wait a bit more for any delayed requests
    await page.waitForLoadState('networkidle', { timeout: 5000 })
    await waitFor(2000)

    // Save debug files (screenshot + HTML) systematically
    console.log('\n[DEBUG] Saving debug files...')
    await saveDebugFiles(page)

    // Generate TOP 20 URLs by frequency
    const urlFrequencyArray = Array.from(urlFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)

    // Print summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 SUMMARY')
    console.log('='.repeat(80))
    console.log(`Total XHR/fetch requests captured: ${sniffedRequests.length}\n`)

    if (urlFrequencyArray.length > 0) {
      console.log('🔝 TOP 20 API ENDPOINTS (by frequency):\n')
      urlFrequencyArray.forEach(([url, count], index) => {
        const requests = sniffedRequests.filter((r) => r.url === url)
        const methods = Array.from(new Set(requests.map((r) => r.method)))
        console.log(`${index + 1}. ${url} (${count}x)`)
        console.log(`   Methods: ${methods.join(', ')}`)
        const firstReq = requests[0]
        if (firstReq.postDataSize && firstReq.postDataSize > 0) {
          console.log(`   POST Data size: ${firstReq.postDataSize} bytes`)
          if (firstReq.postData) {
            console.log(`   POST Data sample: ${firstReq.postData.substring(0, 200)}`)
          }
        }
        console.log('')
      })
    }

    if (sniffedRequests.length > 0) {
      console.log('\n🔍 ALL CAPTURED REQUESTS (detailed):\n')
      sniffedRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.method} ${req.url}`)
        if (req.postData) {
          console.log(`   POST Data (${req.postDataSize} bytes): ${req.postData.substring(0, 500)}`)
        }
        console.log(`   Headers: ${JSON.stringify(req.headers, null, 2).substring(0, 300)}...`)
        console.log('')
      })
    } else {
      console.log('❌ No XHR/fetch requests captured.')
      console.log('   Check debug-gomera.html and debug-gomera.png for inspection.')
    }

    console.log('='.repeat(80))
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

