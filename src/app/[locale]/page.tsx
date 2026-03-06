import { Suspense } from 'react'
import { ScrollToVibes } from './ScrollToVibes'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { vibeRepository } from '@/config/repositories'
import { experienceRepository } from '@/config/repositories'
import { buildMetadata } from '@/lib/seo'
import { type Locale } from '@/i18n/request'
import { HomePageWithCuration } from './HomePageWithCuration'

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
  const allExperiences = await experienceRepository.findAll()
  const t = await getTranslations()

  return (
    <>
      <Suspense fallback={null}>
        <ScrollToVibes />
      </Suspense>
      <HomePageWithCuration
        locale={locale}
        vibes={vibes}
        allExperiences={allExperiences}
        t={t}
      />
    </>
  )
}

