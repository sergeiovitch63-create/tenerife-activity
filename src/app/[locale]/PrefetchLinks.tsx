'use client'

import { useEffect } from 'react'
import { prefetchResource } from '@/lib/mobile/prefetch'
import { usePathname } from '@/navigation'

/**
 * Aggressive prefetching for instant navigation
 * Prefetches all critical routes and likely next pages
 * Uses requestIdleCallback to avoid blocking critical resources
 */
export function PrefetchLinks() {
  const pathname = usePathname()
  
  useEffect(() => {
    // All critical routes that users frequently visit
    const criticalRoutes = [
      '/',
      '/inspired',
      '/must-see',
      '/contact',
      '/activite/theme-parks',
      '/activite/boat-trips-cruises',
      '/activite/shows-entertainment',
      '/activite/water-sports',
      '/activite/adventure-nature',
      '/activite/vip-tours',
      '/cart',
      '/checkout',
    ]
    
    // Routes that are likely to be visited next based on current page
    const contextualRoutes: Record<string, string[]> = {
      '/': [
        '/inspired',
        '/must-see',
        '/activite/theme-parks',
        '/activite/boat-trips-cruises',
      ],
      '/inspired': [
        '/must-see',
        '/activite/theme-parks',
      ],
      '/must-see': [
        '/activite/theme-parks',
        '/activite/boat-trips-cruises',
      ],
      '/activite/theme-parks': [
        '/activite/boat-trips-cruises',
        '/activite/shows-entertainment',
      ],
      '/cart': [
        '/checkout',
      ],
    }
    
    const prefetchRoutes = () => {
      // Always prefetch critical routes
      criticalRoutes.forEach(route => {
        prefetchResource(route, 'document')
      })
      
      // Prefetch contextual routes based on current page
      const contextual = contextualRoutes[pathname || '/']
      if (contextual) {
        contextual.forEach(route => {
          prefetchResource(route, 'document')
        })
      }
    }

    // Use requestIdleCallback for non-blocking prefetching
    if ('requestIdleCallback' in window) {
      // Start immediately with a short timeout
      const id = requestIdleCallback(prefetchRoutes, { timeout: 1000 })
      return () => cancelIdleCallback(id)
    } else {
      // Fallback: delay slightly to not block initial render
      const timeout = setTimeout(prefetchRoutes, 1000)
      return () => clearTimeout(timeout)
    }
  }, [pathname])

  return null
}

