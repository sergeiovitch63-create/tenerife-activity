import { Section, Container, Stack } from '@/ui/components/layout'
import { vibeRepository } from '@/config/repositories'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getTranslatedVibeTitle } from '@/ui/components/vibe/vibe-translations'
import { buildMetadata } from '@/lib/seo'
import { type Locale } from '@/i18n/request'
import { mapLocaleToLang } from '@/lib/atlantico/locale'
import { getClassificationNameForVibe } from '@/lib/vibes/vibe-classification-mapping'
import { VibeListingClient } from '@/components/vibe/VibeListingClient'

interface VibePageProps {
  params: Promise<{ locale: string; slug: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
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

export default async function VibePage({ params, searchParams }: VibePageProps & { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug, locale } = await params
  const vibe = await vibeRepository.findBySlug(slug)

  if (!vibe) {
    notFound()
  }

  // Get translated vibe title
  const tVibes = await getTranslations({ locale, namespace: 'vibes' })
  const translatedTitle = getTranslatedVibeTitle(vibe.slug, tVibes, vibe.title)

  // Map locale to Atlantico language code
  const atlLang = mapLocaleToLang(locale)

  // Get classification name for this vibe slug
  const classificationName = getClassificationNameForVibe(slug)
  
  // Fetch classifications and resolve classification ID
  let classificationId: string | number | null = null
  let groups: Array<{
    id: string | number
    code: string
    name: string
    desc?: string
    image?: string
    price?: number
    duration?: string
    ids?: (string | number)[]
  }> = []

  if (classificationName) {
    try {
      // Build absolute URL for Server Component fetch
      const headersList = await import('next/headers').then((m) => m.headers)
      const hdrs = headersList()
      const host = hdrs.get('host') || 'localhost:3000'
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
      const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
      const origin = envBase ? envBase : `${protocol}://${host}`

      // Fetch classifications
      const classificationsResponse = await fetch(
        `${origin}/api/atlantico/classifications?lang=${atlLang}`,
        { next: { revalidate: 300 } } // Cache for 5 minutes
      )

      if (classificationsResponse.ok) {
        const classificationsData = await classificationsResponse.json()
        
        if (classificationsData.ok && Array.isArray(classificationsData.classifications)) {
          // Find classification by name (case-insensitive, trim)
          const normalizedSearchName = classificationName.trim().toLowerCase()
          const found = classificationsData.classifications.find((c: any) => {
            const normalizedName = String(c.name || '').trim().toLowerCase()
            return normalizedName === normalizedSearchName
          })

          if (found) {
            classificationId = found.id

            // Fetch groups for this classification
            const groupsResponse = await fetch(
              `${origin}/api/atlantico/groups?lang=${atlLang}&page=-1&classificationId=${encodeURIComponent(String(classificationId))}`,
              { next: { revalidate: 120 } } // Cache for 2 minutes
            )

            if (groupsResponse.ok) {
              const groupsData = await groupsResponse.json()
              
              if (groupsData.ok && Array.isArray(groupsData.groups)) {
                groups = groupsData.groups
              }
            }
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[VIBE] Error fetching Atlantico data:', error)
      }
    }
  }

  // DISABLED: All experience fetching logic (keeping for reference)
  let experiences: any[] = []

  // DISABLED: Special handling for "cable-car-observatory": display 3 empty clickable cards
  // if (slug === 'cable-car-observatory') {
  //   return (
  //     <>
  //       {/* Vibe Hero */}
  //       <Section variant="default" background="subtle">
  //         <Container size="lg">
  //           <div className="glass-panel p-6 md:p-8">
  //             <Stack direction="column" gap="md" align="start">
  //               <div className="space-y-3">
  //                 <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
  //                   {translatedTitle}
  //                 </h1>
  //                 {vibe.tagline && (
  //                   <p className="text-xl text-glass-600 leading-relaxed max-w-2xl">
  //                     {vibe.tagline}
  //                   </p>
  //                 )}
  //               </div>
  //             </Stack>
  //           </div>
  //         </Container>
  //       </Section>

  //       {/* 3 Empty Cards Grid */}
  //       <Section variant="default" background="default">
  //         <Container size="lg">
  //           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  //             <Link href="/activities/cable-car-1" className="block">
  //               <div className="bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow min-h-[200px] cursor-pointer"></div>
  //             </Link>
  //             <Link href="/activities/cable-car-2" className="block">
  //               <div className="bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow min-h-[200px] cursor-pointer"></div>
  //             </Link>
  //             <Link href="/activities/cable-car-3" className="block">
  //               <div className="bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow min-h-[200px] cursor-pointer"></div>
  //             </Link>
  //           </div>
  //         </Container>
  //       </Section>
  //     </>
  //   )
  // }

  return (
    <>
      {/* Atlantico Tours Listing with Filters */}
      <Section variant="default" background="default">
        <div className="max-w-[1500px] mx-auto px-8 pt-4">
          {groups.length > 0 && classificationName ? (
            <VibeListingClient
              initialTours={groups}
              locale={locale}
              classificationName={classificationName}
            />
          ) : (
            <div className="glass-panel p-6 md:p-8 text-center py-16 space-y-6">
              <h2 className="text-2xl font-semibold text-glass-900">
                No tours available
              </h2>
              <p className="text-lg text-glass-600 max-w-md mx-auto">
                {classificationName
                  ? `No tours found for "${classificationName}" classification.`
                  : 'This vibe is not mapped to an Atlantico classification.'}
              </p>
            </div>
          )}
        </div>
      </Section>
    </>
  )
}

/**
 * DISABLED: VIP Tours Page - API-DRIVEN ONLY (by ID from mapping)
 * Only displays the 7 tours connected via atlanticoId (no filters, no matching, no allTours)
 */
async function VipToursPage({ locale, vibe }: { locale: string; vibe: any }) {
  // DISABLED: All VIP tour fetching logic
  // Map locale to Atlantico API language code (ENG, ESP, DEU, FRA, etc.)
  // const atlLang = mapLocaleToLang(locale)

  // DISABLED: Build absolute URL for Server Component fetch
  // const headersList = await import('next/headers').then((m) => m.headers)
  // const hdrs = headersList()
  // const host = hdrs.get('host') || 'localhost:3000'
  // const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  // const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
  // const origin = envBase ? envBase : `${protocol}://${host}`

  // Get translated vibe title
  const tVibes = await getTranslations({ locale, namespace: 'vibes' })
  const translatedTitle = getTranslatedVibeTitle(vibe.slug, tVibes, vibe.title)

  // DISABLED: All tour fetching and rendering
  const connectedTours: any[] = []

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

      {/* DISABLED: VIP Tours Listing - Empty state only */}
      <Section variant="default" background="default">
        <Container size="lg">
          <div className="text-center py-12">
            <p className="text-glass-500 text-lg">
              {/* Empty state - no tours displayed */}
            </p>
          </div>
        </Container>
      </Section>
    </>
  )
}

