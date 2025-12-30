import { Section, Container, Stack } from '@/ui/components/layout'
import { VibesList } from '@/ui/components/vibe/VibesList.client'
import { vibeRepository } from '@/config/repositories'
import { Suspense } from 'react'
import { ScrollToVibes } from './ScrollToVibes'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { RecommendationsCarousel } from '@/ui/components/recommendations'
import { HeroVideoBackground } from '@/ui/components/hero'
import { ActivityPacksSection } from '@/ui/sections/ActivityPacksSection'
import { PartnersSection } from '@/ui/sections/PartnersSection'
import { Link } from '@/navigation'
import { Button } from '@/ui/components/shared/Button'
import { buildMetadata } from '@/lib/seo'
import { type Locale } from '@/i18n/request'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo' })

  return buildMetadata({
    locale: locale as Locale,
    pathname: '/',
    title: t('home.title'),
    description: t('home.description'),
  })
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const vibes = await vibeRepository.findAll()
  const t = await getTranslations()

  return (
    <>
      <Suspense fallback={null}>
        <ScrollToVibes />
      </Suspense>
      {/* Hero Section with Video Background */}
      <div id="hero">
        <HeroVideoBackground
          src="/videos/hero.mp4"
          poster="/images/hero-poster.jpg"
          overlayClassName="bg-black/35"
        >
        <Section variant="hero" background="hero" className="flex flex-col justify-center min-h-[88vh] md:min-h-[calc(100vh-80px+400px)] pt-[calc(env(safe-area-inset-top)+24px)] md:pt-0 pb-16 md:pb-24">
          <Container size="lg">
            <Stack direction="column" gap="lg" align="center">
              <div className="text-center space-y-6 md:space-y-10 max-w-[20rem] sm:max-w-md md:max-w-2xl mx-auto px-4">
                <h1 className="text-4xl leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-lg">
                  {(() => {
                    const title = t('home.title') // "Tenerife Activity"
                    const parts = title.split(' ')
                    const firstPart = parts.slice(0, -1).join(' ') // "Tenerife"
                    const lastPart = parts[parts.length - 1] // "Activity"
                    return (
                      <>
                        {firstPart}{' '}
                        <span className="bg-gradient-to-r from-ocean-100 via-ocean-200 to-ocean-300 bg-clip-text text-transparent drop-shadow-sm">
                          {lastPart}
                        </span>
                      </>
                    )
                  })()}
                </h1>
                <p className="text-[15px] leading-6 md:text-lg text-white/95 font-light max-w-2xl mx-auto drop-shadow-md">
                  {t('home.subtitle')}
                </p>
              </div>
              {/* CTA Button - Get Inspired */}
              <div className="flex justify-center px-4">
                <Link href="/get-inspired">
                  <Button variant="secondary" size="lg">
                    {t('nav.getInspired')}
                  </Button>
                </Link>
              </div>
            </Stack>
          </Container>
        </Section>
        </HeroVideoBackground>
      </div>

      {/* Recommendations Carousel */}
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="flex flex-col items-center gap-6 md:gap-8 pt-6 md:pt-10 pb-6 md:pb-10">
            <RecommendationsCarousel />
          </div>
        </Container>
      </Section>

      {/* Choose Your Vibe Section */}
      <Section variant="loose" background="default">
        <div id="vibes" className="scroll-mt-24">
          <Container size="xl">
            <Stack direction="column" gap="lg">
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                  {t('home.chooseYourVibe')}
                </h2>
                <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-md">
                  {t('home.chooseYourVibeDescription')}
                </p>
              </div>

              {/* Vibe Rows - Progressive rendering */}
              <VibesList vibes={vibes} />
            </Stack>
          </Container>
        </div>
      </Section>

      {/* Activity Packs Section */}
      <ActivityPacksSection />

      {/* Partners Section */}
      <PartnersSection />

    </>
  )
}

