import type { Metadata } from 'next'
import { siteUrl, siteName, defaultOgImage } from '@/config/site'
import { locales, type Locale } from '@/i18n/request'

/**
 * Get the base URL for the site
 */
export function getBaseUrl(): string {
  return siteUrl
}

/**
 * Get canonical URL for a locale and pathname
 */
export function getCanonical(locale: Locale, pathname: string): string {
  // Ensure pathname starts with /
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  // Remove locale prefix if present (we'll add it back)
  const pathWithoutLocale = cleanPath.replace(/^\/(en|es|de|fr|it|ru|pl)/, '')
  // Ensure it starts with /
  const finalPath = pathWithoutLocale.startsWith('/') ? pathWithoutLocale : `/${pathWithoutLocale}`
  return `${siteUrl}/${locale}${finalPath}`
}

/**
 * Get alternate language URLs (hreflang)
 */
export function getAlternates(locale: Locale, pathname: string): {
  canonical: string
  languages: Record<string, string>
} {
  const canonical = getCanonical(locale, pathname)
  const languages: Record<string, string> = {}

  // Remove locale prefix if present
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  const pathWithoutLocale = cleanPath.replace(/^\/(en|es|de|fr|it|ru|pl)/, '')
  const finalPath = pathWithoutLocale.startsWith('/') ? pathWithoutLocale : `/${pathWithoutLocale}`

  // Generate URLs for all locales
  locales.forEach((loc) => {
    languages[loc] = `${siteUrl}/${loc}${finalPath}`
  })

  // Add x-default (usually points to English)
  languages['x-default'] = `${siteUrl}/en${finalPath}`

  return { canonical, languages }
}

/**
 * Build complete Next.js Metadata object with SEO best practices
 */
export function buildMetadata({
  locale,
  pathname,
  title,
  description,
  image,
  noindex = false,
}: {
  locale: Locale
  pathname: string
  title: string
  description: string
  image?: string
  noindex?: boolean
}): Metadata {
  const { canonical, languages } = getAlternates(locale, pathname)
  const ogImage = image || defaultOgImage

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: noindex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
  }
}


