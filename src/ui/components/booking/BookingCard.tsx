'use client'

import { useRouter } from '@/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/ui/lib/cn'
import { Button } from '@/ui/components/shared'
import { trackingProvider } from '@/config/tracking'
import { buildBookingRedirectUrl } from '@/lib/attribution/url-builder'
import { getAttribution } from '@/lib/attribution/storage'

interface BookingCardProps {
  experienceId: string
  experienceSlug: string
  price: number
  currency: string
  availabilityHint?: string
  className?: string
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function BookingCard({
  experienceId,
  experienceSlug,
  price,
  currency,
  availabilityHint,
  className,
}: BookingCardProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('experience')

  const handleCheckAvailability = () => {
    const attribution = getAttribution()
    const hasClickId = !!attribution?.clickId

    // Track booking CTA click
    trackingProvider.track({
      type: 'click_booking_cta',
      experienceId,
    })

    // Track redirect initiation with attribution info
    trackingProvider.track({
      type: 'booking_redirect_initiated',
      experienceId,
      hasClickId,
    })

    // Build redirect URL with attribution
    const redirectUrl = buildBookingRedirectUrl(experienceSlug, locale)
    router.push(redirectUrl)
  }

  return (
    <div
      className={cn(
        'bg-white border border-glass-200 rounded-lg p-6 space-y-4',
        'lg:sticky lg:top-6',
        className
      )}
    >
      <div className="space-y-3">
        <div>
          <span className="text-xs text-glass-500">{t('startingFrom')}</span>
          <div className="text-3xl font-bold text-glass-900">
            {formatPrice(price, currency)}
          </div>
        </div>

        {availabilityHint && (
          <p className="text-sm text-glass-600">{availabilityHint}</p>
        )}
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleCheckAvailability}
      >
        {t('checkAvailability')}
      </Button>

      <p className="text-xs text-glass-500 text-center">
        {t('redirectMessage')}
      </p>

      <div className="pt-3 border-t border-glass-100">
        <p className="text-xs text-glass-500 text-center">
          {t('operatedBy')}
        </p>
      </div>
    </div>
  )
}

