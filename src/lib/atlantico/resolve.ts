/**
 * Activity Resolver
 * 
 * Resolves activity slug to Atlántico t_group and t_id
 * Handles both numeric slugs (group IDs) and named slugs (mapped to groups)
 */

import { notFound } from 'next/navigation'
import { readFileSync } from 'fs'
import { join } from 'path'
import { groupDetails, eventDetails } from './client-wrapper'
import { mapLocaleToAtlanticoLangUpper } from './lang'
import { extractEventCodes } from './mappers'
import type { AtlanticoGroupDetails, AtlanticoEventDetails } from './mappers'

export type ActivityResolved = {
  t_group: string // tour/group code
  t_id: string // event code (default selected)
  events: Array<{ t_id: string; title: string }> // options list (si multiples)
  language: string // mapped locale -> atlantico language param
}

/**
 * Check if a string is a numeric ID
 */
function isNumericId(slug: string): boolean {
  return /^\d+$/.test(slug)
}

/**
 * Load curation mapping (if available)
 * Returns mapping of slug -> group ID
 */
function loadCurationMapping(): Record<string, string> {
  try {
    // Read curation.json from data directory
    const curationPath = join(process.cwd(), 'data', 'curation.json')
    const curationContent = readFileSync(curationPath, 'utf-8')
    const curation = JSON.parse(curationContent)
    const mapping: Record<string, string> = {}
    
    if (curation && typeof curation === 'object') {
      for (const [key, value] of Object.entries(curation)) {
        if (value && typeof value === 'object' && 'experience_id' in value) {
          const expId = String((value as any).experience_id)
          // Map both the numeric ID and any slug to the group
          mapping[key] = expId
          mapping[expId] = expId
        }
      }
    }
    
    return mapping
  } catch {
    // Curation not available, return empty mapping
    return {}
  }
}

/**
 * Resolve activity from slug
 * 
 * @param slug - Activity slug (numeric ID or named slug)
 * @param locale - Locale code (e.g., 'en', 'es')
 * @param eventParam - Optional query param for specific event selection
 * @returns ActivityResolved with t_group, t_id, events list, and language
 * @throws notFound() if activity cannot be resolved
 */
export async function resolveActivity(
  slug: string,
  locale: string,
  eventParam?: string | null
): Promise<ActivityResolved> {
  const language = mapLocaleToAtlanticoLangUpper(locale)
  
  // Strategy 1: If slug is numeric, treat as t_group
  if (isNumericId(slug)) {
    const t_group = slug
    
    try {
      // Fetch group details to get events
      const groupData = await groupDetails(t_group, language) as AtlanticoGroupDetails
      
      // Extract event codes
      const eventCodes = extractEventCodes(groupData)
      
      if (eventCodes.length === 0) {
        // No events found in group
        notFound()
      }
      
      // Determine default t_id
      let defaultTId: string
      if (eventParam && eventCodes.includes(eventParam)) {
        // Use event from query param if valid
        defaultTId = eventParam
      } else {
        // Use first event as default
        defaultTId = eventCodes[0]
      }
      
      // Fetch event details to get titles
      const eventsWithTitles: Array<{ t_id: string; title: string }> = []
      
      // Fetch details for all events (with concurrency limit)
      const eventPromises = eventCodes.slice(0, 10).map(async (eventCode) => {
        try {
          const eventData = await eventDetails(eventCode, language) as AtlanticoEventDetails
          const title = eventData.name || eventData.title || eventCode
          return { t_id: eventCode, title: String(title) }
        } catch {
          // If event details fail, use event code as title
          return { t_id: eventCode, title: eventCode }
        }
      })
      
      const events = await Promise.all(eventPromises)
      eventsWithTitles.push(...events)
      
      return {
        t_group,
        t_id: defaultTId,
        events: eventsWithTitles,
        language,
      }
    } catch (error) {
      // Group not found or API error
      if (process.env.NODE_ENV === 'development') {
        console.error('[RESOLVE] Failed to resolve numeric slug:', slug, error)
      }
      notFound()
    }
  }
  
  // Strategy 2: Named slug - try to find in curation mapping
  try {
    const curationMapping = loadCurationMapping()
    
    // Check if slug exists in curation
    if (curationMapping[slug]) {
      const t_group = curationMapping[slug]
      // Recursively resolve using the numeric group ID
      return resolveActivity(t_group, locale, eventParam)
    }
    
    // Try to find in catalog (if available)
    // This would require loading the catalog, which might be heavy
    // For now, if not found in curation, return 404
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[RESOLVE] Slug not found in mapping:', slug)
    }
    
    notFound()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[RESOLVE] Error resolving named slug:', slug, error)
    }
    notFound()
  }
}

/**
 * Quick resolve (server-side only)
 * Returns t_group and t_id without full event list
 * Useful for lightweight operations
 */
export async function resolveActivityQuick(
  slug: string,
  locale: string
): Promise<{ t_group: string; t_id: string; language: string }> {
  const resolved = await resolveActivity(slug, locale)
  return {
    t_group: resolved.t_group,
    t_id: resolved.t_id,
    language: resolved.language,
  }
}

