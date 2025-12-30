'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { Section, Container, Stack } from '@/ui/components/layout'
import { Button } from '@/ui/components/shared'
import type { Experience } from '@/core/entities/experience'

interface BookingRedirectClientProps {
  experience: Experience | null
}

function BookingRedirectClientContent({ experience }: BookingRedirectClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations('booking')
  const tCommon = useTranslations('common')
  const [countdown, setCountdown] = useState(800)

  const experienceSlug = searchParams.get('experience') || ''
  const clickId = searchParams.get('click_id')
  const utmSource = searchParams.get('utm_source')

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      // In production, this would redirect to operator booking URL
      // For now, redirect back to experience page
      if (experienceSlug) {
        router.push(`/experience/${experienceSlug}`)
      } else {
        router.push('/')
      }
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 100)
    }, 100)

    return () => clearTimeout(timer)
  }, [countdown, experienceSlug, router])

  const handleContinue = () => {
    if (experienceSlug) {
      router.push(`/experience/${experienceSlug}`)
    } else {
      router.push('/')
    }
  }

  // Fallback if no experience
  if (!experience) {
    return (
      <Section variant="default" background="default">
        <Container size="md">
          <div className="text-center py-16 space-y-6">
            <h1 className="text-3xl md:text-4xl font-bold text-glass-900">
              {t('missingInfo')}
            </h1>
            <p className="text-lg text-glass-600 max-w-md mx-auto">
              {t('selectExperience')}
            </p>
            <Link href="/">
              <Button variant="primary" size="lg">
                {tCommon('backToHome')}
              </Button>
            </Link>
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <>
      {/* Redirect Header */}
      <Section variant="default" background="subtle">
        <Container size="md">
          <Stack direction="column" gap="md" align="center">
            <div className="text-center space-y-4 max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold text-glass-900">
                {t('redirecting')}
              </h1>
              <p className="text-lg text-glass-600">
                {experience.title}
              </p>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* Summary Section */}
      <Section variant="default" background="default">
        <Container size="md">
          <div className="bg-white border border-glass-200 rounded-lg p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-glass-900">
                {t('bookingSummary')}
              </h2>
              <div className="space-y-1 text-base text-glass-700">
                <p>
                  <span className="font-medium">{t('summary.experience')}</span>{' '}
                  {experience.title}
                </p>
                {experience.location && (
                  <p>
                    <span className="font-medium">{t('summary.location')}</span>{' '}
                    {experience.location}
                  </p>
                )}
                {experience.duration && (
                  <p>
                    <span className="font-medium">{t('summary.duration')}</span>{' '}
                    {experience.duration}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-glass-100">
              <p className="text-sm text-glass-600">
                {t('countdownMessage', { countdown: Math.ceil(countdown / 1000) })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleContinue}
              >
                {t('continueToBooking')}
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}

export function BookingRedirectClient(props: BookingRedirectClientProps) {
  return (
    <Suspense fallback={null}>
      <BookingRedirectClientContent {...props} />
    </Suspense>
  )
}
