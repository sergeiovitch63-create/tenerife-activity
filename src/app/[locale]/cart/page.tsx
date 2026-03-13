/**
 * Cart Page - Order Summary (recap)
 *
 * Atlantico-style layout: Order Summary left, Basket Summary right.
 * Group names are fetched server-side (from cart cookie) for first-render display.
 */

import { cookies } from 'next/headers'
import { CartPageClient } from './CartPageClient'
import { parseCartCookie } from '@/lib/cart/cookie'
import { fetchGroupNamesForCart } from '@/lib/cart/fetch-group-names.server'

export default async function CartPage() {
  const cookieStore = await cookies()
  const cartCookie = cookieStore.get('cart-items')?.value
  const cartItems = parseCartCookie(cartCookie)

  let groupNames: Record<string, string> = {}
  if (cartItems.length > 0) {
    groupNames = await fetchGroupNamesForCart(cartItems)
  }

  return <CartPageClient groupNames={groupNames} />
}
