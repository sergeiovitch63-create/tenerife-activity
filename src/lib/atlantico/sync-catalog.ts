/**
 * Atlántico Catalog Sync Pipeline
 * 
 * Implements the EXACT pipeline from PDF "ATLANTICO EXCURSIONES API":
 * 1. clasificationList/{language}/{Collaborator}
 * 2. For each classification.code => groupsList/{language}/-1/{classification code}
 * 3. For each group => groupDetails/{Code}/{language}
 * 4. groupDetails.ids contains event IDs => for each event => eventDetails/{eventId}/{language}
 * 5. Build normalized catalog (cards + details) consumable by frontend
 * 
 * NO INVENT: Only uses endpoints and data from PDF. No hardcoded activities.
 */

import { atlanticoGet } from './client'
import { getAtlanticoConfig } from './config'
import { getImageForClassificationName } from '@/lib/images/classification-images'

/**
 * Types from PDF (strict, no any)
 */
interface Classification {
  id?: string | number
  code: string
  name?: string
  [key: string]: unknown // Allow other fields from API
}

interface Group {
  Code: string
  name?: string
  [key: string]: unknown // Allow other fields from API
}

interface GroupDetails {
  Code: string
  ids?: string[] | number[] // Event IDs array
  name?: string
  price?: number | string
  image?: string
  desc?: string
  [key: string]: unknown // Allow other fields from API
}

interface EventDetails {
  Code: string
  name?: string
  title?: string
  price?: number | string
  image?: string
  desc?: string
  description?: string
  [key: string]: unknown // Allow other fields from API
}

/**
 * Normalized catalog item (card + detail)
 */
export interface NormalizedCatalogItem {
  id: string // Stable ID (group.Code or event.Code)
  slug: string // Stable slug (group.Code or event.Code, consistent)
  groupCode: string // Group code for reference
  eventCode?: string // Event code if available
  title: string
  description?: string
  shortDescription?: string
  price?: number
  currency?: string
  image?: string
  images?: string[]
  _raw: {
    group?: GroupDetails
    event?: EventDetails
    atlanticoImageFilename?: string // Stored for future use if ATLANTICO_PUBLIC_IMAGE_BASE is provided
  }
}

/**
 * Concurrency limiter (mapLimit)
 * Processes items with max concurrency limit
 * Returns void (for side-effect operations)
 */
async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let index = 0
  const running: Promise<void>[] = []

  async function runNext(): Promise<void> {
    if (index >= items.length) {
      return
    }

    const item = items[index++]
    const promise = fn(item)
      .catch((error) => {
        // Log error but don't fail entire batch
        if (process.env.NODE_ENV !== 'production') {
          console.error('[SYNC] mapLimit error:', error)
        }
      })
      .then(() => runNext())

    running.push(promise)
  }

  // Start initial batch
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    runNext()
  }

  // Wait for all to complete
  await Promise.all(running)
}

/**
 * Sync catalog pipeline (EXACT PDF flow)
 * With concurrency limit of 2 to avoid hanging/overloading
 */
