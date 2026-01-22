/**
 * Checkout Cancel Client Component
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/ui/components/shared/Button'

interface CheckoutCancelClientProps {
  locale: string
}

export function CheckoutCancelClient({ locale }: CheckoutCancelClientProps) {
  const t = useTranslations('checkout.cancel')
  const router = useRouter()

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-glass-900 mb-4">{t('title')}</h1>
        <p className="text-lg text-glass-600 mb-8">{t('message')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="primary" onClick={() => router.push(`/${locale}/cart`)}>
          {t('backToCart')}
        </Button>
        <Button variant="secondary" onClick={() => router.push(`/${locale}`)}>
          {t('backToHome')}
        </Button>
      </div>
    </div>
  )
}




