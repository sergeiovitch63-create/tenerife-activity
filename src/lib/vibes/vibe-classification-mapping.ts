/**
 * Mapping from vibe slug to Atlantico classification name
 *
 * Fallback when classificationId is not available.
 * The classification name is matched case-insensitively against
 * the name field from /clasificationList/{lang}/{Collaborator}
 */
export const VIBE_TO_CLASSIFICATION_MAPPING: Record<string, string> = {
  'vip-tours': 'VIP Tours',
  'theme-parks': 'Theme Parks',
  'tickets-attractions': 'Tickets',
  'bus-excursions': 'Coach Tours',
  'boat-trips-cruises': 'Boat Trips',
  'shows-entertainment': 'Shows',
  'water-sports': 'Water Sports',
  'cable-car-observatory': 'Cable Car & Observatory',
  'diving-fishing': 'Diving & Fishing',
  'gastronomy-tastings': 'Gastronomy',
  'car-rental': 'Car and Moto Rent',
  'bike-rental': 'Bike Tours and Rentals',
  'transfers-private-transport': 'Airport transfers',
  'transfers-transport': 'Airport transfers',
  'adventure-nature': 'Adventure and Nature',
}

/**
 * Mapping from vibe slug to Atlantico classification ID (direct, most reliable).
 * When present, this is used instead of name lookup.
 * Source: /en/debug/classifications → classificationId
 */
export const VIBE_TO_CLASSIFICATION_ID: Record<string, string> = {
  'adventure-nature': '1312487407',
  'cable-car-observatory': '1426163087',
  'diving-fishing': '1265045434',
  // Add more as needed: 'slug': 'classificationId'
}

/**
 * Get the Atlantico classification ID for a vibe slug (preferred)
 */
export function getClassificationIdForVibe(vibeSlug: string): string | null {
  return VIBE_TO_CLASSIFICATION_ID[vibeSlug] ?? null
}

/**
 * Get the Atlantico classification name for a vibe slug (fallback)
 */
export function getClassificationNameForVibe(vibeSlug: string): string | null {
  return VIBE_TO_CLASSIFICATION_MAPPING[vibeSlug] || null
}











