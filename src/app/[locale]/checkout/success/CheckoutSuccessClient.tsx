/**
 * Checkout Success Client Component
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/ui/components/shared/Button'

interface CheckoutSuccessClientProps {
  locale: string
}

export function CheckoutSuccessClient({ locale }: CheckoutSuccessClientProps) {
  const t = useTranslations('checkout.success')
  const router = useRouter()

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-glass-900 mb-4">{t('title')}</h1>
        <p className="text-lg text-glass-600 mb-8">{t('message')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="primary" onClick={() => router.push(`/${locale}`)}>
          {t('backToHome')}
        </Button>
        <Button variant="secondary" onClick={() => router.push(`/${locale}/cart`)}>
          {t('viewCart')}
        </Button>
      </div>
    </div>
  )
}
