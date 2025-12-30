import { Section, Container, Stack } from '@/ui/components/layout'
import { VibePageClient } from './VibePageClient'
import { vibeRepository } from '@/config/repositories'
import { experienceRepository } from '@/config/repositories'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getTranslatedVibeTitle } from '@/ui/components/vibe/vibe-translations'
import { buildMetadata } from '@/lib/seo'
import { type Locale } from '@/i18n/request'
import { siteName } from '@/config/site'

interface VibePageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({
  params,
}: VibePageProps): Promise<Metadata> {
  const { slug, locale } = await params
  const vibe = await vibeRepository.findBySlug(slug)

  const tSeo = await getTranslations({ locale, namespace: 'seo' })
  const tVibes = await getTranslations({ locale, namespace: 'vibes' })

  if (!vibe) {
    return {
      title: tSeo('vibe.notFoundTitle'),
    }
  }

  const translatedTitle = getTranslatedVibeTitle(vibe.slug, tVibes, vibe.title)

  return buildMetadata({
    locale: locale as Locale,
    pathname: `/vibe/${slug}`,
    title: tSeo('vibe.titleTemplate', { vibe: translatedTitle }),
    description: vibe.tagline || vibe.description || tSeo('vibe.descriptionTemplate', { vibe: translatedTitle }),
  })
}

export default async function VibePage({ params }: VibePageProps) {
  const { slug, locale } = await params
  const vibe = await vibeRepository.findBySlug(slug)

  if (!vibe) {
    notFound()
  }

  // Get experiences for this vibe
  const experiences = await experienceRepository.findByVibeId(vibe.id)
  
  // Get translated vibe title
  const tVibes = await getTranslations({ locale, namespace: 'vibes' })
  const translatedTitle = getTranslatedVibeTitle(vibe.slug, tVibes, vibe.title)

  return (
    <>
      {/* Vibe Hero */}
      <Section variant="default" background="subtle">
        <Container size="lg">
          <div className="glass-panel p-6 md:p-8">
            <Stack direction="column" gap="md" align="start">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
                  {translatedTitle}
                </h1>
                {vibe.tagline && (
                  <p className="text-xl text-glass-600 leading-relaxed max-w-2xl">
                    {vibe.tagline}
                  </p>
                )}
              </div>
            </Stack>
          </div>
        </Container>
      </Section>

      {/* Filters & Experiences Listing (Client Component) */}
      <Suspense fallback={null}>
        <VibePageClient experiences={experiences} showFilters={false} />
      </Suspense>
    </>
  )
}




