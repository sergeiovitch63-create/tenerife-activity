/**
 * Full Catalog Hydration
 * 
 * Aggregates all Atlantico data (groups + events + prices + limits) into a unified catalog.
 */

import { atlanticoGet, buildAtlanticoImageUrl, sanitizeText } from './client'
import { parseLoadPricesResponse } from './prices'
import { pickNextAvailableDateFromLimits } from './limits'
import { firstDayOfMonth, toYMD } from './date'
import { extractEventCodes } from './mappers'
import { normalizeTour, normalizeEvent, extractAtlanticoImage } from './quality'
import type {
  FullCatalog,
  FullTour,
  FullEvent,
  EventPrice,
  EventAvailability,
  EventSession,
  CoreCatalog,
  CoreTour,
  CoreEvent,
  DynamicCatalog,
  DynamicEventData,
} from './catalog-types'

/**
 * Hydration options
 */
export interface HydrationOptions {
  language: string // 'ENG', 'ESP', etc.
  classificationCode?: string
  page?: number // Page number for groupsList (default: -1 for all)
  maxGroups?: number // Limit number of groups (for testing)
  maxEventsPerGroup?: number // Limit events per group (for testing)
  priceDate?: string // YYYYMMDD format for loadPrices
  limitsMonth?: string // YYYYMM format, will be normalized to YYYY-MM-01
  office?: string // Office code for loadPrices (default: '' or env)
  includeRaw?: boolean // Include raw Atlantico responses
  mode?: 'core' | 'dynamic' | 'full' // 'core': no prices/limits, 'dynamic': only prices/limits, 'full': everything (default)
  coreCatalog?: CoreCatalog // Required for mode='dynamic' - source core catalog
  tourIds?: string[] // Optional: limit dynamic hydration to specific tour IDs
  concurrency?: {
    groups?: number // Max concurrent group fetches (default: 5)
    events?: number // Max concurrent event fetches (default: 3)
  }
}

/**
 * Simple concurrency pool
 */
class ConcurrencyPool {
  private running = 0
  private queue: Array<() => Promise<void>> = []

  constructor(private maxConcurrent: number) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.running++
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.running--
          if (this.queue.length > 0) {
            const next = this.queue.shift()!
            next()
          }
        }
      }

      if (this.running < this.maxConcurrent) {
        run()
      } else {
        this.queue.push(run)
      }
    })
  }
}


/**
 * Normalize date to YYYY-MM-01 format
 */
function normalizeToMonthStart(dateStr: string | undefined): string {
  if (!dateStr) {
    return firstDayOfMonth(new Date())
  }

  // If YYYYMM format, convert to YYYY-MM-01
  if (/^\d{6}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    return `${year}-${month}-01`
  }

  // If already YYYY-MM-01, return as-is
  if (/^\d{4}-\d{2}-01$/.test(dateStr)) {
    return dateStr
  }

  // If YYYY-MM-DD, extract YYYY-MM and append -01
  const match = dateStr.match(/^(\d{4}-\d{2})/)
  if (match) {
    return match[1] + '-01'
  }

  // Default to current month
  return firstDayOfMonth(new Date())
}

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeToDate(dateStr: string | undefined): string {
  if (!dateStr) {
    return toYMD(new Date())
  }

  // If YYYYMMDD format, convert to YYYY-MM-DD
  if (/^\d{8}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    return `${year}-${month}-${day}`
  }

  // If already YYYY-MM-DD, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  // Default to today
  return toYMD(new Date())
}

/**
 * Build slug from id or title
 */
function buildSlug(id: string, title?: string): string {
  if (title) {
    const slugified = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return slugified || id
  }
  return id
}

/**
 * Parse sessions from limits response
 */
