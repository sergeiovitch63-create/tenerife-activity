/**
 * Simple in-memory cache for sync catalog data
 * Used to avoid blocking requests when API is slow/down
 */

interface CachedSyncData {
  items: unknown[]
  stats?: {
    classifications: number
    groups: number
    events: number
  }
  timestamp: number
  lang: string
}

const cache = new Map<string, CachedSyncData>()
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

/**
 * Get cached sync data for a language
 */
export function getCachedSync(lang: string): CachedSyncData | null {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[CACHE] getCachedSync called:', { lang, cacheSize: cache.size, cacheKeys: Array.from(cache.keys()) })
  }
  
  const cached = cache.get(lang)
  if (!cached) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CACHE] Cache miss:', { lang })
    }
    return null
  }

  // Check if cache is expired
  const age = Date.now() - cached.timestamp
  if (age > CACHE_TTL_MS) {
    cache.delete(lang)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CACHE] Cache expired:', { lang, age: `${Math.round(age / 1000)}s`, ttl: `${CACHE_TTL_MS / 1000}s` })
    }
    return null
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[CACHE] Cache hit:', { 
      lang, 
      itemsCount: cached.items.length, 
      age: `${Math.round(age / 1000)}s`,
      stats: cached.stats,
    })
  }

  return cached
}

/**
 * Set cached sync data for a language
 */
export function setCachedSync(lang: string, items: unknown[], stats?: { classifications: number; groups: number; events: number }): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[CACHE] setCachedSync called:', { 
      lang, 
      itemsCount: items.length, 
      stats,
      cacheKey: lang, // Clé exacte utilisée
      cacheLocation: 'memory (Map<string, CachedSyncData>)',
    })
  }
  
  cache.set(lang, {
    items,
    stats,
    timestamp: Date.now(),
    lang,
  })
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[CACHE] Cache set successfully:', { 
      lang, 
      cacheSize: cache.size,
      allCacheKeys: Array.from(cache.keys()),
    })
  }
}

/**
 * Check if cache exists and is valid
 */
export function hasCachedSync(lang: string): boolean {
  return getCachedSync(lang) !== null
}

