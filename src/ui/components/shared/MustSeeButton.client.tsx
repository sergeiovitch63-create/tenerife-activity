'use client'

import { useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'
import { Button } from './Button'
import { trackingProvider } from '@/config/tracking'

interface MustSeeButtonProps {
  size?: 'sm' | 'md' | 'lg'
}

export function MustSeeButton({ size = 'lg' }: MustSeeButtonProps) {
  const router = useRouter()
  const t = useTranslations('common')

  const handleClick = () => {
    trackingProvider.track({ type: 'must_see_cta_clicked' })
    // router.push() from @/navigation automatically handles locale prefixes
    router.push('/must-see')
  }

  return (
    <Button variant="secondary" size={size} onClick={handleClick}>
      {t('mustSee')}
    </Button>
  )
}

