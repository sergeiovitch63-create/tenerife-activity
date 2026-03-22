/**
 * Curation Helper
 *
 * Applies curation rules to experiences:
 * - Filters out disabled experiences
 * - Overrides vibeId from curation
 * - Applies custom overrides (title, image, price)
 * - Adds featured and priority fields
 */

import type { Experience } from '@/core/entities/experience'

export interface CuratedRow {
  experience_id: string
  vibe_id: string
  enabled: boolean
  featured: boolean
  priority: number
  custom_title?: string | null
  custom_image?: string | null
  custom_price_label?: string | null
}

/**
 * Load curated experiences (e.g. from DB or JSON). Stub: no remote source yet.
 */
export async function loadCuration(): Promise<Record<string, CuratedRow>> {
  return {}
}

/**
 * Apply curation to experiences
 *
 * - Filters out experiences with enabled=false
 * - Overrides vibeId from curation
 * - Applies custom overrides (title, image, price)
 * - Adds featured and priority fields for sorting
 */
export function applyCuration(
  experiences: Experience[],
  curatedRows: Record<string, CuratedRow>
): Experience[] {
  const result: Experience[] = []

  for (const exp of experiences) {
    const curated = curatedRows[exp.id]

    // Skip if explicitly disabled
    if (curated && curated.enabled === false) {
      continue
    }

    // Create a copy to avoid mutating original
    const curatedExp: Experience & { featured?: boolean; priority?: number } = {
      ...exp,
    }

    // Override vibeId if curated
    if (curated) {
      curatedExp.vibeId = curated.vibe_id
    }

    // Apply custom overrides
    if (curated?.custom_title) {
      curatedExp.title = curated.custom_title
    }

    if (curated?.custom_image) {
      curatedExp.imageUrl = curated.custom_image
      if (curatedExp.imageUrls) {
        curatedExp.imageUrls = [curated.custom_image]
      }
    }

    if (curated?.custom_price_label) {
      // Store custom price label in a way that can be used by UI
      // For now, we'll keep the numeric price but could extend Experience interface
      // to include customPriceLabel if needed
    }

    // Add curation metadata for sorting
    if (curated) {
      curatedExp.featured = curated.featured
      curatedExp.priority = curated.priority
    } else {
      curatedExp.featured = false
      curatedExp.priority = 0
    }

    result.push(curatedExp as Experience)
  }

  return result
}

/**
 * Sort experiences with curation priority
 *
 * Order: featured DESC, priority DESC, reviewCount DESC (if available), then stable
 */
export function sortExperiencesWithCuration(experiences: Experience[]): Experience[] {
  return [...experiences].sort((a, b) => {
    // Type assertion to access featured/priority
    const aExp = a as Experience & { featured?: boolean; priority?: number }
    const bExp = b as Experience & { featured?: boolean; priority?: number }

    // 1. Featured first
    const aFeatured = aExp.featured === true ? 1 : 0
    const bFeatured = bExp.featured === true ? 1 : 0
    if (aFeatured !== bFeatured) {
      return bFeatured - aFeatured
    }

    // 2. Priority (higher first)
    const aPriority = aExp.priority || 0
    const bPriority = bExp.priority || 0
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }

    // 3. Review count (if available)
    const aReviews = a.reviewCount || 0
    const bReviews = b.reviewCount || 0
    if (aReviews !== bReviews) {
      return bReviews - aReviews
    }

    // 4. Stable sort (keep original order)
    return 0
  })
}
