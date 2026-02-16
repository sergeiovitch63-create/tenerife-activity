/**
 * VIP Tour Detection
 * 
 * Detects if a tour is a "Tours VIP" based on Atlantico data.
 * Tours VIP are identified by:
 * - Title contains "VIP" (case-insensitive)
 * - Slug contains "vip" (case-insensitive)
 * - Classification/category contains "VIP" or "Tours VIP" (if available in raw data)
 */

import type { FullTour } from './catalog-types'

/**
 * Check if a tour is a VIP tour
 * 
 * Detection strategy:
 * 1. Check title (case-insensitive, trimmed)
 * 2. Check slug (case-insensitive, trimmed)
 * 3. Check raw classification/category fields (if available)
 * 
 * @param tour - FullTour from Super Catalog
 * @returns true if tour is VIP, false otherwise
 */
export function isVipTour(tour: FullTour): boolean {
  // Normalize title
  const title = tour.title?.trim().toLowerCase() || ''
  if (title.includes('vip')) {
    return true
  }

  // Normalize slug
  const slug = tour.slug?.trim().toLowerCase() || ''
  if (slug.includes('vip')) {
    return true
  }

  // Check raw data fields (classification, category, etc.)
  if (tour.raw) {
    const raw = tour.raw as any
    
    // Check classification/category fields
    const fieldsToCheck = [
      raw.classification,
      raw.classificationName,
      raw.classificationCode,
      raw.category,
      raw.categoryName,
      raw.categoryCode,
      raw.groupName,
      raw.groupCode,
    ]

    for (const field of fieldsToCheck) {
      if (field && typeof field === 'string') {
        const normalized = field.trim().toLowerCase()
        if (normalized.includes('vip') || normalized.includes('tours vip')) {
          return true
        }
      }
    }

    // Check groupDetails if available
    if (raw.groupDetails) {
      const groupDetails = raw.groupDetails as any
      const groupFields = [
        groupDetails.classification,
        groupDetails.classificationName,
        groupDetails.category,
        groupDetails.categoryName,
        groupDetails.name,
        groupDetails.title,
      ]

      for (const field of groupFields) {
        if (field && typeof field === 'string') {
          const normalized = field.trim().toLowerCase()
          if (normalized.includes('vip') || normalized.includes('tours vip')) {
            return true
          }
        }
      }
    }

    // Check groupList if available
    if (raw.groupList) {
      const groupList = raw.groupList as any
      if (Array.isArray(groupList)) {
        for (const group of groupList) {
          if (group && typeof group === 'object') {
            const groupFields = [
              group.classification,
              group.classificationName,
              group.category,
              group.categoryName,
              group.name,
              group.title,
            ]

            for (const field of groupFields) {
              if (field && typeof field === 'string') {
                const normalized = field.trim().toLowerCase()
                if (normalized.includes('vip') || normalized.includes('tours vip')) {
                  return true
                }
              }
            }
          }
        }
      } else if (typeof groupList === 'object') {
        const groupFields = [
          groupList.classification,
          groupList.classificationName,
          groupList.category,
          groupList.categoryName,
          groupList.name,
          groupList.title,
        ]

        for (const field of groupFields) {
          if (field && typeof field === 'string') {
            const normalized = field.trim().toLowerCase()
            if (normalized.includes('vip') || normalized.includes('tours vip')) {
              return true
            }
          }
        }
      }
    }
  }

  return false
}






















