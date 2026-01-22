/**
 * Assign Vibe ID to an Atlantico experience
 * 
 * SOURCE DE VÉRITÉ = MES VIBES (1-14)
 * 
 * Cette fonction mappe TOUS les inputs Atlantico vers UNIQUEMENT les vibeId 1-14.
 * 
 * Strategy STRICTE:
 * 1. Analyse RAW Atlantico (category / title / description / group)
 * 2. Map vers MES VIBES via ATLANTICO_TO_VIBE
 * 3. Si rien trouvé → fallback keyword matching
 * 4. Si toujours rien → vibeId = "1" (VIP Tours)
 * 
 * ❌ Ne jamais retourner une catégorie Atlantico
 * ✅ Toujours retourner un vibeId valide (1-14)
 */

import { getVibeIdFromCategory, ATLANTICO_TO_VIBE } from './atlantico-vibe-map'

/**
 * Keyword patterns for each vibe (in order: 1-14)
 * Each pattern is an array of keywords that should match (case-insensitive)
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
 * Extract searchable text from experience for keyword matching
 * PRIORITE ABSOLUE: construire un texte riche avec category/classification/groupName/title/description
 */
function extractSearchableText(experience: any): string {
  const parts: string[] = []
  
  // Category/Classification/Group (priorité)
  if (experience.category && typeof experience.category === 'string') {
    parts.push(experience.category.toLowerCase())
  }
  if (experience.categoryCode && typeof experience.categoryCode === 'string') {
    parts.push(experience.categoryCode.toLowerCase())
  }
  if (experience.classification && typeof experience.classification === 'string') {
    parts.push(experience.classification.toLowerCase())
  }
  if (experience.classificationCode && typeof experience.classificationCode === 'string') {
    parts.push(experience.classificationCode.toLowerCase())
  }
  if (experience.group && typeof experience.group === 'string') {
    parts.push(experience.group.toLowerCase())
  }
  if (experience.groupCode && typeof experience.groupCode === 'string') {
    parts.push(experience.groupCode.toLowerCase())
  }
  if (experience.groupName && typeof experience.groupName === 'string') {
    parts.push(experience.groupName.toLowerCase())
  }
  
  // Title/Name
  if (experience.title && typeof experience.title === 'string') {
    parts.push(experience.title.toLowerCase())
  }
  if (experience.name && typeof experience.name === 'string') {
    parts.push(experience.name.toLowerCase())
  }
  
  // Description
  if (experience.description && typeof experience.description === 'string') {
    parts.push(experience.description.toLowerCase())
  }
  if (experience.desc && typeof experience.desc === 'string') {
    parts.push(experience.desc.toLowerCase())
  }
  if (experience.shortDescription && typeof experience.shortDescription === 'string') {
    parts.push(experience.shortDescription.toLowerCase())
  }
  
  // Check _raw for additional fields
  if (experience._raw && typeof experience._raw === 'object') {
    const raw = experience._raw as any
    if (raw.category && typeof raw.category === 'string') {
      parts.push(raw.category.toLowerCase())
    }
    if (raw.classification && typeof raw.classification === 'string') {
      parts.push(raw.classification.toLowerCase())
    }
    if (raw.group && typeof raw.group === 'string') {
      parts.push(raw.group.toLowerCase())
    }
    if (raw.groupName && typeof raw.groupName === 'string') {
      parts.push(raw.groupName.toLowerCase())
    }
    if (raw.name && typeof raw.name === 'string') {
      parts.push(raw.name.toLowerCase())
    }
    if (raw.title && typeof raw.title === 'string') {
      parts.push(raw.title.toLowerCase())
    }
    if (raw.description && typeof raw.description === 'string') {
      parts.push(raw.description.toLowerCase())
    }
    if (raw.desc && typeof raw.desc === 'string') {
      parts.push(raw.desc.toLowerCase())
    }
  }
  
  return parts.join(' ')
}

/**
 * Match keywords against searchable text
 * Returns the first matching vibe ID (in order 1-14)
 */
function matchKeywords(searchableText: string): string | null {
  // Check each vibe in order (1-14)
  for (const [vibeId, keywords] of Object.entries(VIBE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchableText.includes(keyword.toLowerCase())) {
        return vibeId
      }
    }
  }
  
  return null
}

/**
 * Assign Vibe ID to an experience
 * 
 * @param experience - Experience object (can be raw Atlantico data or normalized)
 * @returns Vibe ID (1-14), defaults to "1" if no match found
 */
export function assignVibeId(experience: any): string {
  // PRIORITE ABSOLUE: construire un texte searchable riche
  const searchableText = extractSearchableText(experience)
  
  if (searchableText.length > 0) {
    // Normaliser en uppercase pour matching
    const upperText = searchableText.toUpperCase()
    
    // Strategy 1: Matcher les tokens de ATLANTICO_TO_VIBE
    // Parcourir les tokens par ordre de longueur (plus long d'abord pour éviter les faux positifs)
    const sortedKeys = Object.keys(ATLANTICO_TO_VIBE).sort((a, b) => b.length - a.length)
    for (const key of sortedKeys) {
      if (upperText.includes(key)) {
        const vibeId = ATLANTICO_TO_VIBE[key]
        const num = parseInt(vibeId, 10)
        if (num >= 1 && num <= 14) {
          return vibeId
        }
      }
    }
    
    // Strategy 2: Fallback keywords existant
    const vibeId = matchKeywords(searchableText)
    if (vibeId) {
      const num = parseInt(vibeId, 10)
      if (num >= 1 && num <= 14) {
        return vibeId
      }
    }
  }
  
  // Strategy 3: Final fallback - VIP Tours (vibeId = "1")
  // TOUJOURS retourner un vibeId valide (1-14)
  return '1'
}

/**
 * Get assignment method for debugging
 * Returns which strategy was used to assign the vibe
 */
export function getAssignmentMethod(experience: any): 'category' | 'keywords' | 'default' {
  // Use same enhanced extraction as assignVibeId
  const categoryCode = experience?.category ?? 
                      experience?.categoryCode ?? 
                      experience?._raw?.category ??
                      experience?._raw?.categoryCode ??
                      experience?.classification ?? 
                      experience?.classificationCode ?? 
                      experience?._raw?.classification ??
                      experience?._raw?.classificationCode ??
                      null
  
  // Normalize to string and trim
  const normalizedCategoryCode = categoryCode ? String(categoryCode).trim() : null
  
  if (normalizedCategoryCode) {
    const vibeId = getVibeIdFromCategory(normalizedCategoryCode)
    if (vibeId) {
      return 'category'
    }
  }
  
  const searchableText = extractSearchableText(experience)
  if (searchableText.length > 0) {
    const vibeId = matchKeywords(searchableText)
    if (vibeId) {
      return 'keywords'
    }
  }
  
  return 'default'
}

