'use client'

import { useEffect } from 'react'
import { prefetchResource } from '@/lib/mobile/prefetch'

/**
 * Prefetch critical routes for instant navigation
 * Only prefetches when idle to avoid blocking critical resources
 */
export function PrefetchLinks() {
  useEffect(() => {
    // Use requestIdleCallback for non-critical prefetching
    const prefetchCriticalRoutes = () => {
      const routes = ['/get-inspired', '/must-see', '/contact']
      routes.forEach(route => {
        prefetchResource(route, 'document')
      })
    }

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(prefetchCriticalRoutes, { timeout: 2000 })
      return () => cancelIdleCallback(id)
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeout = setTimeout(prefetchCriticalRoutes, 2000)
      return () => clearTimeout(timeout)
    }
  }, [])

  return null
}

