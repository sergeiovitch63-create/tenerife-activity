'use client'

import { Section, Container, Stack } from '@/ui/components/layout'
import { Button } from '@/ui/components/shared/Button'
import { useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'

export function PartnersSection() {
  const router = useRouter()
  const t = useTranslations('partners.section')

  const handleWorkWithUs = () => {
    router.push('/partners')
  }

  return (
    <Section variant="default" background="default">
      <Container size="lg">
        <Stack direction="column" gap="lg" align="center">
          {/* Section Header */}
          <div className="text-center space-y-4 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              {t('title')}
            </h2>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-md">
              {t('subtitle')}
            </p>
          </div>

          {/* Benefits List */}
          <div className="w-full max-w-2xl">
            <ul className="space-y-3 md:space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ocean-400 mt-2.5" />
                <span className="text-base md:text-lg text-white/90 leading-relaxed font-light drop-shadow-sm">
                  {t('benefits.commission')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ocean-400 mt-2.5" />
                <span className="text-base md:text-lg text-white/90 leading-relaxed font-light drop-shadow-sm">
                  {t('benefits.legal')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ocean-400 mt-2.5" />
                <span className="text-base md:text-lg text-white/90 leading-relaxed font-light drop-shadow-sm">
                  {t('benefits.zeroWork')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ocean-400 mt-2.5" />
                <span className="text-base md:text-lg text-white/90 leading-relaxed font-light drop-shadow-sm">
                  {t('benefits.value')}
                </span>
              </li>
            </ul>
          </div>

          {/* CTA Button */}
          <div className="pt-2 space-y-3">
            <p className="text-sm md:text-base text-white/80 text-center">
              {t('trust')}
            </p>
            <Button variant="secondary" size="lg" onClick={handleWorkWithUs}>
              {t('button')}
            </Button>
          </div>
        </Stack>
      </Container>
    </Section>
  )
}

