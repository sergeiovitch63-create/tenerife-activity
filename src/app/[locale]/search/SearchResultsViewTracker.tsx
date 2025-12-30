'use client'

import { useEffect, useRef } from 'react'
import { trackingProvider } from '@/config/tracking'

interface SearchResultsViewTrackerProps {
  query: string
}

export function SearchResultsViewTracker({
  query,
}: SearchResultsViewTrackerProps) {
  const hasTracked = useRef(false)

  useEffect(() => {
    // Only track if query is not empty
    if (!query || query.trim() === '') {
      return
    }

    // Prevent double-fire in React Strict Mode (dev)
    if (hasTracked.current) {
      return
    }

    hasTracked.current = true
    trackingProvider.track({ type: 'search_results_viewed', query })
  }, [query])

  return null
}