function parseSessionsFromLimits(limitsResponse: any, month: string): Record<string, EventSession[]> {
  const sessionsByDate: Record<string, EventSession[]> = {}

  if (!limitsResponse || typeof limitsResponse !== 'object') {
    return sessionsByDate
  }

  // Format 1: Array of dates with limit/used arrays
  if (Array.isArray(limitsResponse.dates) && Array.isArray(limitsResponse.limit)) {
    const dates = limitsResponse.dates
    const limits = limitsResponse.limit
    const used = limitsResponse.used || []
    const times = limitsResponse.times || []

    for (let i = 0; i < dates.length; i++) {
      const dateStr = String(dates[i])
      // Normalize date format
      let normalizedDate: string
      if (/^\d{8}$/.test(dateStr)) {
        // YYYYMMDD format
        normalizedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        normalizedDate = dateStr
      } else {
        continue
      }

      const limit = typeof limits[i] === 'number' ? limits[i] : 0
      const usedCount = typeof used[i] === 'number' ? used[i] : 0
      const remaining = limit - usedCount

      if (remaining > 0) {
        // If times array exists, create sessions for each time
        if (Array.isArray(times) && times.length > 0) {
          sessionsByDate[normalizedDate] = times.map((time: any) => ({
            time: String(time),
            available: remaining,
          }))
        } else {
          // Single session for the day (no specific time)
          sessionsByDate[normalizedDate] = [
            {
              time: undefined,
              available: remaining,
            },
          ]
        }
      }
    }
  }

  // Format 2: Object with dates.wdays (weekdays)
  if (limitsResponse.dates && typeof limitsResponse.dates === 'object' && !Array.isArray(limitsResponse.dates)) {
    const wdays = limitsResponse.dates.wdays
    if (Array.isArray(wdays) && wdays.length > 0) {
      // Generate sessions for all days in month matching weekdays
      const monthMatch = month.match(/^(\d{4})-(\d{2})/)
      if (monthMatch) {
        const year = parseInt(monthMatch[1], 10)
        const monthNum = parseInt(monthMatch[2], 10) - 1 // JS months are 0-indexed
        const lastDay = new Date(year, monthNum + 1, 0).getDate()

        for (let day = 1; day <= lastDay; day++) {
          const date = new Date(year, monthNum, day)
          const weekday = date.getDay() === 0 ? 7 : date.getDay() // Convert to 1=Monday, 7=Sunday

          if (wdays.includes(weekday)) {
            const dateStr = toYMD(date)
            if (!sessionsByDate[dateStr]) {
              sessionsByDate[dateStr] = [
                {
                  time: undefined,
                  available: undefined, // Unknown availability
                },
              ]
            }
          }
        }
      }
    }
  }

  return sessionsByDate
}

/**
 * Hydrate dynamic data (prices and availability) for a single event
 */
async function hydrateDynamicForEvent(
  eventCode: string,
  language: string,
  priceDate: string,
  limitsMonth: string,
  office: string,
  includeRaw: boolean,
  eventPool: ConcurrencyPool
): Promise<DynamicEventData | null> {
  return eventPool.execute(async () => {
    try {
      // Fetch limits
      let limitsResponse: any = null
      try {
        limitsResponse = await atlanticoGet<any>(`/loadLimits/${eventCode}/${language}/${limitsMonth}`)
      } catch (err) {
        if (process.env.ATLANTICO_DEBUG === '1') {
          console.warn(`[HYDRATION] loadLimits failed for ${eventCode}:`, err instanceof Error ? err.message : 'Unknown')
        }
      }

      // Fetch prices
      let pricesResponse: any = null
      try {
        const pricesPath = office
          ? `/loadPrices/${eventCode}/${priceDate}/${office}`
          : `/loadPrices/${eventCode}/${priceDate}`
        pricesResponse = await atlanticoGet<any>(pricesPath)
      } catch (err) {
        if (process.env.ATLANTICO_DEBUG === '1') {
          console.warn(`[HYDRATION] loadPrices failed for ${eventCode}:`, err instanceof Error ? err.message : 'Unknown')
        }
      }

      // Parse price
      let price: EventPrice | undefined
      if (pricesResponse) {
        const parsed = parseLoadPricesResponse(pricesResponse)
        price = {
          date: priceDate,
          office: office || undefined,
          adult: parsed.adult,
          child: parsed.child,
          infant: parsed.infant,
          ...(includeRaw ? { raw: pricesResponse } : {}),
        }
      }

      // Parse availability
      let availability: EventAvailability | undefined
      if (limitsResponse) {
        const sessionsByDate = parseSessionsFromLimits(limitsResponse, limitsMonth)
        availability = {
          month: limitsMonth,
          sessionsByDate,
          ...(includeRaw ? { raw: limitsResponse } : {}),
        }
      }

      // Return dynamic data only (no tourId here, will be set by caller)
      return {
        eventId: eventCode,
        tourId: '', // Will be set by caller
        ...(price ? { price } : {}),
        ...(availability ? { availability } : {}),
      }
    } catch (error) {
      if (process.env.ATLANTICO_DEBUG === '1') {
        console.error(`[HYDRATION] Dynamic data failed for ${eventCode}:`, error instanceof Error ? error.message : 'Unknown')
      }
      return null
    }
  })
}

