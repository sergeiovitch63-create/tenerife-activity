/**
 * Simple in-memory cache with TTL for Atlantico API responses
 * 
 * Used to cache event-details and limits responses per eventId+lang+month
 * to avoid redundant API calls during availability preview loading.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private defaultTTL: number

  constructor(defaultTTLMs: number = 5 * 60 * 1000) {
    // Default: 5 minutes
    this.defaultTTL = defaultTTLMs
  }

  /**
   * Get cached value if not expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set cached value with TTL
   */
  set(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    })
  }

  /**
   * Delete cached value
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all expired entries
   */
  clearExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }
}

// Export singleton instances for different data types
export const eventDetailsCache = new SimpleCache<any>(5 * 60 * 1000) // 5 minutes
export const limitsCache = new SimpleCache<any>(2 * 60 * 1000) // 2 minutes (availability changes more frequently)

/**
 * Generate cache key for event-details
 */
export function getEventDetailsCacheKey(eventId: string, lang: string): string {
  return `event-details:${eventId}:${lang}`
}

/**
 * Generate cache key for limits
 */
export function getLimitsCacheKey(eventId: string, lang: string, month: string): string {
  return `limits:${eventId}:${lang}:${month}`
}











