'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseProgressiveRenderOptions {
  /**
   * Initial number of items to render
   * @default 10
   */
  initialCount?: number
  /**
   * Number of items to load per batch
   * @default 6
   */
  batchSize?: number
  /**
   * Distance from bottom (in pixels) to trigger next batch
   * @default 500
   */
  threshold?: number
  /**
   * Total number of items available
   */
  totalCount: number
}

/**
 * Hook for progressive rendering of large lists
 * Loads items in batches as user scrolls
 */
export function useProgressiveRender({
  initialCount = 10,
  batchSize = 6,
  threshold = 500,
  totalCount,
}: UseProgressiveRenderOptions) {
  const [visibleCount, setVisibleCount] = useState(Math.min(initialCount, totalCount))
  const [isLoading, setIsLoading] = useState(false)

  const loadMore = useCallback(() => {
    if (isLoading || visibleCount >= totalCount) return

    setIsLoading(true)
    // Small delay to prevent rapid-fire loading
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + batchSize, totalCount))
      setIsLoading(false)
    }, 100)
  }, [isLoading, visibleCount, totalCount, batchSize])

  useEffect(() => {
    if (visibleCount >= totalCount) return

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      // Check if we're near the bottom
      if (scrollTop + windowHeight >= documentHeight - threshold) {
        loadMore()
      }
    }

    // Throttle scroll events
    let ticking = false
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', throttledHandleScroll, { passive: true })
    return () => window.removeEventListener('scroll', throttledHandleScroll)
  }, [visibleCount, totalCount, threshold, loadMore])

  return {
    visibleCount,
    hasMore: visibleCount < totalCount,
    isLoading,
    loadMore,
  }
}


