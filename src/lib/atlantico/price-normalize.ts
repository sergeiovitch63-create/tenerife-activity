/**
 * Normalize price from raw Atlantico data
 * Returns first price > 0 from common price fields
 */

/**
 * Normalize price from raw object
 * Checks multiple price field variations in order of preference
 */
export function normalizePriceFromRaw(raw: any): number | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  // Try common price fields in order of preference
  // First: Atlantico-specific fields (priceA, priceS, priceC, priceV)
  // Then: Generic fields (price, amount, tariff)
  // Finally: Typed fields (ADULT, CHILD, TOTAL)
  const priceFields = [
    'priceA',      // Adult price (Atlantico)
    'priceS',      // Standard price (Atlantico)
    'priceC',      // Child price (Atlantico)
    'priceV',      // Variant price (Atlantico)
    'price',       // Generic price
    'amount',      // Generic amount
    'tariff',     // Tariff
    'ADULT',      // Adult (uppercase)
    'adult',      // Adult (lowercase)
    'CHILD',      // Child (uppercase)
    'child',      // Child (lowercase)
    'TOTAL',      // Total (uppercase)
    'total',      // Total (lowercase)
  ]
  
  for (const field of priceFields) {
    const value = raw[field]
    if (typeof value === 'number' && value > 0) {
      return value
    }
    // Also try string parsing
    if (typeof value === 'string') {
      const parsed = parseFloat(value.trim())
      if (!isNaN(parsed) && parsed > 0) {
        return parsed
      }
    }
  }

  return null
}


