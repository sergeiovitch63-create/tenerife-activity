/**
 * VIP Tours Mapping - Source of Truth
 * 
 * Explicit mapping between internal slugs and Atlantico IDs/event codes.
 * This replaces fragile title-based matching with a robust ID-based lookup.
 * 
 * Each entry maps:
 * - internalSlug: Our internal slug (used in URLs)
 * - atlanticoId: Atlantico tour ID (for /api/catalog/item?id=...)
 * - atlanticoSlug: Atlantico slug (for /api/catalog/item?slug=...)
 * - eventCode: Primary event code (for loadLimits/prices)
 * - groupCode: Group code (for groupDetails)
 * - fallbackTitle: Title to display if API fails
 * 
 * IMPORTANT: When an ID is found, update this file immediately.
 */

export interface VipTourMapping {
  /** Internal slug (our URL slug) */
  internalSlug: string
  /** Atlantico tour ID (primary lookup method) */
  atlanticoId?: string
  /** Atlantico slug (fallback lookup) */
  atlanticoSlug?: string
  /** Primary event code (for availability/prices) */
  eventCode?: string
  /** Group code (for groupDetails) */
  groupCode?: string
  /** Fallback title if API fails */
  fallbackTitle: string
  /** Search keywords to help find this tour in catalog */
  searchKeywords: string[]
}

/**
 * VIP Tours Mapping - All 11 tours
 * 
 * 8 tours are now connected with atlanticoId and atlanticoSlug.
 * 3 tours remain to be connected: gomera-vip-tour, teide-tour-vip, masca-vip-tour
 */
