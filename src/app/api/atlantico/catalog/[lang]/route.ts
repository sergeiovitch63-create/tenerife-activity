/**
 * GET /api/atlantico/catalog/[lang]
 * 
 * Complete Atlantico catalog aggregating all groups.
 * Fetches all groups, merges activities, and deduplicates by event code.
 * 
 * Route parameters:
 * - lang: Language code (e.g., 'ENG', 'ESP')
 * 
 * Returns:
 * - total: Total number of unique activities
 * - groupsUsed: Array of group IDs that returned data
 * - items: Array of activity items (with _raw data)
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { extractEventCodes } from '@/lib/atlantico/mappers'
import type { AtlanticoGroupDetails, AtlanticoEventDetails } from '@/lib/atlantico/mappers'
import { extractCoverImage, extractImageUrls } from '@/lib/atlantico/images'
import { getFallbackImageForTour } from '@/lib/images/fallback'
import { assignVibeId } from '@/lib/vibes/assignVibe'

/**
 * Concurrency limiter for group fetching
 */
class ConcurrencyLimiter {
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

const limiter = new ConcurrencyLimiter(4) // Max 4 concurrent group fetches

/**
 * Fetch group details from internal API with timeout
 */
async function fetchGroupDetails(groupId: string, lang: string): Promise<AtlanticoGroupDetails | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    try {
      const response = await fetch(`${baseUrl}/api/atlantico/group/${groupId}/${lang}`, {
        next: { revalidate: 3600 }, // Cache 1 hour
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        // Timeout - silently ignore
        return null
      }
      throw fetchError
    }
  } catch (error) {
    // Silently ignore errors (timeout, network, etc.)
    return null
  }
}

/**
 * Fetch event details from internal API with timeout
 */
async function fetchEventDetails(eventCode: string, lang: string): Promise<AtlanticoEventDetails | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    try {
      const response = await fetch(`${baseUrl}/api/atlantico/event/${eventCode}/${lang}`, {
        next: { revalidate: 3600 }, // Cache 1 hour
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        // Timeout - silently ignore
        return null
      }
      throw fetchError
    }
  } catch (error) {
    // Silently ignore errors
    return null
  }
}

/**
 * Get list of candidate group IDs
 * Fallback strategy: try range 1-60 (safe limit)
 */
function getCandidateGroupIds(): string[] {
  // Check if explicit list exists in env
  const envGroups = process.env.ATLANTICO_GROUP_IDS
  if (envGroups) {
    // Parse CSV: split, trim, filter empty, deduplicate, validate (numeric strings)
    const ids = envGroups
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .filter((id) => /^\d+$/.test(id)) // Only numeric strings
    // Deduplicate
    return Array.from(new Set(ids))
  }

  // Fallback: generate range 1-60
  return Array.from({ length: 60 }, (_, i) => String(i + 1))
}

/**
 * Normalize raw event to Experience format
 */
