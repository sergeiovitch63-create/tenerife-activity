'use client'

import { useEffect } from 'react'
import { usePathname } from '@/navigation'

export function ScrollToVibes() {
  const pathname = usePathname()

  useEffect(() => {
    // Only run on home page - pathname should be '/' after locale
    const isHome = pathname === '/' || pathname === ''
    if (!isHome) return

    // Check if URL has #vibes hash
    if (window.location.hash === '#vibes') {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById('vibes')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }, [pathname])

  return null
}