/**
 * Hydrate a single event
 */
async function hydrateEvent(
  eventCode: string,
  language: string,
  priceDate: string,
  limitsMonth: string,
  office: string,
  includeRaw: boolean,
  skipPricesLimits: boolean,
  eventPool: ConcurrencyPool
): Promise<FullEvent | null> {
  return eventPool.execute(async () => {
    try {
      // Fetch eventDetails
      const eventDetails = await atlanticoGet<any>(`/eventDetails/${eventCode}/${language}`)

      // Fetch limits (skip if core mode)
      let limitsResponse: any = null
      if (!skipPricesLimits) {
        try {
          limitsResponse = await atlanticoGet<any>(`/loadLimits/${eventCode}/${language}/${limitsMonth}`)
        } catch (err) {
          // Silent fail for limits
          if (process.env.ATLANTICO_DEBUG === '1') {
            console.warn(`[HYDRATION] loadLimits failed for ${eventCode}:`, err instanceof Error ? err.message : 'Unknown')
          }
        }
      }

      // Fetch prices (skip if core mode)
      let pricesResponse: any = null
      if (!skipPricesLimits) {
        try {
          const pricesPath = office
            ? `/loadPrices/${eventCode}/${priceDate}/${office}`
            : `/loadPrices/${eventCode}/${priceDate}`
          pricesResponse = await atlanticoGet<any>(pricesPath)
        } catch (err) {
          // Silent fail for prices
          if (process.env.ATLANTICO_DEBUG === '1') {
            console.warn(`[HYDRATION] loadPrices failed for ${eventCode}:`, err instanceof Error ? err.message : 'Unknown')
          }
        }
      }

      // Parse price
      let price: EventPrice | undefined
      if (pricesResponse) {
        const parsed = parseLoadPricesResponse(pricesResponse)
        price = {
          date: priceDate,
          office: office || undefined,
          adult: parsed.adult,
          child: parsed.child,
          infant: parsed.infant,
          ...(includeRaw ? { raw: pricesResponse } : {}),
        }
      }

      // Parse availability
      let availability: EventAvailability | undefined
      if (limitsResponse) {
        const sessionsByDate = parseSessionsFromLimits(limitsResponse, limitsMonth)
        availability = {
          month: limitsMonth,
          sessionsByDate,
          ...(includeRaw ? { raw: limitsResponse } : {}),
        }
      }

      // Extract event data
      const event: FullEvent = {
        id: eventCode,
        title: eventDetails.name || eventDetails.title || undefined,
        days: Array.isArray(eventDetails.days) ? eventDetails.days : undefined,
        times: Array.isArray(eventDetails.times) ? eventDetails.times : undefined,
        icons: Array.isArray(eventDetails.icons) ? eventDetails.icons : undefined,
        route: typeof eventDetails.route === 'string' ? eventDetails.route : undefined,
        meetingPoints: Array.isArray(eventDetails.meetingPoints)
          ? eventDetails.meetingPoints
          : undefined,
        ...(price ? { price } : {}),
        ...(availability ? { availability } : {}),
        ...(includeRaw ? { raw: eventDetails } : {}),
      }

      // Apply normalization
      const normalized = normalizeEvent(event)
      return normalized
    } catch (error) {
      // Event fetch failed
      if (process.env.ATLANTICO_DEBUG === '1') {
        console.error(`[HYDRATION] Event ${eventCode} failed:`, error instanceof Error ? error.message : 'Unknown')
      }

      // Return event with error in DEV
      if (process.env.NODE_ENV === 'development') {
        return {
          id: eventCode,
          rawError: error instanceof Error ? error.message : 'Unknown error',
        }
      }

      return null
    }
  })
}

