/**
 * Checkout Success Page
 * 
 * Displays success message after payment
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/ui/components/shared/Button'
import { Section, Container } from '@/ui/components/layout'

export default function CheckoutSuccessPage() {
  const t = useTranslations('checkout.success')
  const locale = useLocale()
  const router = useRouter()
  const [isSimulated, setIsSimulated] = useState(false)

  useEffect(() => {
    // Check if URL has sim=1 parameter
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('sim') === '1') {
      setIsSimulated(true)
    }
  }, [])

  return (
    <Section variant="default" background="default">
      <Container size="lg">
        <div className="py-12 text-center space-y-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
            <h1 className="text-3xl font-bold text-glass-900 mb-2">{t('title')}</h1>
            <p className="text-lg text-glass-600 mb-4">{t('description')}</p>
            {isSimulated && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-medium">⚠️ Simulated Payment (QA Mode)</p>
                <p className="text-xs text-yellow-700 mt-1">This was a test payment. No actual charge was made.</p>
              </div>
            )}
            <p className="text-base text-glass-700">{t('message')}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" onClick={() => router.push('/')}>
              {t('backToHome')}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/cart')}>
              {t('viewCart')}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  )
}
