/**
 * Mapping table: Atlantico → MES VIBES (1-14)
 * 
 * SOURCE DE VÉRITÉ = MES VIBES (14 vibes dans mock-vibe.repository.ts)
 * 
 * Ce mapping convertit TOUS les inputs Atlantico (category, classification, keywords)
 * vers UNIQUEMENT les vibeId 1-14.
 * 
 * Vibe IDs (ordre verrouillé):
 * 1: vip-tours
 * 2: theme-parks
 * 3: tickets-attractions
 * 4: bus-excursions
 * 5: boat-trips-cruises
 * 6: shows-entertainment
 * 7: water-sports
 * 8: cable-car-observatory
 * 9: diving-fishing
 * 10: adventure-nature
 * 11: gastronomy-tastings
 * 12: car-rental
 * 13: bike-rental
 * 14: transfers-transport
 */

export const ATLANTICO_TO_VIBE: Record<string, string> = {
  // Category codes (existing)
  "1265045392": "5",
  "1312487407": "10",
  "1312481776": "4",
  "1265046317": "7",
  "1265045344,1445940121": "2",
  "1750147182": "1",
  "1445940121,1265045414": "6",
  "1265045434": "9",
  "1457430923": "12",
  "1403121758": "13",
  "1265045344,1312487407": "10",
  "1265045392,1265045434": "5",
  "1426163087": "8",
  "1312481776,1717760499": "11",
  "1312481776,1750147182": "1",
  "1445940121,1426163087": "8",
  
  // Vibe 1: vip-tours
  "VIP": "1", "PREMIUM": "1", "PRIVATE": "1", "EXCLUSIVE": "1", "LUXURY": "1", "ELITE": "1",
  
  // Vibe 2: theme-parks
  "SIAM": "2", "LORO": "2", "JUNGLE": "2", "PARK": "2", "PARQUE": "2", "ZOO": "2", "AQUARIUM": "2",
  "THEME PARK": "2", "AQUAPARK": "2", "WATERPARK": "2", "PARK TICKET": "2",
  
  // Vibe 3: tickets-attractions
  "TICKET": "3", "ENTRY": "3", "PASS": "3", "ADMISSION": "3", "ATTRACTION": "3",
  "SKIP THE LINE": "3", "FAST TRACK": "3", "ENTRANCE": "3",
  
  // Vibe 4: bus-excursions
  "BUS": "4", "COACH": "4", "TOUR": "4", "EXCURSION": "4", "GUIDED": "4", "DAY TRIP": "4",
  "TOUR BUS": "4", "GUIDED TOUR": "4", "ISLAND TOUR": "4",
  
  // Vibe 5: boat-trips-cruises
  "BOAT": "5", "CRUISE": "5", "CATAMARAN": "5", "WHALE": "5", "DOLPHIN": "5", "SAILING": "5", "YACHT": "5",
  "WHALE WATCHING": "5",
  
  // Vibe 6: shows-entertainment
  "SHOW": "6", "TICKET SHOW": "6", "DINNER SHOW": "6", "MUSIC": "6", "COMEDY": "6", "NIGHT SHOW": "6",
  "ENTERTAINMENT": "6", "PERFORMANCE": "6", "CONCERT": "6", "THEATER": "6", "CABARET": "6", "FLAMENCO": "6",
  
  // Vibe 7: water-sports
  "JET SKI": "7", "KAYAK": "7", "PADDLE": "7", "SUP": "7", "PARASAILING": "7", "BANANA": "7", "FLYBOARD": "7",
  "WATER SPORT": "7", "SURFING": "7",
  
  // Vibe 8: cable-car-observatory
  "CABLE CAR": "8", "TELEFERICO": "8", "OBSERVATORY": "8", "OBSERVATORIO": "8", "SUMMIT": "8",
  "STARGAZING": "8", "ASTRONOMY": "8",
  
  // Vibe 9: diving-fishing
  "DIVE": "9", "DIVING": "9", "SNORKEL": "9", "FISHING": "9", "PESCAR": "9", "SCUBA": "9",
  "DEEP SEA": "9", "UNDERWATER": "9", "SNORKELING": "9",
  
  // Vibe 10: adventure-nature
  "HIKE": "10", "HIKING": "10", "TREKKING": "10", "TRAIL": "10", "NATURE": "10",
  "QUAD": "10", "BUGGY": "10", "JEEP": "10", "OFFROAD": "10", "OFF-ROAD": "10",
  "ADVENTURE": "10", "WILDLIFE": "10", "FOREST": "10", "MOUNTAIN": "10",
  
  // Vibe 11: gastronomy-tastings
  "WINE": "11", "TASTING": "11", "FOOD": "11", "GASTRO": "11", "TAPAS": "11", "RESTAURANT": "11", "DEGUSTATION": "11",
  "GASTRONOMY": "11", "FOOD TOUR": "11", "CULINARY": "11",
  
  // Vibe 12: car-rental
  "CAR RENTAL": "12", "RENT A CAR": "12", "COCHE": "12", "AUTO": "12", "VEHICLE RENTAL": "12",
  "VEHICLE": "12", "AUTOMOBILE": "12",
  
  // Vibe 13: bike-rental
  "BIKE": "13", "EBIKE": "13", "BICYCLE": "13", "MTB": "13", "CYCLING": "13", "SCOOTER": "13",
  "BIKE RENTAL": "13", "BIKE TOUR": "13", "MOUNTAIN BIKE": "13",
  
  // Vibe 14: transfers-transport
  "TRANSFER": "14", "AIRPORT": "14", "SHUTTLE": "14", "TAXI": "14", "TRANSPORT": "14", "PICKUP": "14", "DROPOFF": "14",
  "DROP OFF": "14",
}

/**
 * Get vibe ID from Atlantico input (category code, keyword, etc.)
 * @param input - Atlantico category code, keyword, or classification
 * @returns Vibe ID (1-14) or null if not found
 */
export function getVibeIdFromCategory(input: string | number | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null
  }
  
  // Normalize to string, trim, and uppercase for matching
  const normalized = String(input).trim().toUpperCase()
  
  // Direct lookup
  const vibeId = ATLANTICO_TO_VIBE[normalized]
  if (vibeId) {
    return vibeId
  }
  
  // Try partial matching for keywords (if input contains a keyword)
  for (const [key, value] of Object.entries(ATLANTICO_TO_VIBE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }
  
  return null
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getVibeIdFromCategory instead
 */
export function getVibeIdFromClassification(classificationCode: string | null | undefined): string | null {
  return getVibeIdFromCategory(classificationCode)
}