/**
 * Hydrate a single tour (group)
 */
async function hydrateTour(
  group: any,
  language: string,
  priceDate: string,
  limitsMonth: string,
  office: string,
  includeRaw: boolean,
  skipPricesLimits: boolean,
  maxEventsPerGroup: number | undefined,
  groupPool: ConcurrencyPool,
  eventPool: ConcurrencyPool
): Promise<FullTour | null> {
  return groupPool.execute(async () => {
    try {
      const groupId = String(group.id || group.code || '')
      if (!groupId) {
        return null
      }

      // Fetch groupDetails
      let groupDetails: any
      try {
        groupDetails = await atlanticoGet<any>(`/groupDetails/${groupId}/${language}`)
      } catch (error) {
        // GroupDetails failed, skip this group
        if (process.env.ATLANTICO_DEBUG === '1') {
          console.warn(`[HYDRATION] groupDetails failed for ${groupId}:`, error instanceof Error ? error.message : 'Unknown')
        }
        return null
      }

      // Extract event codes using robust resolver
      const { resolveEventIds } = await import('@/lib/atlantico/event-id-resolver')
      const eventCodes = resolveEventIds(groupDetails)
      
      if (eventCodes.length === 0) {
        // No events, still create tour but empty events
      }

      // Limit events (maxEventsPerGroup is already finalMaxEventsPerGroup from parent)
      const limitedEventCodes = maxEventsPerGroup
        ? eventCodes.slice(0, maxEventsPerGroup)
        : eventCodes
      const eventsTruncated = maxEventsPerGroup && eventCodes.length > maxEventsPerGroup
      
      if (eventsTruncated && process.env.NODE_ENV === 'development') {
        console.warn(`[HYDRATION] Events truncated for tour ${groupId}: ${eventCodes.length} -> ${limitedEventCodes.length} (limit: ${maxEventsPerGroup})`)
      }

      // Hydrate events
      const eventPromises = limitedEventCodes.map((eventCode) =>
        hydrateEvent(eventCode, language, priceDate, limitsMonth, office, includeRaw, skipPricesLimits, eventPool)
      )
      const events = (await Promise.all(eventPromises)).filter((e): e is FullEvent => e !== null)

      // Extract base price from first event or groupDetails
      let basePrice: number | null = null
      if (events.length > 0 && events[0].price) {
        basePrice = events[0].price.adult || null
      } else {
        // Try groupDetails price fields
        const groupPrice = groupDetails.price || groupDetails.priceA || groupDetails.priceS
        if (typeof groupPrice === 'number' && groupPrice > 0) {
          basePrice = groupPrice
        }
      }

      // Build tour
      const title = sanitizeText(groupDetails.name || groupDetails.title || group.name || group.title)
      const description = sanitizeText(groupDetails.desc || groupDetails.description || group.desc || group.description)
      
      // Extract image from groupDetails (tries multiple field names)
      let image = extractAtlanticoImage(groupDetails)
      // Fallback to group.image if groupDetails didn't have image
      if (!image) {
        image = extractAtlanticoImage(group)
      }

      const tour: FullTour = {
        id: groupId,
        code: groupDetails.code || group.code || undefined,
        slug: buildSlug(groupId, title),
        title,
        description,
        image,
        duration: typeof groupDetails.duration === 'number' ? groupDetails.duration : null,
        basePrice,
        currency: 'EUR',
        events,
        ...(includeRaw ? { raw: { groupList: group, groupDetails } } : {}),
      }

      // Apply normalization
      const normalized = normalizeTour(tour)
      return normalized
    } catch (error) {
      if (process.env.ATLANTICO_DEBUG === '1') {
        console.error(`[HYDRATION] Tour failed:`, error instanceof Error ? error.message : 'Unknown')
      }
      return null
    }
  })
}

