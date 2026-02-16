/**
 * Atlántico Booking Widget
 * Full booking flow: select option -> date -> quantities -> calculate total
 */

'use client'

import { useState, useEffect } from 'react'
import { TeideDeNocheVipAvailability } from '@/app/[locale]/activities/[slug]/components/TeideDeNocheVipAvailability'

/**
 * Map locale to Atlantico language code (2-letter codes only, not ENG/ESP)
 * Used for availability endpoint
 */
function mapLocaleToAvailabilityLang(locale: string): string {
  const localeMap: Record<string, string> = {
    en: 'EN',
    es: 'ES',
    fr: 'FR',
    de: 'DE',
    ru: 'RU',
    uk: 'UK',
    it: 'IT',
    pl: 'PL',
  }
  return localeMap[locale] || 'EN'
}

/**
 * Map locale to Atlántico calendar.php language code
 * Used for calendar.php endpoint (fra, eng, esp, etc.)
 */
function mapLocaleToCalendarLang(locale: string): string {
  const localeMap: Record<string, string> = {
    en: 'eng',
    es: 'esp',
    fr: 'fra',
    de: 'ger',
    ru: 'rus',
    uk: 'ukr',
    it: 'ita',
    pl: 'pol',
  }
  return localeMap[locale] || 'eng'
}

interface Event {
  id: string
  code?: string
  title?: string
  price?: {
    adult?: number | null
    child?: number | null
    infant?: number | null
  }
  raw?: any
}

interface FullTour {
  id: string
  events: Event[]
}

interface AtlanticoBookingWidgetProps {
  tour: FullTour & {
    raw?: any // Raw catalog data may contain group info
  }
  locale: string
  slug?: string // Optional slug for hardcoded mappings
}

/**
 * Result of testing a code candidate for loadLimits
 */
interface CodeTestResult {
  code: string
  source: string // 'eventCode' | 'rawCode' | 'id' | 'idExc'
  nbSessionsByDateKeys: number
  nbSessionsTotal: number
  success: boolean
  error?: string
}

/**
 * Hardcoded mapping option -> code for loadLimits
 * Will be populated after automatic test
 * Format: { eventCode: loadLimitsCode }
 */
const OPTION_CODE_MAP: Record<string, string> = {}

interface AvailabilityData {
  sessionsByDate?: Record<string, Array<{ time?: string; available?: number }>>
  raw?: any
  usedMonth?: string
  ok?: boolean
  [key: string]: any // Allow any additional fields
}

/**
 * Parse date from various formats to YYYY-MM-DD
 */
function parseDateToYYYYMMDD(dateItem: any): string | null {
  // Already a string in YYYY-MM-DD format
  if (typeof dateItem === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateItem)) {
    return dateItem
  }
  
  // Object with date/dateStr field
  if (dateItem?.date && typeof dateItem.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateItem.date)) {
    return dateItem.date
  }
  if (dateItem?.dateStr && typeof dateItem.dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateItem.dateStr)) {
    return dateItem.dateStr
  }
  
  // Object with day, month, year fields
  if (dateItem?.day && dateItem?.month && dateItem?.year) {
    const year = String(dateItem.year)
    const month = String(dateItem.month).padStart(2, '0')
    const day = String(dateItem.day).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  return null
}

/**
 * Robust function to extract available dates from availability response
 * Supports multiple response formats including dates array
 */
function getAvailableDates(availability: AvailabilityData | null): string[] {
  if (!availability) {
    return []
  }

  const dates: string[] = []
  const seen = new Set<string>()

  // PRIORITY 1: Check top-level dates array (most common in loadLimits response)
  if (Array.isArray(availability.dates)) {
    for (const dateItem of availability.dates) {
      const dateStr = parseDateToYYYYMMDD(dateItem)
      if (dateStr && !seen.has(dateStr)) {
        dates.push(dateStr)
        seen.add(dateStr)
      }
    }
  }

  // PRIORITY 2: Direct sessionsByDate
  if (availability.sessionsByDate && typeof availability.sessionsByDate === 'object') {
    for (const [dateStr, sessions] of Object.entries(availability.sessionsByDate)) {
      // Only include dates with non-empty sessions
      if (Array.isArray(sessions) && sessions.length > 0) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !seen.has(dateStr)) {
          dates.push(dateStr)
          seen.add(dateStr)
        }
      }
    }
  }

  // PRIORITY 3: Check raw.sessionsByDate or raw.avail or raw.dates
  if (availability.raw && typeof availability.raw === 'object') {
    const raw = availability.raw
    
    // Try dates array in raw
    if (Array.isArray(raw.dates)) {
      for (const dateItem of raw.dates) {
        const dateStr = parseDateToYYYYMMDD(dateItem)
        if (dateStr && !seen.has(dateStr)) {
          dates.push(dateStr)
          seen.add(dateStr)
        }
      }
    }
    
    // Try sessionsByDate in raw
    if (raw.sessionsByDate && typeof raw.sessionsByDate === 'object') {
      for (const [dateStr, sessions] of Object.entries(raw.sessionsByDate)) {
        if (Array.isArray(sessions) && sessions.length > 0) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !seen.has(dateStr)) {
            dates.push(dateStr)
            seen.add(dateStr)
          }
        }
      }
    }
    
    // Try avail object
    if (raw.avail && typeof raw.avail === 'object') {
      for (const dateStr of Object.keys(raw.avail)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !seen.has(dateStr)) {
          dates.push(dateStr)
          seen.add(dateStr)
        }
      }
    }
  }

  return dates.sort()
}

/**
 * Build reliable event label with fallbacks and duplicate detection
 */
function buildEventLabel(event: Event, index: number, allEvents: Event[]): string {
  // Priority 1: event.title
  let label = event.title
  
  // Priority 2: event.raw.name or event.raw.title
  if (!label && event.raw) {
    label = event.raw.name || event.raw.title
  }
  
  // Priority 3: Fallback to Option N
  if (!label || label.trim() === '') {
    label = `Option ${index + 1}`
    return label
  }
  
  // Check for duplicates with other events
  const otherLabels = allEvents
    .map((e, idx) => {
      const otherLabel = e.title || e.raw?.name || e.raw?.title
      return { label: otherLabel, index: idx, event: e }
    })
    .filter(item => item.label && item.label.trim() !== '')
  
  const duplicateCount = otherLabels.filter(item => item.label === label).length
  
  // If duplicate, add distinguishing suffix
  if (duplicateCount > 1) {
    // Try to use raw.name from raw data (e.g., "Persona Extra")
    if (event.raw?.name && event.raw.name !== label) {
      label = `${label} (${event.raw.name})`
    } else if (event.price?.adult && event.price.adult < 100) {
      // If price is significantly lower (e.g., 73), add "Extra person" hint
      label = `${label} (Extra person)`
    } else if (event.raw?.code) {
      // Use event code as suffix
      label = `${label} (${event.raw.code})`
    } else {
      // Last resort: add option number
      label = `${label} (Option ${index + 1})`
    }
  }
  
  return label
}

interface PriceData {
  adult?: number | null
  child?: number | null
  infant?: number | null
  raw?: any
}

/**
 * HARDCODED MAPPING for specific activities
 * Maps slug to idExc (excursion ID) for calendar.php endpoint
 * Based on Atlántico calendar.php URLs
 */
const HARDCODED_EXC_IDS: Record<string, string> = {
  'teide-de-noche-vip': '1831', // From: https://fr.atlanticoexcursiones.com/calendar.php?idExc=1831&lang=fra&afId=0
}

/**
 * Activity-specific pricing configuration
 * Used for total calculation when API doesn't provide all pricing details
 */
interface ActivityPricingConfig {
  includedPeople: number // Number of people included in base price
  basePrice: number // Base price (fallback if API doesn't provide)
  extraPersonPrice: number // Price per extra person (fallback if API doesn't provide)
}

const ACTIVITY_PRICING_CONFIG: Record<string, ActivityPricingConfig> = {
  'astronomic-tour-vip': {
    includedPeople: 4,
    basePrice: 1055,
    extraPersonPrice: 103,
  },
}

/**
 * Check if an activity is a VIP activity that uses TeideDeNocheVipAvailability calendar
 * Now uses the matching system to detect all VIP activities
 */
