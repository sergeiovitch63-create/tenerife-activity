/**
 * Attribution storage utilities
 * Uses sessionStorage with memory fallback
 */

import type { Attribution, UTMParams } from './types'

const STORAGE_KEY = 'tenerife_attribution'
const MEMORY_FALLBACK_KEY = '__attribution_memory'

// Memory fallback (for SSR or when sessionStorage unavailable)
let memoryStore: Attribution | null = null

/**
 * Check if sessionStorage is available
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const test = '__storage_test__'
    sessionStorage.setItem(test, test)
    sessionStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Get attribution from storage
 */
export function getAttribution(): Attribution | null {
  if (isStorageAvailable()) {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as Attribution
      }
    } catch {
      // Fallback to memory
    }
  }

  // Fallback to memory
  return memoryStore
}

/**
 * Save attribution to storage
 */
export function saveAttribution(attribution: Attribution): void {
  if (isStorageAvailable()) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
      return
    } catch {
      // Fallback to memory
    }
  }

  // Fallback to memory
  memoryStore = attribution
  if (typeof window !== 'undefined') {
    ;(window as any)[MEMORY_FALLBACK_KEY] = attribution
  }
}

/**
 * Clear attribution
 */
export function clearAttribution(): void {
  if (isStorageAvailable()) {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }

  memoryStore = null
  if (typeof window !== 'undefined') {
    delete (window as any)[MEMORY_FALLBACK_KEY]
  }
}

/**
 * Merge UTM params (don't overwrite existing with undefined)
 */
function mergeUTM(existing?: UTMParams, incoming?: UTMParams): UTMParams | undefined {
  if (!existing && !incoming) return undefined
  if (!existing) return incoming
  if (!incoming) return existing

  return {
    source: incoming.source ?? existing.source,
    medium: incoming.medium ?? existing.medium,
    campaign: incoming.campaign ?? existing.campaign,
    content: incoming.content ?? existing.content,
    term: incoming.term ?? existing.term,
  }
}

/**
 * Set attribution from URL search params
 * Merges with existing attribution (first touch preserved)
 * Accepts both URLSearchParams and ReadonlyURLSearchParams (from Next.js useSearchParams)
 */
export function setAttributionFromUrl(searchParams: URLSearchParams | { get: (key: string) => string | null }): Attribution | null {
  const now = Date.now()
  const existing = getAttribution()

  // Extract click_id
  const clickId = searchParams.get('click_id') || undefined

  // Extract UTM params
  const utm: UTMParams | undefined = (() => {
    const source = searchParams.get('utm_source') || undefined
    const medium = searchParams.get('utm_medium') || undefined
    const campaign = searchParams.get('utm_campaign') || undefined
    const content = searchParams.get('utm_content') || undefined
    const term = searchParams.get('utm_term') || undefined

    if (!source && !medium && !campaign && !content && !term) {
      return undefined
    }

    return { source, medium, campaign, content, term }
  })()

  // If no new attribution data, return existing
  if (!clickId && !utm) {
    return existing
  }

  // Create or update attribution
  const attribution: Attribution = existing
    ? {
        // Preserve first touch timestamp
        firstTouchTimestamp: existing.firstTouchTimestamp,
        // Update last touch
        lastTouchTimestamp: now,
        // Merge click_id (new takes precedence if provided)
        clickId: clickId ?? existing.clickId,
        // Merge UTM (don't overwrite with undefined)
        utm: mergeUTM(existing.utm, utm),
      }
    : {
        // First touch
        firstTouchTimestamp: now,
        lastTouchTimestamp: now,
        clickId,
        utm,
      }

  saveAttribution(attribution)
  return attribution
}

