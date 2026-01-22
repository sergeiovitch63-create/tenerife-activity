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
  
  // Language and date/time
  language: string // Language code (e.g., 'ENG', 'ESP')
  tourDate: string // YYYY-MM-DD format
  sesTime: string // HH:mm format or "00:00" if no session (obligatoire si sessions existent)
  
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
 */
export function generateCartItemKey(item: Pick<CartItem, 't_group' | 't_id' | 'tourDate' | 'sesTime'>): string {
  return `${item.t_group}-${item.t_id}-${item.tourDate}-${item.sesTime}`
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




