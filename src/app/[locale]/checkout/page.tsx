/**
 * Checkout Page
 *
 * Uses CheckoutPageServer (server-fetched revalidation + meeting points) as main.
 * Suspense shows loading fallback. ErrorBoundary falls back to full recovery UI + auto-fix.
 */

import { Suspense } from 'react'
import { CheckoutPageServer } from './CheckoutPageServer'
import { CheckoutErrorBoundary } from './CheckoutErrorBoundary'
import { CheckoutLoadingFallback } from './CheckoutLoadingFallback'

interface CheckoutPageProps {
  params: Promise<{ locale: string }>
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { locale } = await params

  return (
    <CheckoutErrorBoundary>
      <Suspense fallback={<CheckoutLoadingFallback />}>
        <CheckoutPageServer locale={locale} />
      </Suspense>
    </CheckoutErrorBoundary>
  )
}