function normalizeToExperience(raw: AtlanticoEventDetails, groupId?: string): any {
  // Extract price: first > 0 among priceA, priceS, priceC, price
  let price = 0
  if (typeof (raw as any).priceA === 'number' && (raw as any).priceA > 0) {
    price = (raw as any).priceA
  } else if (typeof (raw as any).priceS === 'number' && (raw as any).priceS > 0) {
    price = (raw as any).priceS
  } else if (typeof (raw as any).priceC === 'number' && (raw as any).priceC > 0) {
    price = (raw as any).priceC
  } else if (typeof (raw as any).price === 'number' && (raw as any).price > 0) {
    price = (raw as any).price
  }

  // Extract code for id/slug (with fallbacks)
  const code = raw.code || (raw as any).id || (raw as any).eventCode || ''
  const id = String(code || JSON.stringify(raw).substring(0, 50)) // Fallback to stable string
  const slug = String(code || id)

  // Extract times for availabilityHint
  const times = Array.isArray(raw.times) ? raw.times.filter((t): t is string => typeof t === 'string' && t.trim().length > 0) : []
  const availabilityHint = times.length > 0
    ? `Available at: ${times.slice(0, 5).join(', ')}`
    : null

  // Add group info to _raw if available
  const rawWithGroup = groupId
    ? { ...raw, group: groupId, groupCode: groupId }
    : raw

  // Extract images using the unified extractor
  const extractedCoverImage = extractCoverImage(rawWithGroup)
  const extractedImages = extractImageUrls(rawWithGroup)

  // Get fallback image (deterministic based on tour data)
  const fallbackImage = getFallbackImageForTour({
    vibeId: (raw as any).vibeId || null,
    groupCode: groupId || null,
    code: raw.code || id,
    slug,
    title: raw.name || raw.title || '',
    description: (raw as any).desc || (raw as any).description || '',
    shortDescription: (raw as any).shortDesc || (raw as any).shortDescription || '',
  })

  // Always provide an image (real or fallback)
  // Ensure coverImage is always a valid absolute URL (not a filename)
  const coverImage = extractedCoverImage || fallbackImage
  const images = extractedImages.length > 0 ? extractedImages : [fallbackImage]

  // Backwards compatibility: set image/imageUrl for existing UI components
  const image = coverImage
  const imageUrl = coverImage
  const imageFilename = raw.image && typeof raw.image === 'string' && raw.image.trim().length > 0
    ? String(raw.image).trim()
    : null

  // Assign vibe ID using automatic mapping
  const assignedVibeId = assignVibeId(rawWithGroup)

  if (process.env.NODE_ENV === 'development') {
    console.log('[VIBE_CHECK]', {
      code: raw.code || id,
      title: raw.name || raw.title || '',
      category: (raw as any).category || (rawWithGroup as any).category || null,
      vibeId: assignedVibeId,
    })
  }

  return {
    id,
    slug,
    title: raw.name || raw.title || '',
    description: (raw as any).desc || (raw as any).description || '',
    shortDescription: (raw as any).shortDesc || (raw as any).shortDescription || '',
    price,
    currency: (raw as any).currency || 'EUR',
    coverImage, // Always has a value (real or fallback)
    images, // Always has at least one image (real or fallback)
    image, // Backwards compatibility
    imageUrl, // Backwards compatibility
    imageFilename, // Backwards compatibility
    vibeId: assignedVibeId, // Automatically assigned based on classification/keywords
    duration: (raw as any).duration || null,
    availabilityHint,
    _raw: rawWithGroup, // Keep complete raw object with group info
  }
}

/**
 * Deduplicate activities by event code and normalize to Experience format
 */
