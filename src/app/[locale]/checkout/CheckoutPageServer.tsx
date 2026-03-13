/**
 * Server component: fetches revalidation + meeting points from cart cookie,
 * passes them to CheckoutClient for first-render display.
 */

import { cookies, headers } from 'next/headers'
import { CheckoutClient } from './CheckoutClient'
import { fetchCheckoutData } from '@/lib/checkout/fetch-checkout-data.server'

interface CheckoutPageServerProps {
  locale: string
}

export async function CheckoutPageServer({ locale }: CheckoutPageServerProps) {
  const cookieStore = await cookies()
  const cartCookie = cookieStore.get('cart-items')?.value

  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = envBase || `${protocol}://${host}`

  const { revalidationResult, meetingPoints } = await fetchCheckoutData(
    cartCookie,
    origin
  )

  return (
    <CheckoutClient
      locale={locale}
      initialRevalidationResult={revalidationResult}
      initialMeetingPoints={meetingPoints as Record<string, import('@/app/api/atlantico/event-details/route').MeetingPoint[]>}
    />
  )
}
