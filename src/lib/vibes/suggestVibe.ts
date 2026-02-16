/**
 * Suggest Vibe ID from text content
 * 
 * This is a helper for suggesting vibe assignments based on text analysis.
 * It's similar to assignVibeId but designed for classification names and descriptions.
 */

import { getVibeIdFromClassification } from './atlantico-vibe-map'

/**
 * Keyword patterns for each vibe (in order: 1-14)
 * Same as assignVibe.ts but can be used independently
 */
const VIBE_KEYWORDS: Record<string, string[]> = {
  '1': ['vip', 'premium', 'exclusive', 'private', 'luxury', 'elite'],
  '2': ['theme park', 'siam park', 'loro parque', 'aquapark', 'waterpark', 'park ticket'],
  '3': ['ticket', 'entry', 'admission', 'skip the line', 'fast track', 'entrance'],
  '4': ['bus', 'excursion', 'tour bus', 'coach', 'guided tour', 'island tour'],
  '5': ['boat', 'cruise', 'sailing', 'catamaran', 'yacht', 'whale watching', 'dolphin'],
  '6': ['show', 'entertainment', 'performance', 'concert', 'theater', 'cabaret', 'flamenco'],
  '7': ['water sport', 'surfing', 'paddle', 'kayak', 'snorkel', 'parasailing', 'jet ski'],
  '8': ['cable car', 'teleferico', 'observatory', 'teide', 'stargazing', 'astronomy'],
  '9': ['diving', 'scuba', 'fishing', 'deep sea', 'underwater', 'snorkeling'],
  '10': ['adventure', 'hiking', 'trekking', 'nature', 'wildlife', 'forest', 'mountain', 'trail'],
  '11': ['gastronomy', 'tasting', 'wine', 'food tour', 'culinary', 'restaurant', 'tapas'],
  '12': ['car rental', 'rent a car', 'vehicle', 'automobile'],
  '13': ['bike rental', 'bicycle', 'cycling', 'bike tour', 'mountain bike'],
  '14': ['transfer', 'shuttle', 'airport', 'transport', 'pickup', 'drop off'],
}

/**
 * Match keywords against text
 * Returns the first matching vibe ID (in order 1-14)
 */
function matchKeywords(text: string): string | null {
  const lowerText = text.toLowerCase()
  
  // Check each vibe in order (1-14)
  for (const [vibeId, keywords] of Object.entries(VIBE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return vibeId
      }
    }
  }
  
  return null
}

/**
 * Suggest Vibe ID from text content
 * 
 * @param text - Text to analyze (classification name, title, description, etc.)
 * @param classificationCode - Optional classification code for direct mapping
 * @returns Suggested vibe ID (1-14) or null if no match
 */
export function suggestVibeFromText(text: string | null | undefined, classificationCode?: string | null): string | null {
  // Strategy 1: Try classification code mapping (if provided)
  if (classificationCode) {
    const vibeId = getVibeIdFromClassification(classificationCode)
    if (vibeId) {
      return vibeId
    }
  }
  
  // Strategy 2: Keyword matching in text
  if (text && typeof text === 'string' && text.trim().length > 0) {
    const vibeId = matchKeywords(text)
    if (vibeId) {
      return vibeId
    }
  }
  
  return null
}

/**
 * Get all vibe IDs with their slugs (for display)
 */
export const VIBE_ID_TO_SLUG: Record<string, string> = {
  '1': 'vip-tours',
  '2': 'theme-parks',
  '3': 'tickets-attractions',
  '4': 'bus-excursions',
  '5': 'boat-trips-cruises',
  '6': 'shows-entertainment',
  '7': 'water-sports',
  '8': 'cable-car-observatory',
  '9': 'diving-fishing',
  '10': 'adventure-nature',
  '11': 'gastronomy-tastings',
  '12': 'car-rental',
  '13': 'bike-rental',
  '14': 'transfers-transport',
}

























