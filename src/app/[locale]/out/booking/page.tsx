import { Section, Container } from '@/ui/components/layout'
import { BookingRedirectClient } from './BookingRedirectClient'
import { experienceRepository } from '@/config/repositories'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

interface BookingPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ experience?: string; click_id?: string; utm_source?: string }>
}

export async function generateMetadata({
  params,
}: BookingPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'booking' })

  return {
    title: `${t('title')} | Tenerife Activity`,
    description: t('redirecting'),
  }
}

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const { experience: experienceSlug } = await searchParams

  // Fetch experience if slug provided
  const experience = experienceSlug
    ? await experienceRepository.findBySlug(experienceSlug)
    : null

  return (
    <>
      <Suspense fallback={null}>
        <BookingRedirectClient experience={experience} />
      </Suspense>
    </>
  )
}







