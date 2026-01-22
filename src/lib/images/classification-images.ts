/**
 * Classification-based image mapping
 * 
 * Maps Atlantico classification codes/categories to local hero images.
 * This ensures all activities display real images even when Atlantico images are not publicly accessible.
 * 
 * HARDENED: 100% guarantee of valid image path, with DEV file existence checks.
 */

// File system imports (server-side only)
let existsSync: typeof import('fs').existsSync
let join: typeof import('path').join

try {
  // Only import in Node.js environment (not edge runtime)
  if (typeof process !== 'undefined' && process.versions?.node) {
    const fs = require('fs')
    const path = require('path')
    existsSync = fs.existsSync
    join = path.join
  }
} catch {
  // Edge runtime or unavailable - skip file checks
}

/**
 * Remove accents/diacritics from string
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Normalize input: trim, lowercase, remove accents
 */
function normalizeInput(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return ''
  return removeAccents(input.trim().toLowerCase())
}

/**
 * Check if image file exists in public directory (DEV only, server-side)
 */
function checkImageExists(imagePath: string): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return true // Skip check in production
  }

  // Skip if fs/path not available (edge runtime)
  if (!existsSync || !join) {
    return true
  }

  try {
    // Remove leading slash and check in public directory
    const publicPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
    const fullPath = join(process.cwd(), 'public', publicPath)
    const exists = existsSync(fullPath)
    
    if (!exists) {
      // eslint-disable-next-line no-console
      console.warn('[LOCAL_IMAGE_MISSING]', {
        path: imagePath,
        fullPath,
        fallback: '/images/hero-poster.jpg',
      })
    }
    
    return exists
  } catch {
    return false
  }
}

/**
 * Get image path with existence check (DEV only)
 * Returns fallback if file doesn't exist
 */
function getImageWithCheck(imagePath: string): string {
  const DEFAULT_FALLBACK = '/images/hero-poster.jpg'
  
  if (process.env.NODE_ENV === 'development') {
    if (!checkImageExists(imagePath)) {
      return DEFAULT_FALLBACK
    }
  }
  
  return imagePath
}

/**
 * Mapping by classification ID (most stable - from clasificationList API)
 * Based on real Atlantico classifications
 */
const CLASSIFICATION_ID_MAP: Record<string | number, string> = {
  // IDs from clasificationList/ENG
  '1312481776': '/images/coach-tours.jpg', // 20: Coach Tours
  '20': '/images/coach-tours.jpg', // Code: 20
  '1750147182': '/images/vip-tours.jpg', // 308: VIP tours
  '308': '/images/vip-tours.jpg', // Code: 308
  '1312487407': '/images/adventure-nature.jpg', // 24: Adventure and Nature
  '24': '/images/adventure-nature.jpg', // Code: 24
  '1265045392': '/images/boat-trips.jpg', // 17: Boat Trips
  '17': '/images/boat-trips.jpg', // Code: 17
  '1265046317': '/images/boat-trips.jpg', // 19: Water Sports
  '19': '/images/boat-trips.jpg', // Code: 19
  '1265045434': '/images/boat-trips.jpg', // 18: Diving and Fishing
  '18': '/images/boat-trips.jpg', // Code: 18
  '1265045344': '/images/theme-parks.jpg', // 22: Theme parks
  '22': '/images/theme-parks.jpg', // Code: 22
  '1445940121': '/images/theme-parks.jpg', // 241: Tickets
  '241': '/images/theme-parks.jpg', // Code: 241
  '1265045414': '/images/theme-parks.jpg', // 26: Shows
  '26': '/images/theme-parks.jpg', // Code: 26
  '1426163087': '/images/adventure-nature.jpg', // 195: Cable car and Observatory
  '195': '/images/adventure-nature.jpg', // Code: 195
}

/**
 * Comprehensive classification/category mapping by keywords
 * Maps by ID/code first, then by name keywords
 * All paths point to /images/... (local images)
 */
