import { notFound } from 'next/navigation'
import { ActivityBookingSkeleton } from '@/components/activities/ActivityBookingSkeleton'
import { resolveActivity } from '@/lib/atlantico/resolve'

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { locale, slug } = await params
  const search = await (searchParams || Promise.resolve({}))
  const eventParam = search && 'event' in search && typeof search.event === 'string' ? search.event : undefined

  // Guard: if slug looks like an image filename, this is not a valid activity
  if (/\.(png|jpe?g|webp|avif)$/i.test(slug)) {
    notFound()
  }

  // Resolve activity to get t_group and t_id
  let resolved
  try {
    resolved = await resolveActivity(slug, locale, eventParam)
  } catch (error) {
    // Resolver already calls notFound() on error
    notFound()
  }

  return <ActivityBookingSkeleton locale={locale} resolved={resolved} slug={slug} />
}