export const VIP_TOURS_MAPPING: VipTourMapping[] = [
  // 1. Astronomic Tour VIP (CONNECTED)
  {
    internalSlug: 'astronomic-tour-vip',
    atlanticoId: '516',
    atlanticoSlug: 'astronomic-tour-vip',
    eventCode: undefined, // TODO: Find event code
    groupCode: undefined,
    fallbackTitle: 'Astronomic Tour VIP',
    searchKeywords: ['astronomic', 'astronomical', 'vip', 'stars', 'night'],
  },
  
  // 2. Gomera VIP Tour (CONNECTED)
  {
    internalSlug: 'gomera-vip-tour',
    atlanticoId: undefined, // TODO: Find ID
    atlanticoSlug: 'gomera-vip-tour', // Works with standard slug fetch
    eventCode: undefined, // TODO: Find event code
    groupCode: '511', // Known from code
    fallbackTitle: 'Gomera VIP Tour',
    searchKeywords: ['gomera', 'vip', 'ferry', 'los cristianos'],
  },
  
  // 3. Teide de Noche VIP (CONNECTED)
  {
    internalSlug: 'teide-de-noche-vip',
    atlanticoId: '1832',
    atlanticoSlug: 'teide-de-noche-vip',
    eventCode: undefined, // TODO: Find event code
    groupCode: undefined,
    fallbackTitle: 'Teide de Noche VIP',
    searchKeywords: ['teide', 'noche', 'night', 'vip', 'sunset'],
  },
  
  // 4. Masca + Teide VIP (CONNECTED)
  {
    internalSlug: 'masca-teide-vip',
    atlanticoId: '6677',
    atlanticoSlug: 'masca-teide-vip',
    eventCode: undefined, // TODO: Find event code
    groupCode: undefined,
    fallbackTitle: 'Masca + Teide VIP',
    searchKeywords: ['masca', 'teide', 'vip', 'valley', 'gorge'],
  },
  
  // 5. La Laguna + Anaga VIP (CONNECTED)
  {
    internalSlug: 'la-laguna-anaga-vip',
    atlanticoId: '6687',
    atlanticoSlug: 'la-laguna-anaga-vip',
    eventCode: undefined, // TODO: Find event code
    groupCode: undefined,
    fallbackTitle: 'La Laguna + Anaga VIP',
    searchKeywords: ['laguna', 'anaga', 'vip', 'unesco', 'forest'],
  },
  
  // 6. Vuelta a La Isla VIP (CONNECTED)
  {
    internalSlug: 'vuelta-a-la-isla-vip',
    atlanticoId: '6697',
    atlanticoSlug: 'vuelta-a-la-isla-vip',
    eventCode: undefined, // TODO: Find event code
    groupCode: undefined,
    fallbackTitle: 'Vuelta a La Isla VIP',
    searchKeywords: ['vuelta', 'isla', 'island', 'complete', 'tour', 'vip'],
  },
  
  // 7. Tenerife VIP Tour (CONNECTED)
  {
    internalSlug: 'tenerife-vip-tour',
    atlanticoId: '6377',
    atlanticoSlug: 'tenerife-vip-tour',
    eventCode: undefined, // TODO: Find event code
    groupCode: undefined,
    fallbackTitle: 'Tenerife VIP Tour',
    searchKeywords: ['tenerife', 'vip', 'tour', 'island'],
  },
  
  // 8. Teide VIP Tour (CONNECTED)
  {
    internalSlug: 'teide-vip-tour',
    atlanticoId: '6387',
    atlanticoSlug: 'teide-vip-tour',
    eventCode: undefined, // TODO: Find event code
    groupCode: undefined,
    fallbackTitle: 'Teide VIP Tour',
    searchKeywords: ['teide', 'vip', 'tour', 'volcano', 'peak'],
  },
  
  // 9. VIP Ascent to the Peak on foot (CONNECTED)
  {
    internalSlug: 'vip-ascent-to-the-peak-on-foot',
    atlanticoId: '4457',
    atlanticoSlug: 'vip-ascent-to-the-peak-on-foot',
    eventCode: undefined, // TODO: Find event code
    groupCode: undefined,
    fallbackTitle: 'VIP Ascent to the Peak on foot',
    searchKeywords: ['ascent', 'peak', 'foot', 'walk', 'hike', 'vip', 'teide'],
  },
  
  // 10. Teide Tour VIP (TO CONNECT)
  {
    internalSlug: 'teide-tour-vip',
    atlanticoId: undefined, // TODO: Find ID
    atlanticoSlug: undefined, // TODO: Find slug
    eventCode: undefined, // TODO: Find event code
    groupCode: undefined,
    fallbackTitle: 'Teide Tour VIP',
    searchKeywords: ['teide', 'tour', 'vip', 'volcano'],
  },
  
  // 11. Masca VIP Tour (TO CONNECT)
  {
    internalSlug: 'masca-vip-tour',
    atlanticoId: undefined, // TODO: Find ID
    atlanticoSlug: undefined, // TODO: Find slug
    eventCode: undefined, // TODO: Find event code
    groupCode: undefined,
    fallbackTitle: 'Masca VIP Tour',
    searchKeywords: ['masca', 'vip', 'tour', 'valley', 'gorge'],
  },
]

/**
 * Get mapping by internal slug
 */
export function getVipTourMappingBySlug(internalSlug: string): VipTourMapping | null {
  return VIP_TOURS_MAPPING.find(m => m.internalSlug === internalSlug) || null
}

/**
 * Get all internal slugs
 */
export function getAllVipTourInternalSlugs(): string[] {
  return VIP_TOURS_MAPPING.map(m => m.internalSlug)
}

/**
 * Get mapping by Atlantico ID
 */
export function getVipTourMappingByAtlanticoId(atlanticoId: string): VipTourMapping | null {
  return VIP_TOURS_MAPPING.find(m => m.atlanticoId === atlanticoId) || null
}

/**
 * Get mapping by Atlantico slug
 */
export function getVipTourMappingByAtlanticoSlug(atlanticoSlug: string): VipTourMapping | null {
  return VIP_TOURS_MAPPING.find(m => m.atlanticoSlug === atlanticoSlug) || null
}

