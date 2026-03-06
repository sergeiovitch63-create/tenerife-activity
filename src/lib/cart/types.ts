/**
 * Cart types and interfaces
 * 
 * Defines the structure of cart items and related types
 */

export interface PriceSnapshot {
  adult: number
  child: number
  infant: number
  total: number
}

export interface CartItem {
  // Identifiers
  t_group: string // Tour group ID
  t_id: string // Event ID
  /** Tour/activity display name (from group details, stored when adding from group-details page) */
  tourName?: string

  // Language and date/time
  language: string // Language code (e.g., 'ENG', 'ESP')
  tourDate: string | null // YYYY-MM-DD format or null for calendarMode === 'none'
  sesTime: string | null // HH:mm format or null for calendarMode === 'none'
  /** Combination (Twin Ticket): second date for Loro Parque */
  tourDate2?: string | null
  isCombination?: boolean // true = Siam Park + Loro Parque (group 168)
  /** Date range (car rental group 165): end date of rental */
  tourDateEnd?: string | null
  isDateRange?: boolean // true = car rental, requires tourDate + tourDateEnd
  calendarMode?: 'sessions' | 'dates' | 'wdays_only' | 'none' // Calendar mode from limits
  
  // Session identifiers (from loadLimits.sessionsByDate)
  sessionId?: string // Session identifier from Atlantico API
  TipoReservaId?: string // TipoReservaId from Atlantico API
  rcId?: string // rcId from Atlantico API (for debug)
  
  // Participants
  adults: number
  childs: number
  infants: number
  
  // Optional pickup fields
  hotel?: string
  room?: string
  mpoint?: string // Meeting point
  mtime?: string // Meeting time
  notes?: string
  
  // Pricing snapshot (captured at add time)
  priceSnapshot: PriceSnapshot
  currency: string
  
  // Metadata
  addedAt: number // Timestamp
  expiresAt: number // TTL 15 minutes from addedAt
  
  // Unique key for this item (for removal/update)
  itemKey: string // Generated: `${t_group}-${t_id}-${tourDate}-${sesTime}`
}

/**
 * Generate a unique key for a cart item
 * Handles null tourDate/sesTime for calendarMode === 'none'
 */
export function generateCartItemKey(item: Pick<CartItem, 't_group' | 't_id' | 'tourDate' | 'sesTime' | 'tourDate2' | 'tourDateEnd'>): string {
  const tourDate = item.tourDate ?? 'null'
  const sesTime = item.sesTime ?? 'null'
  const tourDate2 = item.tourDate2 ?? 'null'
  const tourDateEnd = item.tourDateEnd ?? 'null'
  return `${item.t_group}-${item.t_id}-${tourDate}-${sesTime}-${tourDate2}-${tourDateEnd}`
}

/**
 * Check if a cart item is expired
 */
export function isCartItemExpired(item: CartItem): boolean {
  return Date.now() > item.expiresAt
}

/**
 * Create a new cart item with TTL of 15 minutes
 */
export function createCartItem(data: Omit<CartItem, 'itemKey' | 'addedAt' | 'expiresAt'>): CartItem {
  const now = Date.now()
  const ttlMs = 15 * 60 * 1000 // 15 minutes
  
  return {
    ...data,
    itemKey: generateCartItemKey(data),
    addedAt: now,
    expiresAt: now + ttlMs,
  }
}




