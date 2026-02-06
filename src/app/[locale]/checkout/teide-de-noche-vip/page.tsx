/**
 * Checkout page for Teide de Noche VIP
 * 3-step checkout process: Resumen -> Datos personales -> Medios de pago
 */

import { notFound } from 'next/navigation'
import { CheckoutClient } from './CheckoutClient'

interface CheckoutPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { locale } = await params
  const query = await searchParams

  // Extract required parameters
  const code = typeof query.code === 'string' ? query.code : null
  const date = typeof query.date === 'string' ? query.date : null
  const adults = typeof query.adults === 'string' ? parseInt(query.adults, 10) : null
  const price = typeof query.price === 'string' ? parseFloat(query.price) : null
  const currency = typeof query.currency === 'string' ? query.currency : 'EUR'
  const option = typeof query.option === 'string' ? query.option : null

  // Validate required parameters
  if (!code || !date || !adults || adults < 1 || !price || price <= 0) {
    return (
      <div className="min-h-screen bg-glass-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-glass-900 mb-4">Invalid Checkout Parameters</h1>
          <p className="text-glass-600 mb-6">
            Some required information is missing. Please return to the activity page and try again.
          </p>
          <a
            href={`/${locale}/activities/teide-de-noche-vip`}
            className="inline-block px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors"
          >
            Return to Activity
          </a>
        </div>
      </div>
    )
  }

  return (
    <CheckoutClient
      locale={locale}
      code={code}
      date={date}
      adults={adults}
      price={price}
      currency={currency}
      option={option}
    />
  )
}