export async function syncCatalog(
  language: string,
  collaborator: string
): Promise<{
  success: boolean
  items: NormalizedCatalogItem[]
  error?: string
  stats?: {
    classifications: number
    groups: number
    events: number
  }
}> {
  const startTime = Date.now()
  const config = getAtlanticoConfig()
  
  if (!config.isValid) {
    return {
      success: false,
      items: [],
      error: config.error || 'Atlantico API configuration is invalid',
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[SYNC] Starting sync:', { language, collaborator })
  }

  // Global timeout: 20 seconds
  const SYNC_TIMEOUT_MS = 20000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Sync timeout after ${SYNC_TIMEOUT_MS}ms`))
    }, SYNC_TIMEOUT_MS)
  })

  try {
    // Race between sync and timeout
    const syncPromise = (async () => {
      // STEP 1: clasificationList/{language}/{Collaborator}
      // Note: PDF spelling is "clasificationList" (not "classificationList")
        const step1Start = Date.now()
      const classifications = await atlanticoGet<Classification[]>(
        `/clasificationList/${language}/${collaborator}`
      )
      const step1Duration = Date.now() - step1Start

      if (!Array.isArray(classifications)) {
        return {
          success: false,
          items: [],
          error: 'Invalid response from clasificationList: expected array',
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('[SYNC] Step 1 completed:', {
          classifications: classifications.length,
          duration: `${step1Duration}ms`,
        })
      }

      const stats = {
        classifications: classifications.length,
        groups: 0,
        events: 0,
      }

      const allItems: NormalizedCatalogItem[] = []
      const seenSlugs = new Set<string>()

      // STEP 2: For each classification.code => groupsList/{language}/-1/{classification code}
      // page=-1 returns all groups (per PDF)
      // Use concurrency limit of 2
      const step2Start = Date.now()
      await mapLimit(classifications, 2, async (classification) => {
      if (!classification.code || typeof classification.code !== 'string') {
        return
      }

      try {
        const groups = await atlanticoGet<Group[]>(
          `/groupsList/${language}/-1/${classification.code}`
        )

        if (!Array.isArray(groups)) {
          return // Skip invalid responses
        }

        stats.groups += groups.length

        // STEP 3: For each group => groupDetails/{Code}/{language}
        // Use concurrency limit of 2
        await mapLimit(groups, 2, async (group) => {
          if (!group.Code || typeof group.Code !== 'string') {
            return
          }

          try {
            const groupDetails = await atlanticoGet<GroupDetails>(
              `/groupDetails/${group.Code}/${language}`
            )

            if (!groupDetails || typeof groupDetails !== 'object') {
              return
            }

            // STEP 4: groupDetails.ids contains event IDs => for each event => eventDetails/{eventId}/{language}
            const eventIds = groupDetails.ids || []
            
            if (!Array.isArray(eventIds) || eventIds.length === 0) {
              // No events in this group - create item from group only
              const item = normalizeItem(
                groupDetails,
                group.Code,
                language,
                undefined,
                classification.code,
                classification.name,
                (groupDetails as any).category,
                (groupDetails as any).categoryName,
                classification.id
              )
              if (item && !seenSlugs.has(item.slug)) {
                seenSlugs.add(item.slug)
                allItems.push(item)
              }
              return
            }

            // Fetch event details for each event ID with concurrency limit of 2
            const eventIdStrings = eventIds.map((id) => String(id))
            await mapLimit(eventIdStrings, 2, async (eventIdStr) => {
              
              try {
                const eventDetails = await atlanticoGet<EventDetails>(
                  `/eventDetails/${eventIdStr}/${language}`
                )

                if (!eventDetails || typeof eventDetails !== 'object') {
                  return
                }

                stats.events++

                // Normalize to catalog item (group + event)
                const item = normalizeItem(
                  groupDetails,
                  group.Code,
                  language,
                  eventDetails,
                  classification.code,
                  classification.name,
                  (groupDetails as any).category,
                  (groupDetails as any).categoryName,
                  classification.id
                )
                if (item && !seenSlugs.has(item.slug)) {
                  seenSlugs.add(item.slug)
                  allItems.push(item)
                }
              } catch (eventError) {
                // Log but continue (don't fail entire sync)
                if (process.env.NODE_ENV !== 'production') {
                  console.error(`[SYNC] Failed to fetch event ${eventIdStr}:`, eventError)
                }
              }
            })
          } catch (groupError) {
            // Log but continue (don't fail entire sync)
            if (process.env.NODE_ENV !== 'production') {
              console.error(`[SYNC] Failed to fetch group ${group.Code}:`, groupError)
            }
          }
        })
      } catch (classificationError) {
        // Log but continue (don't fail entire sync)
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[SYNC] Failed to fetch groups for classification ${classification.code}:`, classificationError)
        }
        }
      })
      const step2Duration = Date.now() - step2Start

      const totalDuration = Date.now() - startTime

      if (process.env.NODE_ENV !== 'production') {
        console.log('[SYNC] Sync completed:', {
          language,
          duration: `${totalDuration}ms`,
          step2Duration: `${step2Duration}ms`,
          stats: {
            classifications: stats.classifications,
            groups: stats.groups,
            events: stats.events,
          },
          itemsCount: allItems.length,
        })
        
        // Log structure finale retournée (keys uniquement)
        const result = {
          success: true,
          items: allItems,
          stats,
        }
        console.log('[SYNC] Result structure:', {
          resultKeys: Object.keys(result),
          itemsLength: result.items.length,
          itemsSampleKeys: result.items.length > 0 ? Object.keys(result.items[0]) : [],
          statsKeys: result.stats ? Object.keys(result.stats) : [],
        })
      }

      return {
        success: true,
        items: allItems,
        stats,
      }
    })()

    // Race between sync and timeout
    return await Promise.race([syncPromise, timeoutPromise])
  } catch (error) {
    const totalDuration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (process.env.NODE_ENV !== 'production') {
      console.error('[SYNC] Sync failed:', {
        language,
        duration: `${totalDuration}ms`,
        error: errorMessage,
      })
    }
    
    return {
      success: false,
      items: [],
      error: errorMessage,
    }
  }
}

