'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from './registerServiceWorker'
import { setupViewTransitions } from './viewTransitions'

/**
 * Client component to initialize performance optimizations
 * - Service Worker registration
 * - View Transitions API setup
 */
export function PerformanceInit() {
  useEffect(() => {
    // Register Service Worker for offline caching
    registerServiceWorker()
    
    // Setup View Transitions API for instant navigation
    const cleanup = setupViewTransitions()
    
    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  return null
}

