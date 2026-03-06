'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from './registerServiceWorker'
import { setupViewTransitions } from './viewTransitions'
import { preloadCriticalImages, setupImagePreloading } from './preloadCritical'

/**
 * Client component to initialize performance optimizations
 * - Service Worker registration
 * - View Transitions API setup
 * - Critical images preloading
 * - Intelligent image preloading
 */
export function PerformanceInit() {
  useEffect(() => {
    // Register Service Worker for offline caching
    registerServiceWorker()
    
    // Setup View Transitions API for instant navigation
    const cleanupViewTransitions = setupViewTransitions()
    
    // Preload critical images immediately
    preloadCriticalImages()
    
    // Setup intelligent preloading for images near viewport
    // Delay slightly to let critical images load first
    const imagePreloadTimeout = setTimeout(() => {
      setupImagePreloading()
    }, 500)
    
    return () => {
      if (cleanupViewTransitions) cleanupViewTransitions()
      clearTimeout(imagePreloadTimeout)
    }
  }, [])

  return null
}

