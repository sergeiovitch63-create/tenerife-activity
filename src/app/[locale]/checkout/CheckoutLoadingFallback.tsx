'use client'

import { useTranslations } from 'next-intl'
import { Section, Container } from '@/ui/components/layout'

export function CheckoutLoadingFallback() {
  const t = useTranslations('checkout')
  return (
    <Section variant="default" background="default">
      <Container size="lg">
        <div className="py-12 text-center">
          <p className="text-glass-600">{t('revalidating')}</p>
        </div>
      </Container>
    </Section>
  )
}
