/**
 * Keywords mapping by Vibe ID (1-14)
 * 
 * This table maps keywords to vibe IDs for fallback filtering
 * when vibeId assignment fails or returns incorrect results.
 * 
 * Used in vibe pages to filter experiences by keywords when vibeId filtering returns 0 results.
 */

export const KEYWORDS_BY_VIBE: Record<string, string[]> = {
  '1': ['vip', 'premium', 'private', 'exclusive', 'luxury', 'elite'],
  // Theme Parks (vibeId "2") - Keywords ultra-ciblés
  '2': [
    // Marques spécifiques
    'siam', 'siam park', 'loro', 'loro parque', 'jungle park', 'aqualand',
    // Génériques EN
    'theme park', 'water park', 'park', 'zoo', 'aquarium', 'tickets', 'entrance', 'admission',
    // Génériques ES
    'parque temático', 'parque acuático', 'parque', 'entradas',
  ],
  '3': ['ticket', 'entry', 'pass', 'admission', 'attraction', 'skip the line', 'fast track', 'entrance'],
  '4': ['bus', 'coach', 'tour', 'excursion', 'guided', 'day trip', 'island tour'],
  '5': ['boat', 'cruise', 'catamaran', 'whale', 'dolphin', 'sailing', 'yacht'],
  '6': ['show', 'ticket show', 'dinner show', 'music', 'comedy', 'night show', 'entertainment', 'performance', 'concert', 'theater', 'cabaret', 'flamenco'],
  '7': ['jet ski', 'kayak', 'paddle', 'sup', 'parasailing', 'banana', 'flyboard', 'water sport', 'surfing', 'snorkel'],
  '8': ['cable car', 'teleferico', 'observatory', 'observatorio', 'summit', 'teide', 'stargazing', 'astronomy'],
  '9': ['dive', 'diving', 'snorkel', 'fishing', 'pescar', 'scuba', 'deep sea', 'underwater', 'snorkeling'],
  '10': ['teide', 'hike', 'hiking', 'trekking', 'trail', 'nature', 'quad', 'buggy', 'jeep', 'offroad', 'off-road', 'adventure', 'wildlife', 'forest', 'mountain'],
  '11': ['wine', 'tasting', 'food', 'gastro', 'tapas', 'restaurant', 'degustation', 'gastronomy', 'food tour', 'culinary'],
  '12': ['car rental', 'rent a car', 'coche', 'auto', 'vehicle rental', 'vehicle', 'automobile'],
  '13': ['bike', 'ebike', 'bicycle', 'mtb', 'cycling', 'scooter', 'bike rental', 'bike tour', 'mountain bike'],
  '14': ['transfer', 'airport', 'shuttle', 'taxi', 'transport', 'pickup', 'dropoff', 'drop off'],
}

/**
 * Get keywords for a vibe ID
 */
export function getKeywordsForVibe(vibeId: string): string[] {
  return KEYWORDS_BY_VIBE[vibeId] || []
}

