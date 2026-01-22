/**
 * Event ID Resolver
 * 
 * Robustly resolves EventIds from Atlantico groupDetails response,
 * handling API inconsistencies (ids string CSV vs events array).
 */

/**
 * Resolve EventIds from groupDetails response
 * 
 * Handles multiple formats:
 * - groupDetails.events (array of strings)
 * - groupDetails.ids (string CSV like "2748,2749" or array)
 * 
 * @param groupDetails - Raw groupDetails response from Atlantico API
 * @returns Array of unique, trimmed EventId strings
 */
export function resolveEventIds(groupDetails: unknown): string[] {
  if (!groupDetails || typeof groupDetails !== 'object') {
    return []
  }

  const result = new Set<string>()

  // Priority 1: Check groupDetails.events (array)
  const events = (groupDetails as any).events
  if (Array.isArray(events)) {
    for (const event of events) {
      // Filter falsy values
      if (event === null || event === undefined || event === '') {
        continue
      }
      
      // Convert to string and trim
      const eventId = String(event).trim()
      if (eventId.length > 0) {
        result.add(eventId)
      }
    }
  }

  // Priority 2: Check groupDetails.ids
  const ids = (groupDetails as any).ids
  
  // If ids is a string (CSV format like "2748,2749")
  if (typeof ids === 'string' && ids.trim().length > 0) {
    const parts = ids.split(',')
    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed.length > 0) {
        result.add(trimmed)
      }
    }
  }
  // If ids is an array
  else if (Array.isArray(ids)) {
    for (const id of ids) {
      // Filter falsy values
      if (id === null || id === undefined || id === '') {
        continue
      }
      
      // Convert to string and trim
      const eventId = String(id).trim()
      if (eventId.length > 0) {
        result.add(eventId)
      }
    }
  }

  const resolved = Array.from(result).sort()

  // DEV log (non-production only)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[ATL_DEBUG] resolvedEventIds:', {
      count: resolved.length,
      values: resolved,
    })
  }

  return resolved
}











