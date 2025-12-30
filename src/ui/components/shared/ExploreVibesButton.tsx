'use client'

import { Button } from './Button'
import { trackingProvider } from '@/config/tracking'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export function ExploreVibesButton() {
  const t = useTranslations('home')
  const handleClick = () => {
    trackingProvider.track({ type: 'search_performed', query: 'explore vibes' })
  }

  return (
    <Link href="#vibes" onClick={handleClick}>
      <Button variant="primary" size="lg">
        {t('exploreVibes')}
      </Button>
    </Link>
  )
}







