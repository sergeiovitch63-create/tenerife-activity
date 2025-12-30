import { Section, Container, Stack } from '@/ui/components/layout'
import { Breadcrumb } from '@/ui/components/navigation'
import { ExperienceHero } from '@/ui/components/experience'
import { BookingCard } from '@/ui/components/booking'
import { experienceRepository } from '@/config/repositories'
import { vibeRepository } from '@/config/repositories'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/navigation'
import { getTranslatedVibeTitle } from '@/ui/components/vibe/vibe-translations'
import { buildMetadata } from '@/lib/seo'
import { type Locale } from '@/i18n/request'
import { siteName } from '@/config/site'

interface ExperiencePageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({
  params,
}: ExperiencePageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const experience = await experienceRepository.findBySlug(slug)
  const tSeo = await getTranslations({ locale, namespace: 'seo' })

  if (!experience) {
    return {
      title: tSeo('experience.notFoundTitle'),
    }
  }

  return buildMetadata({
    locale: locale as Locale,
    pathname: `/experience/${slug}`,
    title: tSeo('experience.titleTemplate', { experience: experience.title }),
    description: experience.shortDescription || experience.description || tSeo('experience.descriptionTemplate', { experience: experience.title }),
  })
}

export default async function ExperiencePage({ params }: ExperiencePageProps) {
  const { locale, slug } = await params
  const experience = await experienceRepository.findBySlug(slug)

  if (!experience) {
    notFound()
  }

  // Get vibe for breadcrumb
  const vibe = await vibeRepository.findById(experience.vibeId)
  const t = await getTranslations()
  const tVibes = await getTranslations({ locale, namespace: 'vibes' })
  const { getTranslatedVibeTitle } = await import('@/ui/components/vibe/vibe-translations')
  
  // Build breadcrumb items
  const breadcrumbItems = [
    { label: t('common.siteName'), href: '/' },
    ...(vibe
      ? [{ label: getTranslatedVibeTitle(vibe.slug, tVibes, vibe.title), href: `/vibe/${vibe.slug}` }]
      : []),
    { label: experience.title },
  ]

  return (
    <>
      {/* Breadcrumb */}
      <Section variant="tight" background="subtle">
        <Container size="lg">
          <Breadcrumb items={breadcrumbItems} />
        </Container>
      </Section>

      {/* Hero Section */}
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <ExperienceHero experience={experience} />
          </div>
        </Container>
      </Section>

      {/* Main Content & Booking Card */}
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overview */}
              {experience.description && (
                <div className="glass-panel p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-glass-900 mb-4">
                    {t('experience.overview')}
                  </h2>
                  <div className="prose prose-glass-900 max-w-none">
                    <p className="text-base text-glass-700 leading-relaxed whitespace-pre-line">
                      {experience.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Highlights */}
              {experience.highlights && experience.highlights.length > 0 && (
                <div className="glass-panel p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-glass-900 mb-4">
                    {t('experience.highlights')}
                  </h2>
                  <ul className="space-y-3">
                    {experience.highlights.map((highlight, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-base text-glass-700"
                      >
                        <span className="text-ocean-600 flex-shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What's Included */}
              {experience.included && experience.included.length > 0 && (
                <div className="glass-panel p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-glass-900 mb-4">
                    {t('experience.whatsIncluded')}
                  </h2>
                  <ul className="space-y-3">
                    {experience.included.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-base text-glass-700"
                      >
                        <span className="text-ocean-600 flex-shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Meeting Point */}
              {experience.meetingPoint && (
                <div className="glass-panel p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-glass-900 mb-4">
                    {t('experience.meetingPoint')}
                  </h2>
                  <p className="text-base text-glass-700 leading-relaxed">
                    {experience.meetingPoint}
                  </p>
                </div>
              )}

            </div>

            {/* Booking Card (Sticky) */}
            <div className="lg:col-span-1">
              <Suspense fallback={null}>
                <BookingCard
                  experienceId={experience.id}
                  experienceSlug={experience.slug}
                  price={experience.price}
                  currency={experience.currency || 'EUR'}
                />
              </Suspense>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}

