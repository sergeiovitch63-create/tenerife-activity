/**
 * Atlantico Experience Repository
 * 
 * Implements ExperienceRepository using internal Next.js API routes.
 * Fetches data from Atlantico API via /api/atlantico/group and /api/atlantico/event.
 * 
 * TODO: LEGACY REPOSITORY - Scheduled for removal.
 * Pages should migrate to Super Catalog (/api/catalog/full and /api/catalog/item).
 * This repository is kept temporarily for backward compatibility with other pages.
 */

import type { Experience } from '@/core/entities/experience'
import type { ExperienceRepository } from '@/core/ports/experience.repository'
import {
  extractEventCodes,
  mapAtlanticoEventToActivityLite,
  type AtlanticoGroupDetails,
  type AtlanticoEventDetails,
} from '@/lib/atlantico/mappers'
import { assignVibeId } from '@/lib/vibes/assignVibe'
import { buildAtlanticoImageUrl } from '@/lib/atlantico/client'

// Default group ID (configurable via env)
const DEFAULT_GROUP_ID = process.env.ATLANTICO_DEFAULT_GROUP_ID || '31'
const DEFAULT_LANG = 'ENG'
const MAX_CONCURRENT_REQUESTS = 8

/**
 * Simple concurrency pool to limit parallel requests
 */
