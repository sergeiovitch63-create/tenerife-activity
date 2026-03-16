import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { InspiredMarcoPage } from './InspiredMarcoPage.client'
import { experienceRepository } from '@/config/repositories'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.inspired' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function InspiredPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  await params
  const allExperiences = await experienceRepository.findAll()

  return <InspiredMarcoPage activities={allExperiences} />
}
