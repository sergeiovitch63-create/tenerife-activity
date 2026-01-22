/**
 * Checkout Cancel Page
 * 
 * Displays cancellation message
 */

'use client'

import { useRouter } from '@/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/ui/components/shared/Button'
import { Section, Container } from '@/ui/components/layout'

export default function CheckoutCancelPage() {
  const t = useTranslations('checkout.cancel')
  const locale = useLocale()
  const router = useRouter()

  return (
    <Section variant="default" background="default">
      <Container size="lg">
        <div className="py-12 text-center space-y-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
            <h1 className="text-3xl font-bold text-glass-900 mb-2">{t('title')}</h1>
            <p className="text-lg text-glass-600 mb-4">{t('description')}</p>
            <p className="text-base text-glass-700">{t('message')}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" onClick={() => router.push('/cart')}>
              {t('backToCart')}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/')}>
              {t('backToHome')}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  )
}
