'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getAttribution, setAttributionFromUrl } from '@/lib/attribution/storage'
import { trackingProvider } from '@/config/tracking'

/**
 * Captures attribution from URL params on navigation
 * Runs once per navigation, updates storage
 */
export function AttributionCapture() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasTrackedRef = useRef(false)
  const lastPathnameRef = useRef<string | null>(null)

  useEffect(() => {
    try {
      // Reset tracking flag on pathname change
      if (lastPathnameRef.current !== pathname) {
        hasTrackedRef.current = false
        lastPathnameRef.current = pathname
      }

      // Check if URL has attribution params
      const hasClickId = searchParams.get('click_id')
      const hasUTM =
        searchParams.get('utm_source') ||
        searchParams.get('utm_medium') ||
        searchParams.get('utm_campaign') ||
        searchParams.get('utm_content') ||
        searchParams.get('utm_term')

      // Only process if there's attribution data in URL
      if (!hasClickId && !hasUTM) {
        return
      }

      // Get existing attribution before update
      const existing = getAttribution()

      // Update attribution from URL
      const updated = setAttributionFromUrl(searchParams)

      // Track if new data was captured (only if we actually updated)
      if (updated && !hasTrackedRef.current) {
        // Check if this is a new capture (existing was null or different)
        const isNewCapture = !existing || 
          existing.clickId !== updated.clickId ||
          existing.utm?.source !== updated.utm?.source ||
          existing.utm?.medium !== updated.utm?.medium ||
          existing.utm?.campaign !== updated.utm?.campaign

        if (isNewCapture) {
          hasTrackedRef.current = true
          trackingProvider.track({
            type: 'attribution_captured',
            clickId: updated.clickId,
            hasUTM: !!updated.utm,
          })
        }
      }
    } catch (error) {
      // Silently fail attribution capture to prevent app crash
      console.warn('Attribution capture error:', error)
    }
  }, [pathname, searchParams])

  return null
}

