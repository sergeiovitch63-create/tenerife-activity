'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface UseVirtualizedListOptions {
  /**
   * Total number of items
   */
  totalCount: number
  /**
   * Estimated height of each item in pixels
   * @default 200
   */
  itemHeight?: number
  /**
   * Number of items to render outside viewport (buffer)
   * @default 3
   */
  overscan?: number
  /**
   * Container element ref (optional, will use window if not provided)
   */
  containerRef?: React.RefObject<HTMLElement>
}

interface VirtualizedItem {
  index: number
  start: number
  end: number
}

/**
 * Hook for virtualized list rendering
 * Only renders items visible in viewport + buffer
 * Optimized for performance with large lists
 */
export function useVirtualizedList({
  totalCount,
  itemHeight = 200,
  overscan = 3,
  containerRef,
}: UseVirtualizedListOptions) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(10, totalCount) })
  const [containerHeight, setContainerHeight] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Calculate visible items based on scroll position
  const calculateVisibleRange = useCallback(() => {
    const container = containerRef?.current || document.documentElement
    const scrollPosition = containerRef?.current 
      ? container.scrollTop 
      : window.pageYOffset || document.documentElement.scrollTop
    
    const viewportHeight = containerRef?.current 
      ? container.clientHeight 
      : window.innerHeight
    
    // Calculate which items are visible
    const start = Math.max(0, Math.floor(scrollPosition / itemHeight) - overscan)
    const end = Math.min(
      totalCount,
      Math.ceil((scrollPosition + viewportHeight) / itemHeight) + overscan
    )

    setScrollTop(scrollPosition)
    setVisibleRange({ start, end })
  }, [itemHeight, overscan, totalCount, containerRef])

  // Setup scroll listener
  useEffect(() => {
    const container = containerRef?.current || window
    
    // Initial calculation
    calculateVisibleRange()
    
    // Throttle scroll events
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          calculateVisibleRange()
          ticking = false
        })
        ticking = true
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    
    // Update container height
    if (containerRef?.current) {
      setContainerHeight(containerRef.current.clientHeight)
    } else {
      setContainerHeight(window.innerHeight)
    }

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [calculateVisibleRange, containerRef])

  // Memoize visible items
  const visibleItems = useMemo(() => {
    const items: VirtualizedItem[] = []
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
      })
    }
    return items
  }, [visibleRange, itemHeight])

  // Calculate total height for container
  const totalHeight = totalCount * itemHeight

  return {
    visibleItems,
    totalHeight,
    scrollTop,
    startIndex: visibleRange.start,
    endIndex: visibleRange.end,
  }
}

