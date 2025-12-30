/**
 * Site configuration - single source of truth for site-wide settings
 */

export const siteName = 'Tenerife Activity'

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const defaultOgImage = `${siteUrl}/og-image.jpg`

