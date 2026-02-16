/**
 * Activity Media Management
 * 
 * Automatically scans and maps activity slugs to their media files.
 * Supports both API images and local fallback images.
 */

import { readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Get all VIP activity slugs from the matching system
 * This will be populated dynamically from the catalog
 */
export async function getVipActivitySlugs(): Promise<string[]> {
  // This will be called server-side to get VIP tours from catalog
  // For now, return known VIP slugs
  const knownVipSlugs = [
    'astronomic-tour-vip',
    'teide-de-noche-vip',
    'masca-teide-vip',
    'la-laguna-anaga-vip',
    'vuelta-isla-vip',
    'gomera-vip-tour',
    'teide-vip-tour',
    'ascenso-teide-vip',
    'tenerife-vip-tour',
  ]
  
  return knownVipSlugs
}

/**
 * Scan local images directory for activity media
 * Looks for files matching pattern: {slug}-{number}.{ext}
 */
export async function scanLocalActivityImages(slug: string): Promise<string[]> {
  const publicDir = join(process.cwd(), 'public', 'content', 'activities')
  const srcDir = join(process.cwd(), 'src', 'content', 'activities')
  
  const images: string[] = []
  const seen = new Set<string>()
  
  // Scan both public and src directories
  for (const baseDir of [publicDir, srcDir]) {
    if (!existsSync(baseDir)) {
      continue
    }
    
    try {
      const files = await readdir(baseDir)
      
      // Pattern: {slug}-{number}.{ext} or {slug}.{ext}
      const pattern = new RegExp(`^${slug.replace(/-/g, '[-_]')}(?:-\\d+)?\\.(png|jpg|jpeg|webp|avif)$`, 'i')
      
      for (const file of files) {
        if (pattern.test(file)) {
          // Use public path (relative to /)
          const publicPath = `/content/activities/${file}`
          if (!seen.has(publicPath)) {
            images.push(publicPath)
            seen.add(publicPath)
          }
        }
      }
    } catch (err) {
      // Silently fail if directory doesn't exist or can't be read
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[activityMedia] Could not scan ${baseDir}:`, err)
      }
    }
  }
  
  // Sort by number if present (astronomic-tour-1.png, astronomic-tour-2.png, etc.)
  return images.sort((a, b) => {
    const aMatch = a.match(/-(\d+)\./)
    const bMatch = b.match(/-(\d+)\./)
    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1])
    }
    return a.localeCompare(b)
  })
}

/**
 * Get activity media (images) for a given slug
 * Priority:
 * 1. Local scanned images (from /public/content/activities/)
 * 2. Placeholder (never show "No photo" text)
 */
export async function getActivityMedia(slug: string): Promise<string[]> {
  const localImages = await scanLocalActivityImages(slug)
  
  if (localImages.length > 0) {
    return localImages
  }
  
  // Return empty array if no images found (UI will handle placeholder)
  return []
}

/**
 * Get activity cover image (first image or placeholder)
 */
export async function getActivityCoverImage(slug: string): Promise<string | null> {
  const images = await getActivityMedia(slug)
  return images.length > 0 ? images[0] : null
}

/**
 * Activity media configuration
 * Can be extended with custom overrides per activity
 */
export interface ActivityMediaConfig {
  slug: string
  coverImage?: string | null
  gallery?: string[]
  hasLocalMedia: boolean
}

/**
 * Get full media configuration for an activity
 */
export async function getActivityMediaConfig(slug: string): Promise<ActivityMediaConfig> {
  const images = await getActivityMedia(slug)
  
  return {
    slug,
    coverImage: images.length > 0 ? images[0] : null,
    gallery: images,
    hasLocalMedia: images.length > 0,
  }
}






















