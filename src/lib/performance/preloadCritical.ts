/**
 * Preload critical images for instant display
 * Images are preloaded with high priority to appear <150ms
 */

export function preloadCriticalImages() {
  if (typeof window === 'undefined') return
  
  // Critical images that must appear immediately
  const criticalImages = [
    // Logo (always visible in header)
    '/logo.png',
    // Hero poster (shown before video loads)
    '/images/hero-poster.jpg',
    // First 4 images from carousel (above the fold)
    '/images/home/must-see/row-1/club-termal.jpg',
    '/images/home/must-see/row-1/Loro-Parque.png',
    '/images/home/must-see/row-1/flamenco.png',
    '/images/home/must-see/row-1/Siam-Park.png',
    // Icon/favicon
    '/icon.svg',
  ]
  
  // Preload each image with high priority
  criticalImages.forEach(src => {
    // Check if already preloaded
    const existing = document.querySelector(`link[rel="preload"][href="${src}"]`)
    if (existing) return
    
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    link.setAttribute('fetchpriority', 'high')
    link.setAttribute('crossorigin', 'anonymous')
    document.head.appendChild(link)
  })
}

/**
 * Preload images when they're close to viewport
 * Uses IntersectionObserver for intelligent preloading
 */
export function setupImagePreloading() {
  if (typeof window === 'undefined') return
  
  // Find all images with data-preload attribute
  const imagesToPreload = document.querySelectorAll('img[data-preload]')
  
  if (imagesToPreload.length === 0) return
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          const src = img.getAttribute('data-preload') || img.src
          
          // Preload the image
          const link = document.createElement('link')
          link.rel = 'preload'
          link.as = 'image'
          link.href = src
          document.head.appendChild(link)
          
          // Stop observing this image
          observer.unobserve(img)
        }
      })
    },
    { rootMargin: '300px' } // Start loading 300px before entering viewport
  )
  
  imagesToPreload.forEach(img => {
    observer.observe(img)
  })
  
  return () => {
    observer.disconnect()
  }
}

