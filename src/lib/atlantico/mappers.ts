/**
 * Atlantico API to Domain mappers
 * 
 * Minimal mapping layer to convert Atlantico API responses to simple domain objects.
 * This module provides lightweight mappers without forcing strict domain types.
 */

/**
 * Type for Atlantico group details response
 * Uses index signature to allow additional fields from API
 */
export type AtlanticoGroupDetails = {
  events?: string[] | null
  [key: string]: unknown
}

/**
 * Type for Atlantico event details response
 * Uses index signature to allow additional fields from API
 */
export type AtlanticoEventDetails = {
  code?: string
  name?: string
  title?: string
  times?: string[] | null
  id?: string
  [key: string]: unknown
}

/**
 * Lightweight activity representation for mapping
 * This is a minimal bridge between Atlantico API and domain layer
 */
export type ActivityLite = {
  eventCode: string
  name: string
  times: string[]
  raw: unknown
}

/**
 * Extract event codes from a group details response
 * 
 * Filters and normalizes event codes:
 * - Removes null/undefined/empty values
 * - Trims whitespace
 * - Removes duplicates
 * - Limits to 500 codes max (safety limit)
 * 
 * @param group - Atlantico group details response
 * @returns Array of unique, non-empty event codes
 */
export function extractEventCodes(group: AtlanticoGroupDetails): string[] {
  const events = group.events

  // Handle null, undefined, or non-array
  if (!Array.isArray(events)) {
    return []
  }

  // Filter, trim, and deduplicate
  const codes = new Set<string>()
  for (const event of events) {
    if (typeof event === 'string') {
      const trimmed = event.trim()
      if (trimmed.length > 0) {
        codes.add(trimmed)
        // Safety limit: stop at 500 codes
        if (codes.size >= 500) {
          break
        }
      }
    }
  }

  return Array.from(codes)
}

/**
 * Map Atlantico event details to ActivityLite
 * 
 * Extracts essential fields from event details:
 * - name: event.name ?? event.title ?? "Untitled activity"
 * - eventCode: event.code (required, throws if missing)
 * - times: event.times if array, else []
 * - raw: full event object for reference
 * 
 * @param event - Atlantico event details response
 * @returns ActivityLite object
 * @throws Error if event.code is missing or invalid
 */
export function mapAtlanticoEventToActivityLite(
  event: AtlanticoEventDetails
): ActivityLite {
  // Extract event code (required)
  const eventCode = event.code
  if (!eventCode || typeof eventCode !== 'string' || eventCode.trim().length === 0) {
    throw new Error('Missing event code')
  }

  // Extract name (fallback chain)
  let name = 'Untitled activity'
  if (event.name && typeof event.name === 'string') {
    const trimmed = event.name.trim()
    if (trimmed.length > 0) {
      name = trimmed
    }
  }
  if (name === 'Untitled activity' && event.title && typeof event.title === 'string') {
    const trimmed = event.title.trim()
    if (trimmed.length > 0) {
      name = trimmed
    }
  }

  // Extract times (ensure array)
  let times: string[] = []
  if (Array.isArray(event.times)) {
    times = event.times
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  }

  return {
    eventCode: eventCode.trim(),
    name: name.trim(),
    times,
    raw: event,
  }
}

/**
 * Map Atlantico group details to array of ActivityLite placeholders
 * 
 * Creates placeholder ActivityLite objects from event codes in a group.
 * These are "skeleton" activities that can be hydrated later with full event details.
 * 
 * Useful for:
 * - Listing activities in a group before fetching full details
 * - Showing loading states
 * - Pre-populating lists
 * 
 * @param group - Atlantico group details response
 * @returns Array of ActivityLite placeholders (or empty array)
 */
export function mapAtlanticoGroupToActivityLites(
  group: AtlanticoGroupDetails
): ActivityLite[] {
  const eventCodes = extractEventCodes(group)

  // Create placeholder activities
  return eventCodes.map((eventCode) => ({
    eventCode,
    name: '(loading)',
    times: [],
    raw: { eventCode, _placeholder: true },
  }))
}

/**
 * Quick sanity check examples
 * 
 * These functions demonstrate usage and can be used for manual testing.
 */

/**
 * Example: Extract event codes from a group
 */
export function sanityCheckExtractEventCodes() {
  const group: AtlanticoGroupDetails = {
    events: ['EVT001', 'EVT002', '  EVT003  ', '', 'EVT001'], // duplicates, empty
    groupId: 'GRP123',
  }

  const codes = extractEventCodes(group)
  // Expected: ['EVT001', 'EVT002', 'EVT003']
  return codes
}

/**
 * Example: Map event details to ActivityLite
 */
export function sanityCheckMapEvent() {
  const event: AtlanticoEventDetails = {
    code: 'EVT001',
    name: 'Teide Sunset Tour',
    times: ['09:00', '14:00', '18:00'],
    price: 45,
  }

  const activity = mapAtlanticoEventToActivityLite(event)
  // Expected: { eventCode: 'EVT001', name: 'Teide Sunset Tour', times: ['09:00', '14:00', '18:00'], raw: event }
  return activity
}

/**
 * Example: Map event with fallback name
 */
export function sanityCheckMapEventFallback() {
  const event: AtlanticoEventDetails = {
    code: 'EVT002',
    // No name, but has title
    title: 'Siam Park Ticket',
    times: [],
  }

  const activity = mapAtlanticoEventToActivityLite(event)
  // Expected: { eventCode: 'EVT002', name: 'Siam Park Ticket', times: [], raw: event }
  return activity
}

/**
 * Example: Map group to placeholder activities
 */
export function sanityCheckMapGroup() {
  const group: AtlanticoGroupDetails = {
    events: ['EVT001', 'EVT002', 'EVT003'],
    groupName: 'Water Activities',
  }

  const activities = mapAtlanticoGroupToActivityLites(group)
  // Expected: [
  //   { eventCode: 'EVT001', name: '(loading)', times: [], raw: { eventCode: 'EVT001', _placeholder: true } },
  //   { eventCode: 'EVT002', name: '(loading)', times: [], raw: { eventCode: 'EVT002', _placeholder: true } },
  //   { eventCode: 'EVT003', name: '(loading)', times: [], raw: { eventCode: 'EVT003', _placeholder: true } }
  // ]
  return activities
}

/**
 * Example: Error case - missing event code
 */
export function sanityCheckMapEventError() {
  const event: AtlanticoEventDetails = {
    name: 'Some Activity',
    // Missing code - should throw
  }

  try {
    mapAtlanticoEventToActivityLite(event)
    return { error: null, message: 'Should have thrown' }
  } catch (error) {
    // Expected: Error('Missing event code')
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Usage examples in comments:
 * 
 * // 1. Extract event codes from group details
 * const groupResponse = await fetch('/api/atlantico/group/31/ENG')
 * const group: AtlanticoGroupDetails = await groupResponse.json()
 * const eventCodes = extractEventCodes(group)
 * 
 * // 2. Map event details to ActivityLite
 * const eventResponse = await fetch('/api/atlantico/event/1317/ENG')
 * const event: AtlanticoEventDetails = await eventResponse.json()
 * const activity = mapAtlanticoEventToActivityLite(event)
 * 
 * // 3. Create placeholder activities from group
 * const placeholders = mapAtlanticoGroupToActivityLites(group)
 * // Later, hydrate with full details:
 * // const fullActivities = await Promise.all(
 * //   placeholders.map(p => fetchEventDetails(p.eventCode).then(mapAtlanticoEventToActivityLite))
 * // )
 */