const CLASSIFICATION_MAP: Record<string, string> = {
  // Coach Tours / Bus Excursions
  'coach': '/images/coach-tours.jpg',
  'bus': '/images/coach-tours.jpg',
  'excursion': '/images/coach-tours.jpg',
  'tour': '/images/coach-tours.jpg',
  'autocar': '/images/coach-tours.jpg',
  'autobus': '/images/coach-tours.jpg',
  
  // VIP Tours
  'vip': '/images/vip-tours.jpg',
  'private': '/images/vip-tours.jpg',
  'exclusive': '/images/vip-tours.jpg',
  'premium': '/images/vip-tours.jpg',
  'luxury': '/images/vip-tours.jpg',
  
  // Nature / Adventure
  'nature': '/images/adventure-nature.jpg',
  'adventure': '/images/adventure-nature.jpg',
  'hiking': '/images/adventure-nature.jpg',
  'trekking': '/images/adventure-nature.jpg',
  'senderismo': '/images/adventure-nature.jpg',
  'montana': '/images/adventure-nature.jpg',
  'mountain': '/images/adventure-nature.jpg',
  
  // Teide / Cable Car / Observatory (use adventure-nature as fallback)
  'teide': '/images/adventure-nature.jpg',
  'cable': '/images/adventure-nature.jpg',
  'observatory': '/images/adventure-nature.jpg',
  'observatorio': '/images/adventure-nature.jpg',
  'teleferico': '/images/adventure-nature.jpg',
  
  // Sea / Boat / Water
  'sea': '/images/boat-trips.jpg',
  'boat': '/images/boat-trips.jpg',
  'cruise': '/images/boat-trips.jpg',
  'dolphin': '/images/boat-trips.jpg',
  'whale': '/images/boat-trips.jpg',
  'ballena': '/images/boat-trips.jpg',
  'delfin': '/images/boat-trips.jpg',
  'barco': '/images/boat-trips.jpg',
  'crucero': '/images/boat-trips.jpg',
  'mar': '/images/boat-trips.jpg',
  
  // Water Sports / Diving (use boat-trips as fallback)
  'water': '/images/boat-trips.jpg',
  'diving': '/images/boat-trips.jpg',
  'fishing': '/images/boat-trips.jpg',
  'buceo': '/images/boat-trips.jpg',
  'pesca': '/images/boat-trips.jpg',
  'snorkel': '/images/boat-trips.jpg',
  'snorkeling': '/images/boat-trips.jpg',
  
  // Theme Parks / Attractions
  'park': '/images/theme-parks.jpg',
  'theme': '/images/theme-parks.jpg',
  'parque': '/images/theme-parks.jpg',
  'attraction': '/images/theme-parks.jpg',
  'ticket': '/images/theme-parks.jpg',
  'entrada': '/images/theme-parks.jpg',
  'atractivo': '/images/theme-parks.jpg',
  
  // Shows / Entertainment (use theme-parks as fallback)
  'show': '/images/theme-parks.jpg',
  'entertainment': '/images/theme-parks.jpg',
  'flamenco': '/images/theme-parks.jpg',
  'espectaculo': '/images/theme-parks.jpg',
  'espectaculos': '/images/theme-parks.jpg',
  
  // Gastronomy (use theme-parks as fallback)
  'gastronomy': '/images/theme-parks.jpg',
  'tasting': '/images/theme-parks.jpg',
  'food': '/images/theme-parks.jpg',
  'wine': '/images/theme-parks.jpg',
  'gastronomia': '/images/theme-parks.jpg',
  'degustacion': '/images/theme-parks.jpg',
  'comida': '/images/theme-parks.jpg',
  'vino': '/images/theme-parks.jpg',
  
  // Transport / Transfers (use coach-tours as fallback)
  'transfer': '/images/coach-tours.jpg',
  'transport': '/images/coach-tours.jpg',
  'transporte': '/images/coach-tours.jpg',
  'traslado': '/images/coach-tours.jpg',
  'car': '/images/coach-tours.jpg',
  'rental': '/images/coach-tours.jpg',
  'coche': '/images/coach-tours.jpg',
  'alquiler': '/images/coach-tours.jpg',
  'bike': '/images/coach-tours.jpg',
  'bicicleta': '/images/coach-tours.jpg',
}

/**
 * Get image by keyword matching (fallback when ID/code doesn't match)
 */
function getImageByKeyword(text: string): string | null {
  const normalized = normalizeInput(text)
  if (!normalized) return null

  // Try exact match first
  if (CLASSIFICATION_MAP[normalized]) {
    return CLASSIFICATION_MAP[normalized]
  }

  // Try partial match (check if text contains any key)
  for (const [key, image] of Object.entries(CLASSIFICATION_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return image
    }
  }

  // Try keyword-based matching
  if (normalized.includes('coach') || normalized.includes('bus') || normalized.includes('excursion') || normalized.includes('autocar')) {
    return '/images/coach-tours.jpg'
  }
  if (normalized.includes('vip') || normalized.includes('private') || normalized.includes('exclusive') || normalized.includes('premium')) {
    return '/images/vip-tours.jpg'
  }
  if (normalized.includes('nature') || normalized.includes('adventure') || normalized.includes('hiking') || normalized.includes('trekking')) {
    return '/images/adventure-nature.jpg'
  }
  if (normalized.includes('teide') || normalized.includes('cable') || normalized.includes('observatory') || normalized.includes('teleferico')) {
    return '/images/adventure-nature.jpg'
  }
  if (normalized.includes('sea') || normalized.includes('boat') || normalized.includes('cruise') || normalized.includes('dolphin') || normalized.includes('whale') || normalized.includes('barco')) {
    return '/images/boat-trips.jpg'
  }
  if (normalized.includes('water') || normalized.includes('diving') || normalized.includes('fishing') || normalized.includes('buceo')) {
    return '/images/boat-trips.jpg'
  }
  if (normalized.includes('park') || normalized.includes('theme') || normalized.includes('parque')) {
    return '/images/theme-parks.jpg'
  }
  if (normalized.includes('show') || normalized.includes('entertainment') || normalized.includes('flamenco') || normalized.includes('espectaculo')) {
    return '/images/theme-parks.jpg'
  }
  if (normalized.includes('gastronomy') || normalized.includes('tasting') || normalized.includes('food') || normalized.includes('wine') || normalized.includes('gastronomia')) {
    return '/images/theme-parks.jpg'
  }
  if (normalized.includes('transfer') || normalized.includes('transport') || normalized.includes('traslado')) {
    return '/images/coach-tours.jpg'
  }
  if (normalized.includes('car') || normalized.includes('rental') || normalized.includes('coche') || normalized.includes('alquiler')) {
    return '/images/coach-tours.jpg'
  }

  return null
}

