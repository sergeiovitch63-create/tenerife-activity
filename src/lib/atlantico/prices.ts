/**
 * Utilities for parsing loadPrices response
 */

/**
 * Parse loadPrices response to extract adult/child/infant prices
 */
export function parseLoadPricesResponse(raw: any): {
  adult: number | null
  child: number | null
  infant: number | null
} {
  const result = {
    adult: null as number | null,
    child: null as number | null,
    infant: null as number | null,
  }

  if (!raw) {
    return result
  }

  // Format 1: String with pipe-separated values "ADULT|CHILD|INFANT|..."
  if (typeof raw === 'string') {
    const parts = raw.split('|').map((p) => {
      const num = parseFloat(p.trim())
      return isNaN(num) || num <= 0 ? null : num
    })

    if (parts.length > 0 && parts[0] !== null) {
      result.adult = parts[0]
    }
    if (parts.length > 1 && parts[1] !== null) {
      result.child = parts[1]
    }
    if (parts.length > 2 && parts[2] !== null) {
      result.infant = parts[2]
    }
    return result
  }

  // Format 2: Object with adult/child/infant properties
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    // Priority 1: Atlantico PVPA/PVPC/PVPOS fields (preferred - these are the actual prices)
    // PVPA = Price Adult, PVPC = Price Child, PVPOS = Price Other
    if (result.adult === null) {
      const pvpa = raw.PVPA || raw.pvpa
      if (typeof pvpa === 'number' && pvpa > 0) {
        result.adult = pvpa
      } else if (typeof pvpa === 'string') {
        const parsed = parseFloat(pvpa.trim())
        if (!isNaN(parsed) && parsed > 0) {
          result.adult = parsed
        }
      }
    }
    if (result.child === null) {
      const pvpc = raw.PVPC || raw.pvpc
      if (typeof pvpc === 'number' && pvpc > 0) {
        result.child = pvpc
      } else if (typeof pvpc === 'string') {
        const parsed = parseFloat(pvpc.trim())
        if (!isNaN(parsed) && parsed > 0) {
          result.child = parsed
        }
      }
    }
    if (result.infant === null) {
      const pvpos = raw.PVPOS || raw.pvpos
      if (typeof pvpos === 'number' && pvpos > 0) {
        result.infant = pvpos
      } else if (typeof pvpos === 'string') {
        const parsed = parseFloat(pvpos.trim())
        if (!isNaN(parsed) && parsed > 0) {
          result.infant = parsed
        }
      }
    }

    // Priority 2: Standard fields
    if (result.adult === null && typeof raw.adult === 'number' && raw.adult > 0) {
      result.adult = raw.adult
    }
    if (result.child === null && typeof raw.child === 'number' && raw.child > 0) {
      result.child = raw.child
    }
    if (result.infant === null && typeof raw.infant === 'number' && raw.infant > 0) {
      result.infant = raw.infant
    }

    // Priority 3: Atlantico-specific fields (priceA, priceS, priceC)
    if (result.adult === null && typeof raw.priceA === 'number' && raw.priceA > 0) {
      result.adult = raw.priceA
    }
    if (result.child === null && typeof raw.priceC === 'number' && raw.priceC > 0) {
      result.child = raw.priceC
    }
    if (result.adult === null && typeof raw.priceS === 'number' && raw.priceS > 0) {
      result.adult = raw.priceS
    }

    // Uppercase fields (ADULT, CHILD, TOTAL)
    if (result.adult === null && typeof raw.ADULT === 'number' && raw.ADULT > 0) {
      result.adult = raw.ADULT
    }
    if (result.child === null && typeof raw.CHILD === 'number' && raw.CHILD > 0) {
      result.child = raw.CHILD
    }
    if (result.adult === null && typeof raw.TOTAL === 'number' && raw.TOTAL > 0) {
      result.adult = raw.TOTAL
    }

    // Priority 4: Generic fields (price, amount, tariff)
    // Skip commission fields (COMA, COMC, COMOS) unless no other price exists
    if (result.adult === null && typeof raw.price === 'number' && raw.price > 0) {
      result.adult = raw.price
    }
    if (result.adult === null && typeof raw.amount === 'number' && raw.amount > 0) {
      result.adult = raw.amount
    }
    if (result.adult === null && typeof raw.tariff === 'number' && raw.tariff > 0) {
      result.adult = raw.tariff
    }

    // Priority 5: Commission fields (only if no other price found)
    // COMA = Commission Adult, COMC = Commission Child, COMOS = Commission Other
    // These are typically not the final price, but may be used as last resort
    if (result.adult === null) {
      const coma = raw.COMA || raw.coma
      if (typeof coma === 'number' && coma > 0) {
        result.adult = coma
      } else if (typeof coma === 'string') {
        const parsed = parseFloat(coma.trim())
        if (!isNaN(parsed) && parsed > 0) {
          result.adult = parsed
        }
      }
    }
    if (result.child === null) {
      const comc = raw.COMC || raw.comc
      if (typeof comc === 'number' && comc > 0) {
        result.child = comc
      } else if (typeof comc === 'string') {
        const parsed = parseFloat(comc.trim())
        if (!isNaN(parsed) && parsed > 0) {
          result.child = parsed
        }
      }
    }

    // String parsing for any numeric string fields
    if (result.adult === null && typeof raw.adult === 'string') {
      const parsed = parseFloat(raw.adult.trim())
      if (!isNaN(parsed) && parsed > 0) {
        result.adult = parsed
      }
    }
    if (result.child === null && typeof raw.child === 'string') {
      const parsed = parseFloat(raw.child.trim())
      if (!isNaN(parsed) && parsed > 0) {
        result.child = parsed
      }
    }

    return result
  }

  // Format 3: Array of price objects (take minimum > 0)
  if (Array.isArray(raw)) {
    let minAdult: number | null = null
    let minChild: number | null = null
    let minInfant: number | null = null

    for (const item of raw) {
      if (typeof item === 'object') {
        const adult = typeof item.adult === 'number' && item.adult > 0 ? item.adult : null
        const child = typeof item.child === 'number' && item.child > 0 ? item.child : null
        const infant = typeof item.infant === 'number' && item.infant > 0 ? item.infant : null

        if (adult !== null && (minAdult === null || adult < minAdult)) {
          minAdult = adult
        }
        if (child !== null && (minChild === null || child < minChild)) {
          minChild = child
        }
        if (infant !== null && (minInfant === null || infant < minInfant)) {
          minInfant = infant
        }
      } else if (typeof item === 'number' && item > 0) {
        // Simple array of numbers, use first as adult
        if (minAdult === null) {
          minAdult = item
        }
      }
    }

    result.adult = minAdult
    result.child = minChild
    result.infant = minInfant
    return result
  }

  return result
}


