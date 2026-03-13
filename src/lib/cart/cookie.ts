/**
 * Cart cookie - syncs cart data for server-side use
 *
 * - Group names fetch: needs { t_group, language }
 * - Checkout revalidation: needs full CartItem[]
 *
 * Client stores full items; server parses for both use cases.
 */

const CART_COOKIE_NAME = 'cart-items'
const CART_COOKIE_MAX_AGE = 3600 // 1 hour

export interface CartCookieItem {
  t_group: string
  language: string
}

/** Full cart item shape for checkout (minimal for cookie size) */
export type CartCookieFullItem = Record<string, unknown> & {
  t_group: string
  t_id: string
  language: string
  tourDate: string | null
  sesTime: string | null
  itemKey: string
  adults: number
  childs?: number
  infants?: number
  priceSnapshot?: { adult: number; child: number; infant: number; total: number }
  currency?: string
  [key: string]: unknown
}

/**
 * Set cart cookie from items (client-only, called from persist storage)
 * Stores full items for checkout; cart page extracts t_group/language for group names
 */
export function setCartCookie(items: CartCookieFullItem[]): void {
  if (typeof document === 'undefined') return
  const payload = JSON.stringify(items)
  document.cookie = `${CART_COOKIE_NAME}=${encodeURIComponent(payload)}; path=/; max-age=${CART_COOKIE_MAX_AGE}; SameSite=Lax`
}

/**
 * Parse cart cookie for group names (t_group, language)
 */
export function parseCartCookie(value: string | undefined): CartCookieItem[] {
  const full = parseCartCookieFull(value)
  return full.map((i) => ({ t_group: i.t_group, language: i.language }))
}

/**
 * Parse cart cookie for checkout (full CartItem-like objects)
 */
export function parseCartCookieFull(value: string | undefined): CartCookieFullItem[] {
  if (!value?.trim()) return []
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is CartCookieFullItem =>
        x &&
        typeof x === 'object' &&
        typeof (x as CartCookieFullItem).t_group === 'string' &&
        typeof (x as CartCookieFullItem).t_id === 'string' &&
        typeof (x as CartCookieFullItem).itemKey === 'string'
    )
  } catch {
    return []
  }
}
