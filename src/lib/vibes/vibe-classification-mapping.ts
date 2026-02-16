/**
 * Mapping from vibe slug to Atlantico classification name
 * 
 * This mapping is used to resolve which Atlantico classification
 * should be displayed when a user clicks on a vibe.
 * 
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
}

/**
 * Get the Atlantico classification name for a vibe slug
 */
export function getClassificationNameForVibe(vibeSlug: string): string | null {
  return VIBE_TO_CLASSIFICATION_MAPPING[vibeSlug] || null
}











