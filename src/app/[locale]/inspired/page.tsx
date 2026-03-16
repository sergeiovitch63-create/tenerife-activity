import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { MarcoInspiredHero } from './MarcoInspiredHero.client'

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
  return (
    <main className="min-h-screen w-full overflow-hidden bg-[#0d2b35] text-white relative">
      <MarcoInspiredHero />
    </main>
  )
}
