import { MetadataRoute } from 'next'
import { locales } from '@/i18n/request'
import { siteUrl } from '@/config/site'
import { vibeRepository } from '@/config/repositories'
import { experienceRepository } from '@/config/repositories'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl

  // Get all vibes and experiences
  const vibes = await vibeRepository.findAll()
  const experiences = await experienceRepository.findAll()

  // Static routes for each locale
  const staticRoutes = ['/', '/must-see', '/get-inspired', '/partners', '/search', '/contact']

  // Build sitemap entries
  const entries: MetadataRoute.Sitemap = []

  // Add static routes for each locale
  for (const locale of locales) {
    for (const route of staticRoutes) {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '/' ? 'daily' : 'weekly',
        priority: route === '/' ? 1 : 0.8,
      })
    }
  }

  // Add vibe pages for each locale
  for (const vibe of vibes) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}/vibe/${vibe.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  // Add experience pages for each locale
  for (const experience of experiences) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}/experience/${experience.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
  }

  return entries
}

