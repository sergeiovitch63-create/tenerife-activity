/**
 * Intelligent prefetching for mobile optimization
 * Prefetches resources based on user interaction and viewport proximity
 */

/**
 * Prefetch a resource (page, image, etc.)
 */
export function prefetchResource(url: string, as: 'document' | 'image' | 'video' = 'document'): void {
  if (typeof window === 'undefined') return
  
  // Check if already prefetched
  const existing = document.querySelector(`link[rel="prefetch"][href="${url}"]`)
  if (existing) return
  
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = url
  link.as = as
  document.head.appendChild(link)
}

/**
 * Prefetch multiple resources
 */
export function prefetchResources(urls: string[], as: 'document' | 'image' | 'video' = 'document'): void {
  urls.forEach(url => prefetchResource(url, as))
}

/**
 * Prefetch on hover/touchstart for better mobile UX
 * Mobile: prefetch on touchstart (before click)
 * Desktop: prefetch on hover
 */
export function setupPrefetchOnInteraction(element: HTMLElement, url: string): () => void {
  let prefetched = false
  
  const prefetch = () => {
    if (!prefetched) {
      prefetchResource(url, 'document')
      prefetched = true
    }
  }
  
  // Mobile: prefetch on touchstart (immediate)
  element.addEventListener('touchstart', prefetch, { passive: true })
  
  // Desktop: prefetch on hover (with small delay to avoid unnecessary prefetch)
  let hoverTimeout: NodeJS.Timeout | null = null
  element.addEventListener('mouseenter', () => {
    hoverTimeout = setTimeout(prefetch, 100) // Small delay to avoid prefetching on accidental hover
  }, { passive: true })
  
  element.addEventListener('mouseleave', () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      hoverTimeout = null
    }
  }, { passive: true })
  
  // Cleanup function
  return () => {
    element.removeEventListener('touchstart', prefetch)
    element.removeEventListener('mouseenter', prefetch)
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }
  }
}

/**
 * Prefetch images when they're close to viewport
 */
export function setupImagePrefetch(imageUrl: string, threshold: number = 300): () => void {
  if (typeof window === 'undefined') return () => {}
  
  let prefetched = false
  let observer: IntersectionObserver | null = null
  
  // Create a dummy element to observe
  const dummy = document.createElement('div')
  dummy.style.position = 'absolute'
  dummy.style.width = '1px'
  dummy.style.height = '1px'
  dummy.style.pointerEvents = 'none'
  dummy.style.opacity = '0'
  document.body.appendChild(dummy)
  
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !prefetched) {
          prefetchResource(imageUrl, 'image')
          prefetched = true
          if (observer) {
            observer.disconnect()
            observer = null
          }
          document.body.removeChild(dummy)
        }
      })
    },
    { rootMargin: `${threshold}px` }
  )
  
  observer.observe(dummy)
  
  return () => {
    if (observer) {
      observer.disconnect()
    }
    if (document.body.contains(dummy)) {
      document.body.removeChild(dummy)
    }
  }
}

