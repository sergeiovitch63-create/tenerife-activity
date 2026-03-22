'use client'

import { usePathname, useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

/**
 * Floating back button component
 * Displays a floating "Back" button just below the header on all pages except the home page.
 * Uses browser history.back() if available, otherwise navigates to home.
 */
export function FloatingBackButton() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('common')
  const [headerHeight, setHeaderHeight] = useState(80) // Default mobile height

  // Get header height dynamically
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('header')
      if (header) {
        const height = header.offsetHeight
        setHeaderHeight(height)
      } else {
        // Fallback: use default heights based on viewport
        setHeaderHeight(window.innerWidth >= 768 ? 90 : 80)
      }
    }

    // Initial measurement
    updateHeaderHeight()

    // Update on resize
    window.addEventListener('resize', updateHeaderHeight)
    
    // Also check after a short delay to ensure header is rendered
    const timeout = setTimeout(updateHeaderHeight, 100)

    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
      clearTimeout(timeout)
    }
  }, [])

  // Check if we're on a home page
  // Note: usePathname() from @/navigation returns pathname WITHOUT locale prefix
  // So /en, /es, /de all return "/" as pathname
  const isHomePage = (() => {
    // Normalize pathname: remove trailing slash, handle empty string
    const normalizedPath = (pathname || '/').replace(/\/$/, '') || '/'
    
    // Home page is exactly "/" (without locale prefix)
    return normalizedPath === '/'
  })()

  // Don't render on home pages
  if (isHomePage) {
    return null
  }

  const handleBack = () => {
    // Check if there's browser history
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      // Fallback: if on activity page, go to VIP tours, otherwise go to home
      const isActivityPage = pathname?.startsWith('/activities/')
      if (isActivityPage) {
        router.push('/activite/vip-tours')
      } else {
        router.push('/')
      }
    }
  }

  return (
    <button
      onClick={handleBack}
      className="fixed z-40 flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3 bg-white/90 backdrop-blur-sm border border-glass-200 rounded-full shadow-md hover:bg-white/95 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 active:scale-95 min-h-[44px] left-4"
      style={{
        top: `${headerHeight + 12}px`,
      }}
      aria-label={t('back')}
      type="button"
    >
      {/* Arrow icon */}
      <svg
        className="w-5 h-5 text-glass-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      
      {/* Text label - visible on all screen sizes */}
      <span className="text-sm font-medium text-glass-700">
        {t('back')}
      </span>
    </button>
  )
}