function deduplicateAndNormalize(items: AtlanticoEventDetails[], eventToGroupMap: Map<string, string>): any[] {
  const seen = new Set<string>()
  const result: any[] = []

  for (const item of items) {
    // Use raw.code as primary key for deduplication
    const key = item.code || (item as any).id || (item as any).eventCode || JSON.stringify(item)
    
    if (typeof key === 'string' && !seen.has(key)) {
      seen.add(key)
      // Get groupId for this event code
      const groupId = eventToGroupMap.get(key)
      // Normalize to Experience format with group info
      result.push(normalizeToExperience(item, groupId))
    }
  }

  return result
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { lang } = await params
    const config = getAtlanticoConfig()

    // Check configuration
    if (!config.isValid) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: config.error || 'Atlantico API configuration is invalid',
          total: 0,
          groupsUsed: [],
          items: [],
        },
        { status: 500 }
      )
    }

    // Validate lang
    if (!lang || typeof lang !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'lang is required',
          total: 0,
          groupsUsed: [],
          items: [],
        },
        { status: 400 }
      )
    }

    // Get candidate group IDs
    const candidateGroupIds = getCandidateGroupIds()
    
    // DEV log: show which groupIds are being used
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[CATALOG] using groupIds:',
        candidateGroupIds.length,
        candidateGroupIds.slice(0, 10),
        candidateGroupIds.length > 10 ? '...' : ''
      )
    }
    
    // Fetch all groups with concurrency control
    const groupResults = await Promise.all(
      candidateGroupIds.map((groupId) =>
        limiter.execute(async () => {
          const group = await fetchGroupDetails(groupId, lang)
          return { groupId, group }
        })
      )
    )

    // Extract event codes from all groups, tracking which group each event came from
    const allEventCodes: string[] = []
    const eventToGroupMap = new Map<string, string>() // eventCode -> groupId
    const groupsUsed: string[] = []
    let groupsEmpty = 0
    let groupsError = 0

    for (const { groupId, group } of groupResults) {
      if (!group) {
        groupsError++
        continue
      }

      const eventCodes = extractEventCodes(group)
      if (eventCodes.length > 0) {
        groupsUsed.push(groupId)
        allEventCodes.push(...eventCodes)
        // Map each event code to its source group
        for (const eventCode of eventCodes) {
          eventToGroupMap.set(eventCode, groupId)
        }
      } else {
        groupsEmpty++
      }
    }

    // Deduplicate event codes
    const uniqueEventCodes = Array.from(new Set(allEventCodes))

    // Fetch all event details with concurrency control
    const eventLimiter = new ConcurrencyLimiter(5) // Max 5 concurrent event fetches
    const eventResults = await Promise.all(
      uniqueEventCodes.map((eventCode) =>
        eventLimiter.execute(async () => {
          const event = await fetchEventDetails(eventCode, lang)
          return event
        })
      )
    )

    // Filter out null results and deduplicate + normalize
    const validEvents = eventResults.filter((event): event is AtlanticoEventDetails => event !== null)
    const normalized = deduplicateAndNormalize(validEvents, eventToGroupMap)
    
    // Load curation stats (DEV only)
    let curationStats: { total: number; curatedCount: number; enabledCount: number } | null = null
    if (process.env.NODE_ENV === 'development') {
      try {
        const { loadCuration } = await import('@/lib/vibes/curation')
        const curatedRows = await loadCuration()
        const curatedCount = Object.keys(curatedRows).length
        const enabledCount = Object.values(curatedRows).filter((row: any) => row.enabled !== false).length
        
        curationStats = {
          total: normalized.length,
          curatedCount,
          enabledCount,
        }
      } catch (err) {
        // Silently fail if Supabase is not configured
        curationStats = {
          total: normalized.length,
          curatedCount: 0,
          enabledCount: 0,
        }
      }
    }

    // DEV: Collect vibe assignment statistics
    let vibeStats: {
      total: number
      byVibeId: Record<string, number>
      byMethod: { category: number; keywords: number; default: number }
    } | null = null
    
    if (process.env.NODE_ENV === 'development') {
      const { getAssignmentMethod } = await import('@/lib/vibes/assignVibe')
      const stats = {
        total: normalized.length,
        byVibeId: {} as Record<string, number>,
        byMethod: { category: 0, keywords: 0, default: 0 },
      }
      
      for (const item of normalized) {
        // Count by vibeId
        const vibeId = item.vibeId || 'unknown'
        stats.byVibeId[vibeId] = (stats.byVibeId[vibeId] || 0) + 1
        
      // Count by assignment method
      const method = getAssignmentMethod(item)
      if (method === 'category' || method === 'keywords' || method === 'default') {
        stats.byMethod[method]++
      }
      }
      
      vibeStats = stats
    }

    const duration = Date.now() - startTime

    // Image audit in DEV (max 30 samples to avoid too many requests)
    let imageAudit: {
      totalItems: number
      withImage: number
      withoutImage: number
      sampleChecked: number
      sampleOk: number
      sample404: number
      sampleOther: number
    } | null = null

    if (process.env.NODE_ENV === 'development') {
      const withImage = normalized.filter((item) => item.image !== null && item.image !== undefined).length
      const withoutImage = normalized.length - withImage
      
      // Sample max 30 images for checking
      const itemsWithImage = normalized.filter((item) => item.image).slice(0, 30)
      let sampleChecked = 0
      let sampleOk = 0
      let sample404 = 0
      let sampleOther = 0

      // Check images in parallel (with concurrency limit)
      const imageLimiter = new ConcurrencyLimiter(5) // Max 5 concurrent image checks
      const checkPromises = itemsWithImage.map((item) =>
        imageLimiter.execute(async () => {
          if (!item.image) return
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000)
          
          try {
            const response = await fetch(item.image, {
              method: 'GET',
              headers: { Range: 'bytes=0-0' }, // Only request first byte
              signal: controller.signal,
            })
            
            clearTimeout(timeoutId)
            sampleChecked++
            
            if (response.status === 200 || response.status === 206) {
              sampleOk++
            } else if (response.status === 404) {
              sample404++
            } else {
              sampleOther++
            }
          } catch (err) {
            clearTimeout(timeoutId)
            sampleChecked++
            sampleOther++
          }
        })
      )

      await Promise.all(checkPromises)

      imageAudit = {
        totalItems: normalized.length,
        withImage,
        withoutImage,
        sampleChecked,
        sampleOk,
        sample404,
        sampleOther,
      }
    }

    // Log summary in dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[CATALOG]', {
        lang,
        groupsTotal: candidateGroupIds.length,
        groupsUsed: groupsUsed.length,
        groupsEmpty,
        groupsError,
        eventCodes: uniqueEventCodes.length,
        items: normalized.length,
        duration: `${duration}ms`,
      })

      if (imageAudit) {
        console.log('[CATALOG_IMAGE_AUDIT]', imageAudit)
      }

      // Log DEV UNIQUE: distribution des vibes
      if (process.env.NODE_ENV === 'development') {
        const byVibeId: Record<string, number> = {}
        let total = 0
        
        normalized.forEach((item) => {
          const vibeId = item.vibeId || 'unknown'
          byVibeId[vibeId] = (byVibeId[vibeId] || 0) + 1
          total++
        })
        
        console.log('[CATALOG_VIBE_MAPPING]', { total, byVibeId })
      }

      // Log curation stats (DEV only)
      if (curationStats) {
        console.log('[CURATION_STATS]', curationStats)
      }

      // Log sample item (first one) for debugging
      if (normalized.length > 0) {
        const sample = normalized[0]
        const raw = sample._raw || {}
        
        // Construct image URL for logging
        const ATLANTICO_IMAGE_BASE_URL = 'https://static.atlantico-excursiones.com/images'
        const img = raw.image
          ? `${ATLANTICO_IMAGE_BASE_URL}/${encodeURIComponent(String(raw.image).trim())}`
          : null
        
        console.log('[CATALOG_SAMPLE]', {
          code: raw.code || sample.id,
          name: raw.name || raw.title || sample.title,
          rawImage: raw.image,
          imageFilename: sample.imageFilename,
          normalizedImage: sample.image,
          constructedImageUrl: img,
          priceA: (raw as any).priceA,
          priceS: (raw as any).priceS,
          priceC: (raw as any).priceC,
          price: (raw as any).price || sample.price,
        })
        
        // Test HEAD request on constructed image URL (DEV only)
        if (process.env.NODE_ENV === 'development' && img) {
          const headController = new AbortController()
          const headTimeoutId = setTimeout(() => headController.abort(), 3000) // 3s timeout
          
          fetch(img, {
            method: 'HEAD',
            signal: headController.signal,
          })
            .then((headResponse) => {
              clearTimeout(headTimeoutId)
              console.log('[CATALOG_IMAGE_HEAD]', {
                url: img,
                status: headResponse.status,
                statusText: headResponse.statusText,
              })
            })
            .catch((err) => {
              clearTimeout(headTimeoutId)
              // If HEAD fails, try GET (but don't download body)
              const getController = new AbortController()
              const getTimeoutId = setTimeout(() => getController.abort(), 3000)
              
              fetch(img, {
                method: 'GET',
                signal: getController.signal,
                headers: { Range: 'bytes=0-0' }, // Only request first byte
              })
                .then((getResponse) => {
                  clearTimeout(getTimeoutId)
                  console.log('[CATALOG_IMAGE_HEAD]', {
                    url: img,
                    status: getResponse.status,
                    statusText: getResponse.statusText,
                    method: 'GET (HEAD fallback)',
                  })
                })
                .catch((getErr) => {
                  clearTimeout(getTimeoutId)
                  console.log('[CATALOG_IMAGE_HEAD]', {
                    url: img,
                    error: getErr instanceof Error ? getErr.message : 'Unknown error',
                    method: 'GET (HEAD fallback)',
                  })
                })
            })
        }
      }
    }

    return NextResponse.json(
      {
        total: normalized.length,
        groupsUsed: groupsUsed.sort((a, b) => parseInt(a) - parseInt(b)),
        items: normalized,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600', // 6 hours cache
        },
      }
    )
  } catch (error) {
    console.error('[CATALOG] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to build catalog',
        message: error instanceof Error ? error.message : 'Unknown error',
        total: 0,
        groupsUsed: [],
        items: [],
      },
      { status: 500 }
    )
  }
}