/**
 * Normalize group/event to catalog item
 * NO INVENT: Only uses fields that exist in API response
 * Uses local images based on classification instead of Atlantico images
 * GUARANTEES: item.image is always a valid path (never null/undefined)
 */
function normalizeItem(
  groupDetails: GroupDetails,
  groupCode: string,
  language: string,
  eventDetails?: EventDetails,
  classificationCode?: string,
  classificationName?: string,
  categoryId?: string | number | null | undefined,
  categoryName?: string | null | undefined,
  classificationId?: string | number | null | undefined
): NormalizedCatalogItem | null {
  // Use event code if available, otherwise group code
  const eventCodeRaw = eventDetails?.Code || eventDetails?.code
  const eventCode = eventCodeRaw ? String(eventCodeRaw) : undefined
  const stableId = String(eventCode || groupCode)
  const stableSlug = String(eventCode || groupCode)

  // Extract title (priority: event.name > event.title > group.name)
  const title = 
    (eventDetails?.name && typeof eventDetails.name === 'string' ? eventDetails.name : null) ||
    (eventDetails?.title && typeof eventDetails.title === 'string' ? eventDetails.title : null) ||
    (groupDetails.name && typeof groupDetails.name === 'string' ? groupDetails.name : null) ||
    stableId

  // Extract description (priority: event.desc > event.description > group.desc)
  const description = 
    (eventDetails?.desc && typeof eventDetails.desc === 'string' ? eventDetails.desc : null) ||
    (eventDetails?.description && typeof eventDetails.description === 'string' ? eventDetails.description : null) ||
    (groupDetails.desc && typeof groupDetails.desc === 'string' ? groupDetails.desc : null) ||
    undefined

  // Extract short description (first 200 chars of description)
  const shortDescription = description
    ? description.substring(0, 200).trim()
    : undefined

  // Extract price (priority: event.price > group.price)
  let price: number | undefined = undefined
  if (eventDetails?.price !== undefined && eventDetails.price !== null) {
    const eventPrice = typeof eventDetails.price === 'string' 
      ? parseFloat(eventDetails.price) 
      : typeof eventDetails.price === 'number' 
        ? eventDetails.price 
        : undefined
    if (eventPrice !== undefined && !isNaN(eventPrice) && eventPrice > 0) {
      price = eventPrice
    }
  }
  if (price === undefined && groupDetails.price !== undefined && groupDetails.price !== null) {
    const groupPrice = typeof groupDetails.price === 'string'
      ? parseFloat(groupDetails.price)
      : typeof groupDetails.price === 'number'
        ? groupDetails.price
        : undefined
    if (groupPrice !== undefined && !isNaN(groupPrice) && groupPrice > 0) {
      price = groupPrice
    }
  }

  // Extract Atlantico image filename (stored but NOT used for rendering)
  const atlanticoImageFilename = 
    (eventDetails?.image && typeof eventDetails.image === 'string' ? eventDetails.image : null) ||
    (groupDetails.image && typeof groupDetails.image === 'string' ? groupDetails.image : null) ||
    undefined

  // Use local image based on classification/category (NOT Atlantico image)
  // Priority: classificationId > classificationCode > categoryId > categoryName > classificationName > keyword matching > default
  const mappedImage = getImageForClassificationName(
    classificationCode,
    classificationName,
    categoryId,
    categoryName,
    classificationId,
    stableId // activityId for logging
  )

  // GUARANTEE: Always have a valid image path (never null/undefined)
  const localImage = mappedImage || '/images/hero-poster.jpg'

  return {
    id: stableId,
    slug: stableSlug,
    groupCode,
    eventCode: eventCode || undefined,
    title,
    description,
    shortDescription,
    price,
    currency: 'EUR', // Default currency (from PDF context)
    // Use local image, NOT Atlantico image - GUARANTEED to be non-empty
    image: localImage,
    images: [localImage],
    _raw: {
      group: groupDetails,
      event: eventDetails,
      // Store Atlantico image filename for future use (if ATLANTICO_PUBLIC_IMAGE_BASE is ever provided)
      atlanticoImageFilename,
    },
  }
}