function isVipActivity(slug: string | undefined): boolean {
  if (!slug) return false
  // Use the VIP matching system to check if this is a VIP activity
  // For now, check common VIP patterns
  const vipPatterns = [
    'astronomic-tour-vip',
    'teide-de-noche-vip',
    'gomera-vip-tour',
    'teide-vip-tour',
    'vuelta-isla-vip',
    'tenerife-vip-tour',
    'masca-teide-vip',
    'la-laguna-anaga-vip',
  ]
  return vipPatterns.some(pattern => slug.includes(pattern) || pattern.includes(slug))
}

export function AtlanticoBookingWidget({ tour, locale, slug }: AtlanticoBookingWidgetProps) {
  const lang = mapLocaleToAvailabilityLang(locale)
  const calendarLang = mapLocaleToCalendarLang(locale)
  
  // Get idExc from hardcoded mapping
  const idExc = slug && HARDCODED_EXC_IDS[slug] ? HARDCODED_EXC_IDS[slug] : null
  
  // Check if this is astronomic-tour-vip for conditional UI rendering
  const isAstronomic = slug === 'astronomic-tour-vip'
  
  // Helper: Extract eventCode (still used for prices endpoint)
  const getEventCode = (event: Event): string => {
    return event.raw?.code || event.code || event.id
  }
  
  /**
   * Mapping option -> code for loadLimits
   * For teide-de-noche-vip: 
   * - Option 1: uses idExc (1831) or eventCode
   * - Extra person: uses eventCode or specific mapping
   * 
   * DEV logs will reveal the exact codes needed.
   * For now, we use eventCode as code for loadLimits, with idExc as fallback.
   */
  const getLoadLimitsCode = (eventCode: string | null): string => {
    if (!eventCode) return idExc || '1831'
    
    // For teide-de-noche-vip, we can use eventCode directly as loadLimits Code
    // DEV logs will confirm if this is correct or if we need a mapping
    return eventCode
  }
  
  // DEV: Log all events to find codes for loadLimits
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isVipActivity(slug) && tour.events.length > 0) {
      console.log('[BOOKING_WIDGET] All events (for code mapping):', {
        totalEvents: tour.events.length,
        events: tour.events.map((event, idx) => ({
          index: idx,
          id: event.id,
          code: event.code,
          rawCode: event.raw?.code,
          title: event.title,
          rawName: event.raw?.name,
          rawTitle: event.raw?.title,
          priceAdult: event.price?.adult,
          allKeys: Object.keys(event),
          rawKeys: event.raw ? Object.keys(event.raw) : [],
          rawObject: event.raw,
          fullEvent: JSON.stringify(event).substring(0, 500),
        })),
      })
    }
  }, [tour.events, slug])
  
  const [selectedEventCode, setSelectedEventCode] = useState<string | null>(
    tour.events.length > 0 ? getEventCode(tour.events[0]) : null
  )
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  
  // Price from sessionsByDate (priority source for teide-de-noche-vip)
  const [sessionPrice, setSessionPrice] = useState<number | null>(null)
  const [sessionCurrency, setSessionCurrency] = useState<string>('EUR')
  
  // Pricing debug state (visible in UI)
  const [pricingDebug, setPricingDebug] = useState<{
    selectedEventCode: string | null
    selectedDate: string | null
    adults: number
    fetchUrl: string | null
    status: 'idle' | 'loading' | 'success' | 'error'
    responseTime: number | null
    rawResponse: string | null
    priceCandidates: number[]
    finalPriceSelected: number | null
  }>({
    selectedEventCode: null,
    selectedDate: null,
    adults: 1,
    fetchUrl: null,
    status: 'idle',
    responseTime: null,
    rawResponse: null,
    priceCandidates: [],
    finalPriceSelected: null,
  })
  
  // Helper function to extract price from any payload format (string or JSON)
  // PRIORITY: PVPA > PVP > other PVP* > string "ADULT|..." > other fields
  const extractPriceFromAny = (payload: any): { price: number | null; candidates: number[]; pvpaRaw?: string; pvpaParsed?: number } => {
    const candidates: number[] = []
    let pvpaRaw: string | undefined
    let pvpaParsed: number | undefined
    
    // If payload is an object/JSON, check for PVPA first (ABSOLUTE PRIORITY)
    if (payload && typeof payload === 'object') {
      // Priority 1: PVPA (Price per Adult)
      if (payload.PVPA !== undefined && payload.PVPA !== null) {
        pvpaRaw = String(payload.PVPA)
        const parsed = parseFloat(pvpaRaw)
        if (!isNaN(parsed) && parsed > 0) {
          pvpaParsed = parsed
          candidates.push(parsed)
          return { price: parsed, candidates, pvpaRaw, pvpaParsed }
        }
      }
      
      // Priority 2: PVP (fallback if no PVPA)
      if (payload.PVP !== undefined && payload.PVP !== null) {
        const pvpValue = String(payload.PVP)
        const parsed = parseFloat(pvpValue)
        if (!isNaN(parsed) && parsed > 0) {
          candidates.push(parsed)
          if (candidates.length === 1) {
            // Only return if we don't have PVPA
            return { price: parsed, candidates, pvpaRaw, pvpaParsed }
          }
        }
      }
      
      // Priority 3: Other PVP* fields (PVPC, PVPI, etc.)
      for (const key of Object.keys(payload)) {
        if (key.startsWith('PVP') && key !== 'PVPA' && key !== 'PVP') {
          const value = payload[key]
          if (value !== undefined && value !== null) {
            const parsed = parseFloat(String(value))
            if (!isNaN(parsed) && parsed > 0) {
              candidates.push(parsed)
            }
          }
        }
      }
      
      // Priority 4: Common price fields (adult, price, precio, etc.)
      const priceFields = ['adult', 'price', 'precio', 'bruto', 'quote', 'priceAdult', 'price_adult']
      for (const field of priceFields) {
        const value = payload[field]
        if (value !== undefined && value !== null) {
          const parsed = typeof value === 'number' ? value : parseFloat(String(value))
          if (!isNaN(parsed) && parsed > 0) {
            candidates.push(parsed)
          }
        }
      }
    }
    
    // If payload is a string containing '|' => parse as "ADULT|CHILD|INFANT|..."
    if (typeof payload === 'string' && payload.includes('|')) {
      const parts = payload.split('|')
      if (parts.length > 0 && parts[0]) {
        const adultPrice = parseFloat(parts[0])
        if (!isNaN(adultPrice) && adultPrice > 0) {
          candidates.push(adultPrice)
          // Only return if we don't have PVPA
          if (candidates.length === 1) {
            return { price: adultPrice, candidates, pvpaRaw, pvpaParsed }
          }
        }
      }
    }
    
    // If payload is a string (number), parse it directly
    if (typeof payload === 'string') {
      const parsed = parseFloat(payload)
      if (!isNaN(parsed) && parsed > 0) {
        candidates.push(parsed)
        // Only return if we don't have PVPA
        if (candidates.length === 1) {
          return { price: parsed, candidates, pvpaRaw, pvpaParsed }
        }
      }
    }
    
    // If payload is a number
    if (typeof payload === 'number' && payload > 0) {
      candidates.push(payload)
      // Only return if we don't have PVPA
      if (candidates.length === 1) {
        return { price: payload, candidates, pvpaRaw, pvpaParsed }
      }
    }
    
    // Return first candidate if we found any (no heuristics, no filtering)
    if (candidates.length > 0) {
      return { price: candidates[0], candidates, pvpaRaw, pvpaParsed }
    }
    
    return { price: null, candidates: [], pvpaRaw, pvpaParsed }
  }
  
  // Cache for availability by eventCode+month
  const [availabilityCache, setAvailabilityCache] = useState<Map<string, any>>(new Map())
  // Single source of truth for passenger counts
  const [pax, setPax] = useState({ adults: 1, children: 0, infants: 0 })
  
  // Data state
  const [availability, setAvailability] = useState<AvailabilityData | null>(null)
  const [prices, setPrices] = useState<PriceData | null>(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [errorAvailability, setErrorAvailability] = useState<string | null>(null)
  const [errorPrices, setErrorPrices] = useState<string | null>(null)
  
  // Booking form state (for payment)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [isBooking, setIsBooking] = useState(false)
  const [bookingReference, setBookingReference] = useState<string | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)
  
  
  // Payment debug state (visible in UI)
  const [paymentDebug, setPaymentDebug] = useState<{
    endpoint: string | null
    payload: Record<string, any> | null
    contentType: string | null
    status: number | null
    headers: Record<string, string> | null
    body: string | null
    error: string | null
  } | null>(null)
  
  // Extract t_group (tour id) from tour/events
  // For teide-de-noche-vip, we need to find it from catalog/group payloads
  const getTGroup = (): string => {
    // Priority 1: Try to get from tour.raw (catalog response may contain group info)
    if (tour.raw) {
      const groupId = tour.raw.group || tour.raw.groupCode || tour.raw.groupId || tour.raw.group_id
      if (groupId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[BOOKING] t_group from tour.raw:', groupId)
        }
        return String(groupId)
      }
    }
    
    // Priority 2: Try to get from first event's raw data
    if (tour.events.length > 0 && tour.events[0].raw) {
      const groupId = tour.events[0].raw.group || tour.events[0].raw.groupCode || tour.events[0].raw.groupId
      if (groupId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[BOOKING] t_group from event.raw:', groupId)
        }
        return String(groupId)
      }
    }
    
    // Priority 3: Try tour.id if it looks like a group ID (numeric)
    if (tour.id && /^\d+$/.test(tour.id)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[BOOKING] t_group from tour.id:', tour.id)
      }
      return tour.id
    }
    
    // Fallback: Default group ID for VIP tours (from atlantico-repo.md)
    const fallback = process.env.ATLANTICO_DEFAULT_GROUP_ID || '31'
    if (process.env.NODE_ENV === 'development') {
      console.warn('[BOOKING] t_group not found, using fallback:', fallback)
    }
    return fallback
  }
  
  // Get userId (user id) - placeholder DEV if not in config
  // Note: process.env is not available client-side, so we use a placeholder
  // In production, this should be set via API route or server-side config
  const getUserId = (): string => {
    // Placeholder DEV (should be configured server-side via API route)
    // The API route /api/atlantico/payment can override this if needed
    return '0' // Placeholder DEV - TODO: configure via server-side API route
  }

  // Available dates from normalized response (priority: data.dates, fallback: getAvailableDates)
  const availableDates = availability?.dates && Array.isArray(availability.dates) && availability.dates.length > 0
    ? availability.dates
    : getAvailableDates(availability)
  
  // Calendar state (must be declared before useEffects that use it)
  const today = new Date()
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [displayMonth, setDisplayMonth] = useState(currentMonth)
  
  // Accordion states
  const [isDateAccordionOpen, setIsDateAccordionOpen] = useState(false)
  const [isQuantityAccordionOpen, setIsQuantityAccordionOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')

  // Astronomic Tour VIP pricing states
  const [vipPrice, setVipPrice] = useState<number | null>(null)
  const [extraPrice, setExtraPrice] = useState<number | null>(null)
  const [loadingVipPrice, setLoadingVipPrice] = useState(false)
  const [loadingExtraPrice, setLoadingExtraPrice] = useState(false)

  // Debug state for DEV
  const [debugInfo, setDebugInfo] = useState<{
    slug: string | null
    idExc: string | null
    langUsed: string | null
    nbDates: number
    first5Dates: string[]
    fetchUrl: string | null
    availabilityStatus: 'ok' | 'error' | 'loading' | null
    errorMessage: string | null
  }>({
    slug: null,
    idExc: null,
    langUsed: null,
    nbDates: 0,
    first5Dates: [],
    fetchUrl: null,
    availabilityStatus: null,
    errorMessage: null,
  })

  // Helper function to fetch dates from limits endpoint for a single month
  const fetchLoadLimitsForMonth = async (monthStart: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    if (!idExc) {
      return { success: false, error: 'No idExc available for this activity' }
    }

    // Check cache
    const cacheKey = `limits:${idExc}:${calendarLang}:${monthStart}`
    if (availabilityCache.has(cacheKey)) {
      const cached = availabilityCache.get(cacheKey)
      if (process.env.NODE_ENV === 'development') {
        console.log('[BOOKING_WIDGET] Using cached limits:', { cacheKey, nbDates: cached?.availableDates?.length || 0 })
      }
      return { success: true, data: cached }
    }

    const fetchUrl = `/api/atlantico/limits?eventId=${encodeURIComponent(idExc)}&lang=${encodeURIComponent(calendarLang)}&month=${encodeURIComponent(monthStart)}`
    
    // DEV log
    if (process.env.NODE_ENV === 'development') {
      console.log('[BOOKING_WIDGET] Fetching limits:', {
        idExc,
        lang: calendarLang,
        month: monthStart,
        url: fetchUrl,
      })
    }

    try {
      const response = await fetch(fetchUrl)
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText.substring(0, 100)}` : ''}`)
      }

      const data = await response.json()
      
      // DEV log response structure
      if (process.env.NODE_ENV === 'development') {
        console.log('[BOOKING_WIDGET] limits response:', {
          idExc,
          lang: calendarLang,
          monthStart: data.monthStart,
          nbDates: data.availableDates?.length || 0,
          ok: data.ok,
          sampleDates: data.availableDates?.slice(0, 5) || [],
        })
      }
      
      if (data.ok === false) {
        throw new Error(data.message || data.error || 'Failed to fetch limits')
      }

      // Transform response to match expected format (sessionsByDate instead of sessionsByDay)
      const transformedData = {
        ok: true,
        idExc,
        lang: calendarLang,
        dateUsed: monthStart,
        dates: data.availableDates || [],
        sessionsByDate: data.sessionsByDay || {},
        raw: data,
      }

      // Cache the result
      setAvailabilityCache((prev) => {
        const next = new Map(prev)
        next.set(cacheKey, transformedData)
        return next
      })

      return { success: true, data: transformedData }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load limits'
      if (process.env.NODE_ENV === 'development') {
        console.error('[BOOKING_WIDGET] limits fetch error:', {
          idExc,
          lang: calendarLang,
          monthStart,
          error: errorMsg,
        })
      }
      return { success: false, error: errorMsg }
    }
  }

  // Helper function to fetch dates from loadLimits endpoint for 12 months (sliding window)
  const fetchLoadLimitsDates = async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    if (!idExc) {
      return { success: false, error: 'No idExc available for this activity' }
    }

    // Generate 12 months starting from current month
    const now = new Date()
    const months: string[] = []
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthStart = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`
      months.push(monthStart)
    }

    // Fetch all months in parallel (with concurrency limit)
    const results = await Promise.all(months.map(monthStart => fetchLoadLimitsForMonth(monthStart)))

    // Merge all dates from all months
    const allDates: string[] = []
    const allSessionsByDate: Record<string, Array<{ time?: string; available?: number }>> = {}
    const seenDates = new Set<string>()

    for (const result of results) {
      if (result.success && result.data) {
        const dates = result.data.dates && Array.isArray(result.data.dates) ? result.data.dates : []
        const sessionsByDate = result.data.sessionsByDate || {}

        // Add dates (deduplicate)
        for (const date of dates) {
          if (date && !seenDates.has(date)) {
            allDates.push(date)
            seenDates.add(date)
          }
        }

        // Merge sessionsByDate
        for (const [date, sessions] of Object.entries(sessionsByDate)) {
          if (Array.isArray(sessions)) {
            allSessionsByDate[date] = sessions
          }
        }
      }
    }

    // Sort dates
    allDates.sort()

    // Build merged response
    const mergedData = {
      ok: true,
      idExc,
      lang: calendarLang,
      dateUsed: months[0], // First month used
      dates: allDates,
      sessionsByDate: allSessionsByDate,
      raw: results.map(r => r.data).filter(Boolean), // Keep raw data for debugging
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[BOOKING_WIDGET] Merged 12 months loadLimits:', {
        idExc,
        lang: calendarLang,
        monthsFetched: months.length,
        totalDates: allDates.length,
        totalSessions: Object.keys(allSessionsByDate).length,
      })
    }

    return { success: true, data: mergedData }
  }

  // Fetch dates from loadLimits when idExc is available
  useEffect(() => {
    if (!idExc) {
      setAvailability(null)
      setSelectedDate(null)
      setPrices(null)
      setPax({ adults: 1, children: 0, infants: 0 })
      setIsDateAccordionOpen(false)
      setIsQuantityAccordionOpen(false)
      setDebugInfo({
        slug: null,
        idExc: null,
        langUsed: null,
        nbDates: 0,
        first5Dates: [],
        fetchUrl: null,
        availabilityStatus: null,
        errorMessage: null,
      })
      return
    }

    const fetchLimits = async () => {
      setLoadingAvailability(true)
      setErrorAvailability(null)
      setSelectedDate(null)
      setPrices(null)

      const result = await fetchLoadLimitsDates()

      if (result.success && result.data) {
        setAvailability(result.data)
        const dates = result.data.dates && Array.isArray(result.data.dates) ? result.data.dates : []
        
        // Update debug info
        const now = new Date()
        const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const fetchUrl = `/api/atlantico/loadLimits/${idExc}/${calendarLang}?date=${firstDayOfMonth}`
        setDebugInfo({
          slug: slug || null,
          idExc,
          langUsed: calendarLang,
          nbDates: dates.length,
          first5Dates: dates.slice(0, 5),
          fetchUrl,
          availabilityStatus: 'ok',
          errorMessage: null,
        })
        
        // DEV: Log loadLimits fetch for VIP activities
        if (process.env.NODE_ENV === 'development' && isVipActivity(slug)) {
          console.log('[BOOKING_WIDGET] loadLimits fetched:', {
            slug,
            idExc,
            lang: calendarLang,
            fetchUrl,
            nbDates: dates.length,
            first5Dates: dates.slice(0, 5),
          })
        }

        // Set first available date as default and open date accordion (prices will be fetched via useEffect)
        if (dates.length > 0) {
          setSelectedDate(dates[0])
          setIsDateAccordionOpen(true)
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('[BOOKING_WIDGET] No dates found in loadLimits response')
        }
      } else {
        setErrorAvailability(result?.error || 'Failed to load limits')
        setAvailability(null)
        
        // Update debug info
        const now = new Date()
        const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        setDebugInfo({
          slug: slug || null,
          idExc,
          langUsed: calendarLang,
          nbDates: 0,
          first5Dates: [],
          fetchUrl: `/api/atlantico/loadLimits/${idExc}/${calendarLang}?date=${firstDayOfMonth}`,
          availabilityStatus: 'error',
          errorMessage: result?.error || null,
        })
      }

      setLoadingAvailability(false)
    }

    fetchLimits()
  }, [idExc, calendarLang, slug])

  // Note: Calendar.php returns all dates at once, no need to fetch per month
  // Month navigation is just UI filtering of already-loaded dates

  // Fetch prices from loadPrices endpoint (fallback if sessionPrice not available)
  useEffect(() => {
    if (!selectedEventCode || !selectedDate) {
      setPrices(null)
      setPricingDebug(prev => ({
        ...prev,
        selectedEventCode: selectedEventCode,
        selectedDate: selectedDate,
        status: 'idle',
        fetchUrl: null,
        rawResponse: null,
        priceCandidates: [],
        finalPriceSelected: null,
      }))
      return
    }

    const fetchPrices = async () => {
      const startTime = Date.now()
      setLoadingPrices(true)
      setErrorPrices(null)
      
      const fetchUrl = `/api/atlantico/prices/${selectedEventCode}?date=${selectedDate}`
      
      // Update debug state
      setPricingDebug(prev => ({
        ...prev,
        selectedEventCode: selectedEventCode,
        selectedDate: selectedDate,
        adults: pax.adults,
        fetchUrl: fetchUrl,
        status: 'loading',
        responseTime: null,
        rawResponse: null,
        priceCandidates: [],
        finalPriceSelected: null,
      }))

      try {
        const response = await fetch(fetchUrl)
        const responseTime = Date.now() - startTime
        
        const rawData = await response.json()
        const rawResponseStr = JSON.stringify(rawData).substring(0, 500)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        // Use extractPriceFromAny to parse any format (priority: PVPA)
        const { price: extractedPrice, candidates, pvpaRaw, pvpaParsed } = extractPriceFromAny(rawData)
        
        // Extract prices from response (fallback to structured fields)
        const priceData: PriceData = {
          adult: extractedPrice ?? (typeof rawData === 'object' ? (rawData.adult ?? rawData.priceAdult ?? rawData.price?.adult ?? null) : null),
          child: typeof rawData === 'object' ? (rawData.child ?? rawData.priceChild ?? rawData.price?.child ?? null) : null,
          infant: typeof rawData === 'object' ? (rawData.infant ?? rawData.priceInfant ?? rawData.price?.infant ?? null) : null,
          raw: rawData,
        }
        
        // If we extracted a price but priceData.adult is null, set it
        if (extractedPrice !== null && priceData.adult === null) {
          priceData.adult = extractedPrice
        }
        
        setPrices(priceData)
        
        // Update debug state with results (include PVPA info)
        setPricingDebug(prev => ({
          ...prev,
          status: 'success',
          responseTime,
          rawResponse: rawResponseStr + (pvpaRaw ? `\nPVPA raw: ${pvpaRaw}` : '') + (pvpaParsed ? `\nPVPA parsed: ${pvpaParsed}` : ''),
          priceCandidates: candidates,
          finalPriceSelected: priceData.adult ?? extractedPrice ?? null,
        }))
        
        // DEV: Log prices fetch for VIP activities
        if (process.env.NODE_ENV === 'development' && isVipActivity(slug)) {
          console.log('[BOOKING_WIDGET] Prices fetched:', {
            slug,
            selectedEventCode,
            selectedDate,
            fetchUrl,
            pvpaRaw,
            pvpaParsed,
            priceCandidates: candidates,
            finalPriceSelected: priceData.adult ?? extractedPrice ?? null,
            responseTime: `${responseTime}ms`,
          })
          // Additional log for astronomic-tour-vip
          if (slug === 'astronomic-tour-vip') {
            console.log('[ASTRO_PRICE] prices url + raw PVPA + final price:', {
              url: fetchUrl,
              pvpaRaw,
              pvpaParsed,
              finalPrice: priceData.adult ?? extractedPrice ?? null,
            })
          }
        }
      } catch (err) {
        const responseTime = Date.now() - startTime
        const errorMsg = err instanceof Error ? err.message : 'Failed to load prices'
        setErrorPrices(errorMsg)
        setPrices(null)
        
        // Update debug state with error
        setPricingDebug(prev => ({
          ...prev,
          status: 'error',
          responseTime,
          rawResponse: errorMsg,
          priceCandidates: [],
          finalPriceSelected: null,
        }))
      } finally {
        setLoadingPrices(false)
      }
    }

    // Always fetch prices if we have date + eventCode (for day-based activity)
    // sessionPrice is optional (may come from sessionsByDate)
    fetchPrices()
  }, [selectedDate, selectedEventCode, idExc, pax.adults])

  // Calculate total: priority sessionPrice from sessionsByDate, fallback to prices from loadPrices
  const pricePerPerson = sessionPrice !== null ? sessionPrice : (prices?.adult ?? null)
  const total = pricePerPerson !== null
    ? (pax.adults * pricePerPerson) +
      (pax.children * (prices?.child || 0)) +
      (pax.infants * (prices?.infant || 0))
    : 0

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    if (!email || email.trim() === '') return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  // Check if booking is valid (day-based activity: no session required)
  // Price is optional but recommended
  const missingRequirements: string[] = []
  if (!selectedEventCode) missingRequirements.push('Select an option')
  if (!selectedDate) missingRequirements.push('Select a date')
  if (pax.adults < 1) missingRequirements.push('At least 1 adult required')
  if (!customerName || customerName.trim() === '') missingRequirements.push('Name is required')
  if (!customerEmail || customerEmail.trim() === '') missingRequirements.push('Email is required')
  else if (!isValidEmail(customerEmail)) missingRequirements.push('Valid email is required (e.g., your@email.com)')
  if (!customerPhone || customerPhone.trim() === '') missingRequirements.push('Phone is required')
  
  const hasPrice = pricePerPerson !== null && pricePerPerson > 0
  const canBook = missingRequirements.length === 0

  // All three counters are always visible (Adults, Children, Infants)

  // Open quantity accordion when date is selected and prices are loaded
  useEffect(() => {
    if (selectedDate && prices && prices.adult !== null) {
      setIsQuantityAccordionOpen(true)
    }
  }, [selectedDate, prices])

  // Helper: Identify VIP and Extra person options for astronomic-tour-vip
  const identifyAstronomicOptions = () => {
    if (slug !== 'astronomic-tour-vip') return { vipEvent: null, extraEvent: null, vipEventCode: null, extraEventCode: null }
    
    let vipEvent: Event | null = null
    let extraEvent: Event | null = null
    
    for (const event of tour.events) {
      const eventCode = getEventCode(event)
      const label = buildEventLabel(event, tour.events.indexOf(event), tour.events).toLowerCase()
      
      // Identify VIP option: usually has "VIP" or "Private" in label, or has higher price
      if (label.includes('vip') || label.includes('private')) {
        vipEvent = event
      }
      // Identify Extra person: has "extra" in label or significantly lower price (< 100)
      else if (label.includes('extra') || (event.price?.adult && event.price.adult < 100)) {
        extraEvent = event
      }
    }
    
    // Fallback: if no VIP found, use first event with higher price as VIP
    if (!vipEvent && tour.events.length > 0) {
      const sortedByPrice = [...tour.events].sort((a, b) => {
        const priceA = a.price?.adult || 0
        const priceB = b.price?.adult || 0
        return priceB - priceA
      })
      vipEvent = sortedByPrice[0]
    }
    
    // Fallback: if no Extra found, use second event as Extra
    if (!extraEvent && tour.events.length > 1 && vipEvent) {
      extraEvent = tour.events.find(e => e.id !== vipEvent!.id) || null
    }
    
    return {
      vipEvent,
      extraEvent,
      vipEventCode: vipEvent ? getEventCode(vipEvent) : null,
      extraEventCode: extraEvent ? getEventCode(extraEvent) : null,
    }
  }

  // Fetch VIP and Extra person prices for astronomic-tour-vip
  useEffect(() => {
    if (slug !== 'astronomic-tour-vip' || !selectedDate) {
      setVipPrice(null)
      setExtraPrice(null)
      return
    }

    const { vipEventCode, extraEventCode } = identifyAstronomicOptions()
    
    if (!vipEventCode) {
      setVipPrice(null)
      setExtraPrice(null)
      return
    }

    // Fetch VIP price
    const fetchVipPrice = async () => {
      setLoadingVipPrice(true)
      try {
        const fetchUrl = `/api/atlantico/prices/${vipEventCode}?date=${selectedDate}`
        const response = await fetch(fetchUrl)
        if (response.ok) {
          const rawData = await response.json()
          const { price: extractedPrice } = extractPriceFromAny(rawData)
          const vipPriceValue = extractedPrice ?? (typeof rawData === 'object' ? (rawData.adult ?? rawData.priceAdult ?? rawData.price?.adult ?? null) : null)
          setVipPrice(vipPriceValue !== null && vipPriceValue > 0 ? parseFloat(String(vipPriceValue)) : null)
        } else {
          setVipPrice(null)
        }
      } catch (err) {
        setVipPrice(null)
      } finally {
        setLoadingVipPrice(false)
      }
    }

    // Fetch Extra person price (if extraEventCode exists)
    const fetchExtraPrice = async () => {
      if (!extraEventCode) {
        setExtraPrice(null)
        return
      }
      setLoadingExtraPrice(true)
      try {
        const fetchUrl = `/api/atlantico/prices/${extraEventCode}?date=${selectedDate}`
        const response = await fetch(fetchUrl)
        if (response.ok) {
          const rawData = await response.json()
          const { price: extractedPrice } = extractPriceFromAny(rawData)
          const extraPriceValue = extractedPrice ?? (typeof rawData === 'object' ? (rawData.adult ?? rawData.priceAdult ?? rawData.price?.adult ?? null) : null)
          setExtraPrice(extraPriceValue !== null && extraPriceValue > 0 ? parseFloat(String(extraPriceValue)) : null)
        } else {
          setExtraPrice(null)
        }
      } catch (err) {
        setExtraPrice(null)
      } finally {
        setLoadingExtraPrice(false)
      }
    }

    fetchVipPrice()
    fetchExtraPrice()
  }, [selectedDate, selectedEventCode, selectedLanguage, slug, tour.events])

  // Compute total price for VIP activities
  const computeTotalPrice = (): number | null => {
    if (!selectedDate || !selectedEventCode || !pricePerPerson) {
      return null
    }

    // For astronomic-tour-vip, use special logic
    if (slug === 'astronomic-tour-vip') {
      const pricingConfig = ACTIVITY_PRICING_CONFIG[slug]
      if (!pricingConfig) {
        return null
      }

      const { vipEventCode, extraEventCode } = identifyAstronomicOptions()
      
      // Case A: VIP Private Tour option selected (includes 4 people)
      if (selectedEventCode === vipEventCode) {
        // VIP option is fixed price for 4 people
        const selectedOptionPrice = prices?.adult ?? null
        const basePrice = selectedOptionPrice ?? vipPrice ?? pricingConfig.basePrice
        
        if (basePrice === null) {
          return null
        }
        
        return basePrice
      }
      
      // Case B: Extra person option selected
      if (selectedEventCode === extraEventCode) {
        // Extra person option is PER EXTRA PERSON price (linear: qty * unitPrice)
        const selectedOptionPrice = prices?.adult ?? null
        const unitPrice = selectedOptionPrice ?? extraPrice ?? pricingConfig.extraPersonPrice
        
        if (unitPrice === null) {
          return null
        }
        
        // Total = unit price * number of extra people (linear calculation)
        return pax.adults * unitPrice
      }
    }
    
    // For all other VIP activities: simple linear calculation
    // Total = (adult price * pax.adults) + (child price * pax.children) + (infant price * pax.infants)
    const adultTotal = pricePerPerson * pax.adults
    const childTotal = (prices?.child || 0) * pax.children
    const infantTotal = (prices?.infant || 0) * pax.infants
    
    return adultTotal + childTotal + infantTotal
  }

  const totalPrice = computeTotalPrice()

  // Get sessions for selected date
  const sessionsForDate = selectedDate && availability?.sessionsByDate
    ? availability.sessionsByDate[selectedDate] || []
    : []

  // Auto-select first available time when date is selected
  useEffect(() => {
    if (selectedDate && sessionsForDate.length > 0) {
      // Get unique valid times: non-empty, != "00:00", sorted
      const validTimes = Array.from(new Set(
        sessionsForDate
          .map((s: any) => s.time)
          .filter((t: string) => t && t !== '' && t !== '00:00' && t !== '-')
      )).sort()

      if (validTimes.length > 0) {
        // Select earliest time
        const earliestTime = validTimes[0]
        if (selectedTime !== earliestTime) {
          setSelectedTime(earliestTime)
        }
      } else {
        // No valid times found - clear selection
        setSelectedTime('')
      }
    } else {
      // No date selected or no sessions - clear selection
      setSelectedTime('')
    }
  }, [selectedDate, sessionsForDate])

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const isDateAvailable = (dateStr: string) => {
    return availableDates.includes(dateStr)
  }

  // Filter dates for current displayed month
  const getDatesForDisplayMonth = (): string[] => {
    const year = displayMonth.getFullYear()
    const month = displayMonth.getMonth() + 1
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
    return availableDates.filter(date => date.startsWith(monthPrefix))
  }

  const formatDateForCalendar = (date: Date) => {
    return date.toISOString().substring(0, 10)
  }

  const getCalendarDays = () => {
    const year = displayMonth.getFullYear()
    const month = displayMonth.getMonth()
    const daysInMonth = getDaysInMonth(displayMonth)
    const firstDay = new Date(year, month, 1).getDay()
    
    const days: Array<{ date: Date | null; dateStr: string | null; isAvailable: boolean }> = []
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, dateStr: null, isAvailable: false })
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = formatDateForCalendar(date)
      days.push({
        date,
        dateStr,
        isAvailable: isDateAvailable(dateStr),
      })
    }
    
    return days
  }

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
  ];

  return (
    <div className="lg:sticky lg:top-8">
      <div className="bg-white border border-glass-200 rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-bold text-glass-900 mb-6">Manage your booking</h3>


        {/* Select Option */}
        {tour.events.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-glass-700 mb-3">
              Select Option
            </label>
            <div className="space-y-2">
              {tour.events.map((event, idx) => {
                const eventCode = getEventCode(event)
                const eventLabel = buildEventLabel(event, idx, tour.events)
                const isSelected = selectedEventCode === eventCode
                
                // Get price for this option
                // Priority 1: If date selected and this is the selected event, use prices from API
                // Priority 2: Use price from Prices table (event.price?.adult)
                let optionPrice: number | null = null
                
                if (selectedDate && isSelected && prices?.adult !== null && prices?.adult !== undefined && prices.adult > 0) {
                  // Date selected + this option selected = use API price
                  optionPrice = prices.adult
                } else if (event.price?.adult !== null && event.price?.adult !== undefined && event.price.adult > 0) {
                  // Fallback to Prices table (no "From" prefix for VIP activities)
                  optionPrice = event.price.adult
                }
                
                // Format price label (always use parseFloat to preserve decimals, format to 2 decimals)
                const priceValue = optionPrice !== null ? parseFloat(String(optionPrice)) : null
                const priceLabel = priceValue !== null ? ` — €${priceValue.toFixed(2)}` : ''
                const fullLabel = `${eventLabel}${priceLabel}`
                
                // Handle option change
                const handleOptionChange = () => {
                  setSelectedEventCode(eventCode)
                  // Reset date when option changes (will trigger refetch in TeideDeNocheVipAvailability)
                  setSelectedDate(null)
                }
                
                const radioId = `event-option-${eventCode || event.id || idx}`

                return (
                  <label
                    key={eventCode || event.id || idx}
                    htmlFor={radioId}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-ocean-600 bg-ocean-50'
                        : 'border-glass-200 hover:border-ocean-300'
                    }`}
                  >
                    <input
                      type="radio"
                      id={radioId}
                      name="event-option"
                      value={eventCode}
                      checked={isSelected}
                      onChange={handleOptionChange}
                      className="mt-1 mr-3 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-glass-900">{fullLabel}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Client Language */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-glass-700 mb-2">
            Client Language
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Select Date - Accordion */}
        {/* For VIP activities: show if selectedEventCode exists, for others: show if idExc exists */}
        {((isVipActivity(slug) && selectedEventCode) || (!isVipActivity(slug) && idExc)) && (
          <div className="mb-6 border-b border-glass-200 pb-4">
            <button
              onClick={() => setIsDateAccordionOpen(!isDateAccordionOpen)}
              className="w-full flex items-center justify-between text-left py-2 hover:text-ocean-600 transition-colors"
            >
              <h3 className="text-lg font-semibold text-glass-900">Select a date</h3>
              <span
                className={`text-glass-500 text-xl transition-transform duration-200 ${
                  isDateAccordionOpen ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>
            {isDateAccordionOpen && (
              <div className="mt-4">
                {/* Use TeideDeNocheVipAvailability for VIP activities, otherwise use small calendar */}
                {isVipActivity(slug) ? (
                  <>
                    {selectedEventCode && (() => {
                      // DEV: Log mount and selectedEventCode for astronomic-tour-vip
                      if (process.env.NODE_ENV === 'development' && slug === 'astronomic-tour-vip') {
                        console.log('[ASTRO_CAL] mount + selectedEventCode:', {
                          slug,
                          selectedEventCode,
                          loadLimitsCode: getLoadLimitsCode(selectedEventCode),
                          calendarLang,
                        })
                      }
                      return (
                        <TeideDeNocheVipAvailability 
                        code={getLoadLimitsCode(selectedEventCode)} 
                        lang={calendarLang}
                        onDateSelect={(date, slots) => {
                          setSelectedDate(date)
                          // DEV: Log date selected for astronomic-tour-vip
                          if (process.env.NODE_ENV === 'development' && slug === 'astronomic-tour-vip') {
                            console.log('[ASTRO_CAL] date selected:', {
                              slug,
                              date,
                              selectedEventCode,
                              nbSlots: slots.length,
                            })
                          }
                          // Price will be extracted from slots or fallback to prices endpoint
                        }}
                        onPriceChange={(date, sessionTime, price, currency) => {
                          // sessionTime is always null for day-based activity
                          if (price !== null && price > 0) {
                            setSessionPrice(price)
                            setSessionCurrency(currency)
                            // Update pricing debug
                            setPricingDebug(prev => ({
                              ...prev,
                              finalPriceSelected: price,
                              priceCandidates: [price],
                            }))
                          } else {
                            // Fallback: try loadPrices endpoint
                            setSessionPrice(null)
                          }
                        }}
                        />
                      )
                    })()}
                    {!selectedEventCode && (
                      <div className="text-sm text-glass-500 py-4 text-center">
                        Please select an option first
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {loadingAvailability && (
                      <div className="text-sm text-glass-500 py-4 text-center">Loading availability...</div>
                    )}
                    
                    {errorAvailability && (
                      <div className="text-sm text-red-600 py-4 text-center">{errorAvailability}</div>
                    )}
                    
                    {!loadingAvailability && !errorAvailability && availableDates.length === 0 && (
                      <div className="text-sm text-glass-500 py-4 text-center space-y-2">
                        <div>No availability for next 6 months</div>
                        {process.env.NODE_ENV === 'development' && availability && (
                          <div className="text-xs text-glass-400 mt-2 p-2 bg-glass-50 rounded font-mono break-all">
                            Response dump: {JSON.stringify(availability).substring(0, 300)}...
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!loadingAvailability && !errorAvailability && availableDates.length > 0 && (
                      <>
                        {/* Month Navigation */}
                        <div className="flex items-center justify-between mb-3">
                          <button
                            onClick={() => {
                              const prevMonth = new Date(displayMonth)
                              prevMonth.setMonth(prevMonth.getMonth() - 1)
                              setDisplayMonth(prevMonth)
                            }}
                            className="px-3 py-1 text-glass-600 hover:text-glass-900"
                          >
                            ‹
                          </button>
                          <div className="font-medium text-glass-900">
                            {displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </div>
                          <button
                            onClick={() => {
                              const nextMonth = new Date(displayMonth)
                              nextMonth.setMonth(nextMonth.getMonth() + 1)
                              setDisplayMonth(nextMonth)
                            }}
                            className="px-3 py-1 text-glass-600 hover:text-glass-900"
                          >
                            ›
                          </button>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="text-xs text-center text-glass-500 font-medium py-1">
                              {day}
                            </div>
                          ))}
                          {getCalendarDays().map((day, idx) => {
                            if (!day.date) {
                              return <div key={idx} className="aspect-square" />
                            }
                            
                            const isSelected = selectedDate === day.dateStr
                            const isToday = day.dateStr === formatDateForCalendar(new Date())
                            const isPast = day.date && day.date < new Date(new Date().setHours(0, 0, 0, 0))
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => day.isAvailable && setSelectedDate(day.dateStr!)}
                                disabled={!day.isAvailable || isPast}
                                className={`aspect-square text-sm rounded transition-colors ${
                                  isSelected
                                    ? 'bg-ocean-600 text-white font-semibold'
                                    : day.isAvailable && !isPast
                                    ? 'bg-glass-100 hover:bg-ocean-100 text-glass-900 cursor-pointer'
                                    : 'bg-glass-50 text-glass-400 cursor-not-allowed'
                                } ${isToday && !isSelected ? 'ring-2 ring-ocean-300' : ''}`}
                              >
                                {day.date?.getDate()}
                              </button>
                            )
                          })}
                        </div>

                        {/* Selected date info - REMOVED completely for all activities */}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Number of persons - Accordion */}
        <div className="mb-6 border-b border-glass-200 pb-4">
          <button
            onClick={() => setIsQuantityAccordionOpen(!isQuantityAccordionOpen)}
            className="w-full flex items-center justify-between text-left py-2 hover:text-ocean-600 transition-colors"
          >
            <h3 className="text-lg font-semibold text-glass-900">
              Number of persons
            </h3>
            <span
              className={`text-glass-500 text-xl transition-transform duration-200 ${
                isQuantityAccordionOpen ? 'rotate-180' : ''
              }`}
            >
              ▼
            </span>
          </button>
          {isQuantityAccordionOpen && (
            <div className="mt-4 space-y-4">
            
              {/* Adults - Always visible, min = 1 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-glass-700">Adults</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPax(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                    disabled={pax.adults <= 1}
                    className="w-8 h-8 rounded border border-glass-300 hover:bg-glass-100 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{pax.adults}</span>
                  <button
                    onClick={() => setPax(prev => ({ ...prev, adults: prev.adults + 1 }))}
                    className="w-8 h-8 rounded border border-glass-300 hover:bg-glass-100 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Children - Always visible, min = 0 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-glass-700">Children</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPax(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                    disabled={pax.children <= 0}
                    className="w-8 h-8 rounded border border-glass-300 hover:bg-glass-100 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{pax.children}</span>
                  <button
                    onClick={() => setPax(prev => ({ ...prev, children: prev.children + 1 }))}
                    className="w-8 h-8 rounded border border-glass-300 hover:bg-glass-100 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Infants - Always visible, min = 0 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-glass-700">Infants</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPax(prev => ({ ...prev, infants: Math.max(0, prev.infants - 1) }))}
                    disabled={pax.infants <= 0}
                    className="w-8 h-8 rounded border border-glass-300 hover:bg-glass-100 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{pax.infants}</span>
                  <button
                    onClick={() => setPax(prev => ({ ...prev, infants: prev.infants + 1 }))}
                    className="w-8 h-8 rounded border border-glass-300 hover:bg-glass-100 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Price/Total section removed - prices now shown in option labels */}

        {/* Customer Info Form - REMOVED from activity page for VIP activities */}
        {/* The "Your Information" form (Name, Email, Phone) will be shown later at checkout/confirmation step, not on the activity page */}
        {/* This ensures consistency with other VIP activities like Gomera VIP Tour */}
        
        {/* Time selector - HIDDEN: time is automatically selected */}

        {/* Customer Info Form (required for payment) - For non-VIP activities */}
        {!isVipActivity(slug) && selectedDate && (
          <div className="mb-6 space-y-3">
            <h3 className="text-lg font-semibold text-glass-900">Your Information</h3>
            <div>
              <label className="block text-sm font-medium text-glass-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                placeholder="Full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-glass-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 ${
                  customerEmail && !isValidEmail(customerEmail) 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-glass-300'
                }`}
                placeholder="your@email.com"
                required
              />
              {customerEmail && !isValidEmail(customerEmail) && (
                <p className="text-xs text-red-600 mt-1">Please enter a valid email address (e.g., your@email.com)</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-glass-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-2 border border-glass-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                placeholder="+34 123 456 789"
                required
              />
            </div>
          </div>
        )}

        {/* Missing Requirements Warning - REMOVED completely for all activities */}

        {/* Debug panels removed - logs only in console (DEV) */}

        {/* Action Buttons for VIP Activities */}
        {isVipActivity(slug) ? (
          <div className="space-y-3">
            {/* TOTAL PRICE for all VIP activities */}
            <div className="mb-4 p-4 bg-glass-50 border border-glass-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-glass-900">TOTAL PRICE</span>
                {!selectedDate ? (
                  <span className="text-sm text-glass-600">Select a date to see total</span>
                ) : loadingPrices || loadingVipPrice || loadingExtraPrice ? (
                  <span className="text-sm text-glass-600">Loading...</span>
                ) : totalPrice !== null ? (
                  <span className="text-xl font-bold text-ocean-600">€{totalPrice.toFixed(2)}</span>
                ) : (
                  <span className="text-sm text-glass-600">Price unavailable</span>
                )}
              </div>
              {/* Helper text for Extra person option (Astronomic only) */}
              {slug === 'astronomic-tour-vip' && (() => {
                const { extraEventCode } = identifyAstronomicOptions()
                if (selectedEventCode === extraEventCode && selectedDate) {
                  return (
                    <p className="text-xs text-glass-600 mt-2 italic">
                      This option is for additional people. Private tour includes 4 people.
                    </p>
                  )
                }
                return null
              })()}
            </div>
            
            {/* Add to Cart Button */}
            <button
              onClick={() => {
                if (!selectedEventCode || !selectedDate || !pricePerPerson || pax.adults < 1) return
                
                // Add to cart (localStorage)
                const cartItem = {
                  slug,
                  eventCode: selectedEventCode,
                  loadLimitsCode: getLoadLimitsCode(selectedEventCode),
                  date: selectedDate,
                  adults: pax.adults,
                  childs: pax.children,
                  infants: pax.infants,
                  price: pricePerPerson,
                  currency: sessionCurrency,
                  language: calendarLang,
                  title: tour.events.find(e => getEventCode(e) === selectedEventCode)?.title || 'VIP Tour',
                  timestamp: Date.now(),
                }
                
                // Load existing cart
                const existingCart = typeof window !== 'undefined' ? localStorage.getItem('atlantico_cart') : null
                const cart = existingCart ? JSON.parse(existingCart) : []
                
                // Add new item
                cart.push(cartItem)
                
                // Save to localStorage
                if (typeof window !== 'undefined') {
                  localStorage.setItem('atlantico_cart', JSON.stringify(cart))
                  
                  // Show confirmation (optional - could be replaced by a toast notification)
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[CART] Item added:', cartItem)
                  }
                }
              }}
              disabled={!selectedEventCode || !selectedDate || !pricePerPerson || pax.adults < 1}
              className="w-full px-6 py-3 bg-glass-100 text-glass-900 font-medium rounded-lg hover:bg-glass-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-glass-300"
            >
              Ajouter au panier
            </button>
            
            {/* Book Now Button - Uses confirm endpoint */}
            <button
              onClick={async () => {
                if (!selectedEventCode || !selectedDate || !pricePerPerson || pax.adults < 1) return
                
                // Validate customer info
                // Note: Customer info form is not displayed on activity page, but validation remains
                // Customer info will be collected at checkout/confirmation step in the future
                if (!customerName || !customerEmail || !customerPhone) {
                  setBookingError('Please fill in all required fields (name, email, phone)')
                  return
                }
                
                if (!isValidEmail(customerEmail)) {
                  setBookingError('Please enter a valid email address')
                  return
                }
                
                setIsBooking(true)
                setBookingError(null)
                setBookingReference(null)

                try {
                  // Get required data
                  const t_id = getLoadLimitsCode(selectedEventCode)
                  const t_group = getTGroup()
                  const language = calendarLang.toUpperCase()
                  
                  // Extract sesTime from sessions - automatically select earliest time
                  const validSessions = sessionsForDate.filter((s: any) => 
                    s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
                  )
                  
                  // Get unique valid times, sorted
                  const validTimes = Array.from(new Set(
                    validSessions.map((s: any) => s.time).filter((t: string) => t && t !== '' && t !== '00:00' && t !== '-')
                  )).sort()
                  
                  // CRITICAL: Never send '00:00' - block booking if no valid time
                  if (validTimes.length === 0) {
                    setBookingError('No times available for this date')
                    setIsBooking(false)
                    
                    // DEV log for debugging
                    if (process.env.NODE_ENV === 'development') {
                      console.warn('[BOOKING] No times available - booking blocked:', {
                        eventId: t_id,
                        date: selectedDate,
                        sessionsCount: sessionsForDate.length,
                        sampleSessions: sessionsForDate.slice(0, 3),
                        sessionsByDayKeys: Object.keys(availability?.sessionsByDate || {}),
                      })
                    }
                    return
                  }
                  
                  const sesTime = validTimes[0] // Use earliest time
                  
                  // DEV log
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[BOOKING] Submitting payment:', {
                      slug,
                      t_id,
                      t_group,
                      language,
                      tourDate: selectedDate,
                      sesTime,
                      adults: pax.adults,
                      childs: pax.children,
                      infants: pax.infants,
                      name: `${customerName.substring(0, 3)}***`,
                      email: `${customerEmail.substring(0, 3)}***`,
                      phone: `${customerPhone.substring(0, 3)}***`,
                    })
                  }

                  // Submit payment via native HTML form to avoid CORS issues
                  // Browser will navigate to the payment gateway HTML page
                  const form = document.createElement('form')
                  form.method = 'POST'
                  form.action = '/api/atlantico/booking/payment'
                  form.style.display = 'none'

                  // Add all payload fields as hidden inputs
                  const paymentPayload = {
                    t_id,
                    t_group,
                    language,
                    tourDate: selectedDate,
                    sesTime,
                    adults: pax.adults,
                    childs: pax.children || 0,
                    infants: pax.infants || 0,
                    name: customerName,
                    email: customerEmail,
                    phone: customerPhone,
                  }

                  Object.entries(paymentPayload).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== '') {
                      const input = document.createElement('input')
                      input.type = 'hidden'
                      input.name = key
                      input.value = String(value)
                      form.appendChild(input)
                    }
                  })

                  // Append form to body and submit
                  document.body.appendChild(form)
                  form.submit()
                  
                  // Note: Form submission will navigate the browser to the payment gateway
                  // No need to handle response here - browser handles HTML rendering automatically
                  return
                } catch (err) {
                  const errorMsg = err instanceof Error ? err.message : 'Failed to confirm booking'
                  setBookingError(errorMsg)
                  
                  if (process.env.NODE_ENV === 'development') {
                    console.error('[BOOKING] Error:', {
                      error: errorMsg,
                    })
                  }
                } finally {
                  setIsBooking(false)
                }
              }}
              disabled={!selectedEventCode || !selectedDate || !pricePerPerson || pax.adults < 1 || isBooking || !customerName || !customerEmail || !customerPhone}
              className="w-full px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBooking ? 'Redirecting to payment...' : 'Réserver'}
            </button>
            
            {/* Booking Result */}
            {bookingReference && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm font-medium text-green-800 mb-1">Booking confirmed!</div>
                <div className="text-xs text-green-700">Reference: <strong>{bookingReference}</strong></div>
                <div className="text-xs text-green-600 mt-2">Please save this reference number for your records.</div>
              </div>
            )}
            
            {bookingError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-medium text-red-800 mb-1">Booking failed</div>
                <div className="text-xs text-red-700">{bookingError}</div>
              </div>
            )}
          </div>
        ) : (
          /* Original Buy Button for non-VIP activities */
          <button
            onClick={async () => {
              if (!canBook) return
            
            // Fallback to old payment flow for other activities
            setIsBooking(true)
            
            try {
              // Prepare payment request
              const t_id = getLoadLimitsCode(selectedEventCode)
              const t_group = getTGroup()
              const userId = getUserId()
              const language = calendarLang.toUpperCase()
              
              // Extract sesTime from sessions - automatically select earliest time
              const validSessions = sessionsForDate.filter((s: any) => 
                s.available > 0 && s.time && s.time !== '00:00' && s.time !== '-'
              )
              
              // Get unique valid times, sorted
              const validTimes = Array.from(new Set(
                validSessions.map((s: any) => s.time).filter((t: string) => t && t !== '' && t !== '00:00' && t !== '-')
              )).sort()
              
              // CRITICAL: Never send '00:00' - block booking if no valid time
              if (validTimes.length === 0) {
                setBookingError('No times available for this date')
                setIsBooking(false)
                
                // DEV log for debugging
                if (process.env.NODE_ENV === 'development') {
                  console.warn('[BOOKING] No times available - booking blocked:', {
                    eventId: t_id,
                    date: selectedDate,
                    sessionsCount: sessionsForDate.length,
                    sampleSessions: sessionsForDate.slice(0, 3),
                    sessionsByDayKeys: Object.keys(availability?.sessionsByDate || {}),
                  })
                }
                return
              }
              
              const sesTime = validTimes[0] // Use earliest time
              
              // Warning if userId is placeholder in DEV
              if (process.env.NODE_ENV === 'development' && userId === '0') {
                console.warn('[BOOKING] Using placeholder userId "0" - payment may fail. Set ATLANTICO_USER_ID env var.')
              }
              
              // CRITICAL: sesTime must be set from validTimes above, never '00:00'
              // If we reach here, sesTime should already be validated
              if (!sesTime || sesTime === '00:00') {
                setBookingError('No times available for this date')
                setIsBooking(false)
                
                if (process.env.NODE_ENV === 'development') {
                  console.warn('[BOOKING] Payment blocked - no valid sesTime:', {
                    eventId: t_id,
                    date: selectedDate,
                    sesTime,
                    sessionsCount: sessionsForDate.length,
                    sampleSessions: sessionsForDate.slice(0, 3),
                  })
                }
                return
              }
              
              // DEV log
              if (process.env.NODE_ENV === 'development') {
                console.log('[BOOKING] Initiating payment (day-based):', {
                  t_id,
                  t_group,
                  userId,
                  language,
                  tourDate: selectedDate,
                  sesTime,
                  adults: pax.adults,
                  childs: pax.children,
                  infants: pax.infants,
                  name: customerName,
                  email: customerEmail,
                  phone: customerPhone,
                })
              }
              
              // Build form data (application/x-www-form-urlencoded)
              const formData = new URLSearchParams()
              formData.append('userId', userId)
              formData.append('t_id', t_id)
              formData.append('t_group', t_group)
              formData.append('language', language)
              formData.append('tourDate', selectedDate!)
              formData.append('sesTime', sesTime)
              formData.append('adults', String(pax.adults))
              formData.append('childs', String(pax.children || 0))
              formData.append('infants', String(pax.infants || 0))
              formData.append('name', customerName)
              formData.append('email', customerEmail)
              formData.append('phone', customerPhone)
              
              const response = await fetch('/api/atlantico/payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                body: formData.toString(),
              })
              
              const data = await response.json()
              
              // Build payload for debug (mask sensitive data)
              const payloadForDebug: Record<string, any> = {
                userId,
                t_id,
                t_group,
                language,
                tourDate: selectedDate,
                sesTime,
                adults: pax.adults,
                childs: pax.children || 0,
                infants: pax.infants || 0,
                name: customerName,
                email: customerEmail ? `${customerEmail.substring(0, 3)}***${customerEmail.substring(customerEmail.indexOf('@'))}` : '',
                phone: customerPhone ? `${customerPhone.substring(0, 3)}***${customerPhone.substring(customerPhone.length - 2)}` : '',
              }
              
              // Update payment debug
              setPaymentDebug({
                endpoint: data.details?.endpoint || '/api/atlantico/payment',
                payload: payloadForDebug,
                contentType: data.details?.contentTypeSent || 'application/x-www-form-urlencoded; charset=UTF-8',
                status: response.status,
                headers: data.details?.headers || null,
                body: data.details?.body || data.details?.bodyPreview || null,
                error: null,
              })
              
              if (!response.ok) {
                // Show detailed error from API
                const errorDetails = data.details || {}
                const errorMessage = data.message || `HTTP ${response.status}`
                
                // Update debug with error
                setPaymentDebug(prev => prev ? {
                  ...prev,
                  error: errorMessage,
                  body: errorDetails.body || errorDetails.bodyPreview || prev.body,
                } : null)
                
                throw new Error(errorMessage)
              }
              
              // Redirect to payment gateway
              if (data.redirectUrl) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('[BOOKING] Redirecting to payment gateway:', data.redirectUrl)
                }
                window.location.href = data.redirectUrl
              } else {
                // Show detailed error if no redirect URL
                const errorDetails = data.details || {}
                const errorMessage = data.message || 'No redirect URL received from payment gateway'
                
                // Update debug with error
                setPaymentDebug(prev => prev ? {
                  ...prev,
                  error: errorMessage,
                  body: errorDetails.body || errorDetails.bodyPreview || prev.body,
                } : null)
                
                throw new Error(errorMessage)
              }
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : 'Failed to initiate payment'
              
              // Update debug with error if not already set
              setPaymentDebug(prev => prev ? {
                ...prev,
                error: errorMsg,
              } : {
                endpoint: '/api/atlantico/payment',
                payload: null,
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                status: null,
                headers: null,
                body: null,
                error: errorMsg,
              })
              
              console.error('[BOOKING] Payment error:', err)
              // Don't show alert anymore - error is shown in Payment Debug panel
            } finally {
              setIsBooking(false)
            }
          }}
          className="w-full px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!canBook || (!isVipActivity(slug) && (isBooking || loadingPrices))}
        >
          {isVipActivity(slug) 
            ? 'Acheter' 
            : (isBooking ? 'Redirecting to payment...' : 'Book now')
          }
        </button>
        )}
      </div>
    </div>
  )
}