class RequestPool {
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

const requestPool = new RequestPool(MAX_CONCURRENT_REQUESTS)

/**
 * Fetch data from internal Next.js API route
 * Uses absolute URL in server-side context
 */
async function fetchInternalAPI<T>(endpoint: string): Promise<T> {
  // In server-side Next.js, we need absolute URL
  // Use NEXT_PUBLIC_APP_URL if set, otherwise default to localhost for dev
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const url = `${baseUrl}${endpoint}`
  const response = await fetch(url, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Map ActivityLite to Experience domain entity
 * Creates a minimal Experience compatible with the domain interface
 */
function mapActivityLiteToExperience(
  activityLite: { eventCode: string; name: string; times: string[]; raw: unknown },
  index: number,
  groupId?: string,
  rawWithGroupOverride?: any
): Experience {
  const raw = activityLite.raw as AtlanticoEventDetails

  // Use provided rawWithGroup or build it (merge event + group data)
  // This ensures category from group is available for vibe assignment
  const rawWithGroup = rawWithGroupOverride || (groupId
    ? { ...raw, group: groupId, groupCode: groupId, _raw: raw._raw ?? raw }
    : { ...raw, _raw: raw._raw ?? raw })

  // Extract additional fields from raw data if available
  const price = typeof raw.price === 'number' ? raw.price : 0
  const currency = typeof raw.currency === 'string' ? raw.currency : 'EUR'
  const description =
    typeof raw.description === 'string'
      ? raw.description
      : typeof raw.shortDescription === 'string'
        ? raw.shortDescription
        : activityLite.name

  // Generate slug from event code (sanitize)
  const slug = activityLite.eventCode.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  // Use event code as ID (or fallback to index-based)
  const id = activityLite.eventCode || `atlantico-${index}`

  // Extract optional fields
  const location = typeof raw.location === 'string' ? raw.location : undefined
  const duration = typeof raw.duration === 'string' ? raw.duration : undefined
  const rating = typeof raw.rating === 'number' ? raw.rating : undefined
  const reviewCount = typeof raw.reviewCount === 'number' ? raw.reviewCount : undefined

  // Convert times array to availability hint
  const availabilityHint =
    activityLite.times.length > 0
      ? `Available at: ${activityLite.times.join(', ')}`
      : undefined

  // Extract highlights/included from raw if available
  const highlights = Array.isArray(raw.highlights) ? raw.highlights : undefined
  const included = Array.isArray(raw.included) ? raw.included : undefined

  // Extract image from raw (try multiple field names)
  // Priority: raw.image -> rawWithGroup.image -> rawWithGroup.groupDetails?.image -> rawWithGroup.groupList?.image
  let imageUrl: string | undefined = undefined
  const imageCandidate =
    raw.image ??
    (rawWithGroup as any)?.image ??
    (rawWithGroup as any)?.groupDetails?.image ??
    (rawWithGroup as any)?.groupList?.image ??
    null

  if (imageCandidate && typeof imageCandidate === 'string' && imageCandidate.trim().length > 0) {
    // Build full URL using buildAtlanticoImageUrl
    imageUrl = buildAtlanticoImageUrl(imageCandidate) || undefined
  }

  // Extract category code for logging
  const extractedCategoryCode = rawWithGroup.category ?? 
                                rawWithGroup.categoryCode ?? 
                                rawWithGroup.classification ?? 
                                rawWithGroup.classificationCode ?? 
                                (rawWithGroup as any)?._raw?.category ?? 
                                (rawWithGroup as any)?._raw?.categoryCode ?? 
                                null

  // Assign vibe ID using automatic mapping (pass rawWithGroup to include group data)
  const assignedVibeId = assignVibeId(rawWithGroup)

  return {
    id,
    slug,
    title: activityLite.name,
    description,
    shortDescription: typeof raw.shortDescription === 'string' ? raw.shortDescription : undefined,
    price,
    currency,
    imageUrl, // Mapped from raw.image or rawWithGroup.image
    imageUrls: imageUrl ? [imageUrl] : undefined, // For compatibility with components that expect array
    vibeId: assignedVibeId, // Automatically assigned based on classification/keywords
    location,
    duration,
    rating,
    reviewCount,
    highlights,
    included,
    availabilityHint,
    // Attach raw data for reference (not part of interface but safe to add)
    // Use rawWithGroup to preserve group info
    ...(rawWithGroup && { _raw: rawWithGroup }),
  } as Experience
}

/**
 * Fetch group details and extract event codes
 */
async function fetchGroupEventCodes(groupId: string, lang: string): Promise<string[]> {
  try {
    const group = await fetchInternalAPI<AtlanticoGroupDetails>(
      `/api/atlantico/group/${groupId}/${lang}`
    )
    return extractEventCodes(group)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[AtlanticoExperienceRepository] Failed to fetch group ${groupId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
    return []
  }
}

/**
 * Fetch event details and map to Experience
 */
async function fetchEventAsExperience(
  eventCode: string,
  lang: string,
  index: number,
  groupId?: string,
  groupData?: AtlanticoGroupDetails
): Promise<Experience | null> {
  try {
    const event = await fetchInternalAPI<AtlanticoEventDetails>(
      `/api/atlantico/event/${eventCode}/${lang}`
    )

    const activityLite = mapAtlanticoEventToActivityLite(event)
    
    // Build rawWithGroup: merge event + group data for rich vibe assignment
    const rawWithGroup = groupData && groupId
      ? { ...event, ...groupData, group: groupId, groupCode: groupId, _raw: event._raw ?? event }
      : groupId
        ? { ...event, group: groupId, groupCode: groupId, _raw: event._raw ?? event }
        : { ...event, _raw: event._raw ?? event }
    
    // Pass rawWithGroup to mapping function
    return mapActivityLiteToExperience(activityLite, index, groupId, rawWithGroup)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[AtlanticoExperienceRepository] Failed to fetch event ${eventCode}:`,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
    return null
  }
}

/**
 * Atlantico Experience Repository implementation
 */
export class AtlanticoExperienceRepository implements ExperienceRepository {
  private groupId: string
  private lang: string

  constructor(groupId?: string, lang?: string) {
    this.groupId = groupId || DEFAULT_GROUP_ID
    this.lang = lang || DEFAULT_LANG
  }

  /**
   * Get list of candidate group IDs (same logic as catalog route)
   */
  private getCandidateGroupIds(): string[] {
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
   * Find all experiences
   * Fetches ALL groups from catalog, then hydrates all events
   */
  async findAll(): Promise<Experience[]> {
    // Get all candidate group IDs (same logic as catalog route)
    const groupIdsUsed = this.getCandidateGroupIds()

    // Log DEV unique
    if (process.env.NODE_ENV === 'development') {
      console.log('[REPO_GROUPS]', { groupIdsUsed, count: groupIdsUsed.length })
    }

    // Fetch all groups with concurrency control
    const allEventCodes: string[] = []
    const eventToGroupMap = new Map<string, string>() // eventCode -> groupId
    const groupDataMap = new Map<string, AtlanticoGroupDetails>() // groupId -> groupData

    const groupResults = await Promise.all(
      groupIdsUsed.map((groupId) =>
        requestPool.execute(async () => {
          try {
            const groupData = await fetchInternalAPI<AtlanticoGroupDetails>(
              `/api/atlantico/group/${groupId}/${this.lang}`
            )
            if (groupData) {
              const eventCodes = extractEventCodes(groupData)
              if (eventCodes.length > 0) {
                groupDataMap.set(groupId, groupData)
                allEventCodes.push(...eventCodes)
                // Map each event code to its source group
                for (const eventCode of eventCodes) {
                  eventToGroupMap.set(eventCode, groupId)
                }
              }
            }
          } catch (error) {
            // Silently ignore errors (timeout, network, etc.)
          }
        })
      )
    )

    // Deduplicate event codes
    const uniqueEventCodes = Array.from(new Set(allEventCodes))

    if (uniqueEventCodes.length === 0) {
      return []
    }

    // Fetch all events with concurrency control
    const experiences = await Promise.all(
      uniqueEventCodes.map((code, index) =>
        requestPool.execute(() => {
          const groupId = eventToGroupMap.get(code)
          const groupData = groupId ? groupDataMap.get(groupId) : undefined
          return fetchEventAsExperience(code, this.lang, index, groupId, groupData)
        })
      )
    )

    // Filter out null results (failed fetches)
    const validExperiences = experiences.filter((exp): exp is Experience => exp !== null)

    // DEV: Log vibe assignment for first 5 items
    if (process.env.NODE_ENV === 'development' && validExperiences.length > 0) {
      validExperiences.slice(0, 5).forEach((exp) => {
        const raw = (exp as any)._raw || {}
        const extractedCategoryCode = raw.category ?? 
                                      raw.categoryCode ?? 
                                      raw.classification ?? 
                                      raw.classificationCode ?? 
                                      null
        console.log('[REPO_VIBE_ASSIGN]', {
          code: raw.code ?? raw.eventCode ?? raw.id ?? exp.id,
          category: extractedCategoryCode,
          assignedVibeId: exp.vibeId,
        })
      })
    }

    return validExperiences
  }

  /**
   * Find experience by slug
   * Note: slug is derived from event code, so we need to reverse-engineer it
   */
  async findBySlug(slug: string): Promise<Experience | null> {
    // Try to extract event code from slug (reverse the slug generation)
    // Slug format: event-code -> eventcode (lowercase, hyphens removed)
    // We'll need to fetch all and search, or maintain a mapping
    // For now, fetch all and filter (not optimal but works)
    const all = await this.findAll()
    return all.find((exp) => exp.slug === slug) || null
  }

  /**
   * Find experience by ID
   * ID is the event code
   */
  async findById(id: string): Promise<Experience | null> {
    // Try direct fetch first (assuming ID is event code)
    const experience = await requestPool.execute(() =>
      fetchEventAsExperience(id, this.lang, 0, this.groupId)
    )
    return experience
  }

  /**
   * Find experiences by vibe ID
   * Note: Experiences are automatically assigned vibe IDs based on classification/keywords
   * See src/lib/vibes/assignVibe.ts for mapping logic
   */
  async findByVibeId(vibeId: string): Promise<Experience[]> {
    const all = await this.findAll()
    return all.filter((exp) => exp.vibeId === vibeId)
  }

  /**
   * Search experiences by query
   * Searches in title, description, and location
   */
  async search(query: string): Promise<Experience[]> {
    const all = await this.findAll()
    const lowerQuery = query.toLowerCase()

    return all.filter(
      (exp) =>
        exp.title.toLowerCase().includes(lowerQuery) ||
        exp.description.toLowerCase().includes(lowerQuery) ||
        exp.shortDescription?.toLowerCase().includes(lowerQuery) ||
        exp.location?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Find must-see experiences
   * Returns first 6 experiences (can be enhanced with curation logic)
   */
  async findMustSee(): Promise<Experience[]> {
    const all = await this.findAll()
    // Return first 6 as must-see (can be enhanced with proper curation)
    return all.slice(0, 6)
  }
}

