/**
 * Server-side: fetch revalidation and meeting points for checkout.
 * Reads cart from cookie, calls revalidate API and event-details for meeting points.
 */

import { parseCartCookieFull, type CartCookieFullItem } from '@/lib/cart/cookie'

const CART_COOKIE_NAME = 'cart-items'

export interface RevalidationResult {
  items: Array<Record<string, unknown> & { itemKey: string; priceChanged?: boolean; priceDiff?: number; available?: boolean; newPriceSnapshot?: unknown }>
  errors: Array<{ itemKey: string; error: string; field?: string }>
  hasPriceChanges: boolean
  hasAvailabilityIssues: boolean
}

export interface MeetingPointsMap {
  [itemKey: string]: Array<unknown>
}

async function fetchRevalidate(
  items: CartCookieFullItem[],
  origin: string
): Promise<RevalidationResult | null> {
  try {
    const res = await fetch(`${origin}/api/atlantico/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as RevalidationResult
    return data
  } catch {
    return null
  }
}

async function fetchMeetingPoints(
  items: CartCookieFullItem[],
  origin: string
): Promise<MeetingPointsMap> {
  const eventIds = Array.from(new Set(items.map((i) => i.t_id)))
  if (eventIds.length === 0) return {}
  const lang = items[0]?.language || 'ENG'
  const map: MeetingPointsMap = {}
  await Promise.all(
    eventIds.map(async (eventId) => {
      try {
        const res = await fetch(
          `${origin}/api/atlantico/event-details?eventId=${encodeURIComponent(eventId)}&lang=ENG`,
          { cache: 'no-store' }
        )
        if (!res.ok) return
        const data = (await res.json()) as { meetingPoints?: unknown[] }
        const points = data.meetingPoints
        if (points && Array.isArray(points)) {
          items.forEach((item) => {
            if (item.t_id === eventId) map[item.itemKey] = points
          })
        }
      } catch {
        // ignore
      }
    })
  )
  return map
}

export async function fetchCheckoutData(
  cartCookieValue: string | undefined,
  origin: string
): Promise<{
  revalidationResult: RevalidationResult | null
  meetingPoints: MeetingPointsMap
}> {
  const items = parseCartCookieFull(cartCookieValue)
  if (items.length === 0) {
    return { revalidationResult: null, meetingPoints: {} }
  }
  const [revalidationResult, meetingPoints] = await Promise.all([
    fetchRevalidate(items, origin),
    fetchMeetingPoints(items, origin),
  ])
  return {
    revalidationResult,
    meetingPoints,
  }
}