/**
 * Hydrate full catalog
 * 
 * Mode 'core': groupsList + groupDetails + eventDetails (NO limits, NO prices)
 * Mode 'dynamic': only prices/limits for events from core catalog
 * Mode 'full': everything (default, backward compatible)
 */
export async function hydrateFullCatalog(opts: HydrationOptions): Promise<FullCatalog | CoreCatalog | DynamicCatalog> {
  const mode = opts.mode || 'full'
  const startTime = Date.now()
  
  // Handle dynamic mode: hydrate only prices/limits from core catalog
  if (mode === 'dynamic') {
    return hydrateDynamicCatalog(opts, startTime)
  }
  
  // Handle core/full mode: hydrate tours (with or without prices/limits)
  const skipPricesLimits = mode === 'core'
  
  const {
    language,
    classificationCode,
    page = -1,
    maxGroups,
    maxEventsPerGroup,
    priceDate: priceDateInput,
    limitsMonth: limitsMonthInput,
    office: officeInput,
    includeRaw = false,
    concurrency = {},
  } = opts

  // Normalize dates (required even for core mode for consistency, but not used)
  const priceDate = normalizeToDate(priceDateInput)
  const limitsMonth = normalizeToMonthStart(limitsMonthInput)
  const office = officeInput || process.env.ATLANTICO_OFFICE || ''

  // Concurrency pools
  const groupPool = new ConcurrencyPool(concurrency.groups ?? 5)
  const eventPool = new ConcurrencyPool(concurrency.events ?? 3)

  if (process.env.ATLANTICO_DEBUG === '1') {
    console.log('[HYDRATION_START]', {
      mode,
      language,
      classificationCode,
      page,
      maxGroups,
      maxEventsPerGroup,
      priceDate,
      limitsMonth,
      office: office || 'default',
      includeRaw,
      skipPricesLimits,
    })
  }

  // Fetch groupsList
  const groupsListPath = classificationCode
    ? `/groupsList/${language}/${page}/${classificationCode}`
    : `/groupsList/${language}/${page}`

  let groups: any[] = []
  try {
    const groupsList = await atlanticoGet<any[]>(groupsListPath)
    groups = Array.isArray(groupsList) ? groupsList : []
  } catch (error) {
    throw new Error(`Failed to fetch groupsList: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Apply hard limits from env if not specified in opts
  const envMaxGroups = process.env.CATALOG_MAX_GROUPS
    ? parseInt(process.env.CATALOG_MAX_GROUPS, 10)
    : 300 // Default 300
  const envMaxEventsPerGroup = process.env.CATALOG_MAX_EVENTS_PER_GROUP
    ? parseInt(process.env.CATALOG_MAX_EVENTS_PER_GROUP, 10)
    : 10 // Default 10

  // Apply limits (opts override env)
  const finalMaxGroups = maxGroups || envMaxGroups
  const finalMaxEventsPerGroup = maxEventsPerGroup || envMaxEventsPerGroup

  // Limit groups
  const limitedGroups = groups.slice(0, finalMaxGroups)
  const wasTruncated = groups.length > finalMaxGroups

  if (wasTruncated && process.env.NODE_ENV === 'development') {
    console.warn(`[HYDRATION] Groups truncated: ${groups.length} -> ${limitedGroups.length} (limit: ${finalMaxGroups})`)
  }

  if (process.env.ATLANTICO_DEBUG === '1') {
    console.log('[HYDRATION_GROUPS]', {
      total: groups.length,
      limited: limitedGroups.length,
      maxGroups: finalMaxGroups,
      maxEventsPerGroup: finalMaxEventsPerGroup,
      truncated: wasTruncated,
    })
  }

  // Hydrate all tours
  const tourPromises = limitedGroups.map((group) =>
    hydrateTour(group, language, priceDate, limitsMonth, office, includeRaw, skipPricesLimits, finalMaxEventsPerGroup, groupPool, eventPool)
  )
  const tours = (await Promise.all(tourPromises)).filter((t): t is FullTour => t !== null)

  const duration = Date.now() - startTime

  // Safety check: don't return empty catalog if we have existing cache
  if (tours.length === 0) {
    throw new Error('EMPTY_UPSTREAM: Atlantico returned 0 items. Refusing to overwrite existing cache.')
  }

  if (process.env.ATLANTICO_DEBUG === '1') {
    const totalEvents = tours.reduce((sum, tour) => sum + tour.events.length, 0)
    console.log('[HYDRATION_COMPLETE]', {
      mode,
      tours: tours.length,
      totalEvents,
      duration: `${duration}ms`,
    })
  }

  // Return CoreCatalog for core mode, FullCatalog for full mode
  if (mode === 'core') {
    return {
      updatedAt: new Date().toISOString(),
      language,
      itemCount: tours.length,
      items: tours as any as CoreTour[], // CoreTour is subset of FullTour (no price/availability in events)
    } as CoreCatalog
  }

  return {
    updatedAt: new Date().toISOString(),
    language,
    itemCount: tours.length,
    items: tours,
  } as FullCatalog
}

/**
 * Hydrate dynamic catalog (prices and availability only)
 * Reads core catalog and hydrates prices/limits for all events
 */
async function hydrateDynamicCatalog(opts: HydrationOptions, startTime: number): Promise<DynamicCatalog> {
  const { coreCatalog, language, priceDate: priceDateInput, limitsMonth: limitsMonthInput, office: officeInput, includeRaw = false, tourIds, concurrency = {} } = opts

  if (!coreCatalog) {
    throw new Error('coreCatalog is required for dynamic mode')
  }

  const priceDate = normalizeToDate(priceDateInput)
  const limitsMonth = normalizeToMonthStart(limitsMonthInput)
  const office = officeInput || process.env.ATLANTICO_OFFICE || ''
  const eventPool = new ConcurrencyPool(concurrency.events ?? 3)

  if (process.env.ATLANTICO_DEBUG === '1') {
    console.log('[HYDRATION_DYNAMIC_START]', {
      language,
      priceDate,
      limitsMonth,
      office: office || 'default',
      tourCount: coreCatalog.items.length,
      tourIdsFilter: tourIds?.length || 'all',
    })
  }

  // Filter tours if tourIds specified
  const toursToProcess = tourIds
    ? coreCatalog.items.filter((t) => tourIds.includes(t.id))
    : coreCatalog.items

  // Build map: tourId -> eventId[]
  const dynamicData: Record<string, Record<string, DynamicEventData>> = {}

    // Hydrate dynamic data for all events
    let totalDynamicEvents = 0
    for (const tour of toursToProcess) {
      const tourData: Record<string, DynamicEventData> = {}

      for (const event of tour.events) {
        const dynamic = await hydrateDynamicForEvent(
          event.id,
          language,
          priceDate,
          limitsMonth,
          office,
          includeRaw,
          eventPool
        )

        if (dynamic) {
          dynamic.tourId = tour.id
          tourData[event.id] = dynamic
          totalDynamicEvents++
        }
      }

      if (Object.keys(tourData).length > 0) {
        dynamicData[tour.id] = tourData
      }
    }

    // Safety check: don't return empty dynamic catalog if we have existing cache
    if (Object.keys(dynamicData).length === 0 && totalDynamicEvents === 0) {
      throw new Error('EMPTY_UPSTREAM: No dynamic data (prices/limits) found. Refusing to overwrite existing cache.')
    }

  const duration = Date.now() - startTime

  if (process.env.ATLANTICO_DEBUG === '1') {
    const totalEvents = Object.values(dynamicData).reduce((sum, tourData) => sum + Object.keys(tourData).length, 0)
    console.log('[HYDRATION_DYNAMIC_COMPLETE]', {
      tours: Object.keys(dynamicData).length,
      totalEvents,
      duration: `${duration}ms`,
    })
  }

  return {
    updatedAt: new Date().toISOString(),
    language,
    priceDate,
    limitsMonth,
    office: office || undefined,
    data: dynamicData,
  }
}

