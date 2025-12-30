/**
 * Build URLs with attribution params
 */

import { getAttribution } from './storage'

/**
 * Build redirect URL with attribution params
 * @param experienceSlug - Experience slug
 * @param locale - Locale code (deprecated, kept for backward compatibility - next-intl router handles locale automatically)
 */
export function buildBookingRedirectUrl(experienceSlug: string, locale: string = 'en'): string {
  const attribution = getAttribution()
  const params = new URLSearchParams()

  // Add experience
  params.set('experience', experienceSlug)

  // Add attribution if available
  if (attribution) {
    if (attribution.clickId) {
      params.set('click_id', attribution.clickId)
    }

    if (attribution.utm) {
      if (attribution.utm.source) {
        params.set('utm_source', attribution.utm.source)
      }
      if (attribution.utm.medium) {
        params.set('utm_medium', attribution.utm.medium)
      }
      if (attribution.utm.campaign) {
        params.set('utm_campaign', attribution.utm.campaign)
      }
      if (attribution.utm.content) {
        params.set('utm_content', attribution.utm.content)
      }
      if (attribution.utm.term) {
        params.set('utm_term', attribution.utm.term)
      }
    }
  }

  // Return path without locale prefix - next-intl router will add it automatically
  // This prevents double locale prefixes (e.g., /es/es/out/booking)
  return `/out/booking?${params.toString()}`
}

