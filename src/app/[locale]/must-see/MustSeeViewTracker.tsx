'use client'

import { useEffect, useRef } from 'react'
import { trackingProvider } from '@/config/tracking'

export function MustSeeViewTracker() {
  const hasTracked = useRef(false)

  useEffect(() => {
    // Prevent double-fire in React Strict Mode (dev)
    if (hasTracked.current) {
      return
    }

    hasTracked.current = true
    trackingProvider.track({ type: 'must_see_viewed' })
  }, [])

  return null
}