/**
 * Get image for activity based on classification/category
 * 
 * Priority:
 * 1. Classification ID (from clasificationList - most stable)
 * 2. Category ID/code (from groupDetails.category)
 * 3. Classification code (from clasificationList)
 * 4. Category name (from groupDetails.categoryName)
 * 5. Classification name (from clasificationList)
 * 6. Keyword matching
 * 7. Default fallback
 * 
 * ALWAYS returns a valid image path (never null/undefined)
 */
export function getImageForClassificationName(
  classificationCode: string | null | undefined,
  classificationName: string | null | undefined,
  categoryId?: string | number | null | undefined,
  categoryName?: string | null | undefined,
  classificationId?: string | number | null | undefined,
  activityId?: string | null | undefined
): string {
  const DEFAULT_FALLBACK = '/images/hero-poster.jpg'

  // Priority 1: Classification ID (from clasificationList - most stable)
  if (classificationId !== null && classificationId !== undefined) {
    const idStr = String(classificationId).trim()
    if (CLASSIFICATION_ID_MAP[idStr]) {
      return getImageWithCheck(CLASSIFICATION_ID_MAP[idStr])
    }
    // Also try as number
    const idNum = Number(classificationId)
    if (!isNaN(idNum) && CLASSIFICATION_ID_MAP[idNum]) {
      return getImageWithCheck(CLASSIFICATION_ID_MAP[idNum])
    }
  }

  // Priority 2: Classification code (from clasificationList) - check ID map first
  if (classificationCode) {
    const codeStr = String(classificationCode).trim()
    if (CLASSIFICATION_ID_MAP[codeStr]) {
      return getImageWithCheck(CLASSIFICATION_ID_MAP[codeStr])
    }
    // Also try as number
    const codeNum = Number(classificationCode)
    if (!isNaN(codeNum) && CLASSIFICATION_ID_MAP[codeNum]) {
      return getImageWithCheck(CLASSIFICATION_ID_MAP[codeNum])
    }
  }

  // Priority 3: Category ID/code (from groupDetails.category)
  if (categoryId !== null && categoryId !== undefined) {
    const categoryIdStr = String(categoryId).trim()
    if (CLASSIFICATION_ID_MAP[categoryIdStr]) {
      return getImageWithCheck(CLASSIFICATION_ID_MAP[categoryIdStr])
    }
    // Also try as number
    const categoryIdNum = Number(categoryId)
    if (!isNaN(categoryIdNum) && CLASSIFICATION_ID_MAP[categoryIdNum]) {
      return getImageWithCheck(CLASSIFICATION_ID_MAP[categoryIdNum])
    }
    // Fallback to keyword matching
    const normalizedId = normalizeInput(categoryIdStr)
    if (normalizedId) {
      const image = getImageByKeyword(normalizedId)
      if (image) {
        return getImageWithCheck(image)
      }
    }
  }

  // Priority 4: Category name (from groupDetails.categoryName)
  if (categoryName) {
    const image = getImageByKeyword(categoryName)
    if (image) {
      return getImageWithCheck(image)
    }
  }

  // Priority 5: Classification name (from clasificationList)
  if (classificationName) {
    const image = getImageByKeyword(classificationName)
    if (image) {
      return getImageWithCheck(image)
    }
  }

  // Priority 6: Classification code keyword matching (fallback)
  if (classificationCode) {
    const normalizedCode = normalizeInput(classificationCode)
    if (normalizedCode) {
      const image = getImageByKeyword(normalizedCode)
      if (image) {
        return getImageWithCheck(image)
      }
    }
  }

  // Priority 7: Default fallback (guaranteed to exist)
  // Log unmapped classification in DEV
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn('[CLASSIFICATION_UNMAPPED]', {
      activityId: activityId || null,
      classificationId: classificationId || null,
      classificationCode: classificationCode || null,
      classificationName: classificationName || null,
      categoryId: categoryId || null,
      categoryName: categoryName || null,
      fallback: DEFAULT_FALLBACK,
    })
  }
  return getImageWithCheck(DEFAULT_FALLBACK)
}

/**
 * Legacy function for backward compatibility
 */
export function getImageForClassification(classificationCode: string | null | undefined): string {
  return getImageForClassificationName(classificationCode, null)
}
