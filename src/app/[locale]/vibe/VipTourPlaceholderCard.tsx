/**
 * VIP Tour Placeholder Card Component
 * 
 * Displays a placeholder card for VIP tours that are not yet connected to the API.
 * Same layout as VipTourRowCard but with placeholder content.
 */

import { Link } from '@/navigation'
import { getTranslations } from 'next-intl/server'
import { ClientImage } from '../catalog/ClientImage'
import type { DesiredVipTour } from '@/content/vibes/vip-tours.desired'
import type { VipTourMapping } from '@/content/vibes/vip-tours.mapping'

interface VipTourPlaceholderCardProps {
  desiredTour?: DesiredVipTour // Optional: use if available
  mapping?: VipTourMapping // Optional: use if available (preferred)
}

export async function VipTourPlaceholderCard({ desiredTour, mapping }: VipTourPlaceholderCardProps) {
  const t = await getTranslations('common')
  // Use mapping if available, otherwise fallback to desiredTour
  const slug = mapping?.internalSlug || desiredTour?.slug || ''
  const title = mapping?.fallbackTitle || desiredTour?.title || ''
  const shortDescription = desiredTour?.shortDescription

  return (
    <div className="bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/activities/${slug}`} className="block">
        <div className="flex flex-col md:flex-row md:items-stretch">
          {/* Left: Image placeholder */}
          <div className="md:w-64 md:flex-shrink-0 md:self-stretch">
            <div className="w-full h-full md:h-full">
              <ClientImage
                src={null} // No image = placeholder
                alt={title}
                className="rounded-t-lg md:rounded-l-lg md:rounded-t-none h-full"
                fullHeight={true}
              />
            </div>
          </div>

          {/* Middle: Content */}
          <div className="flex-1 p-4 md:p-6 flex flex-col">
            {/* Title */}
            <h3 className="text-xl md:text-2xl font-semibold text-glass-900 mb-2">
              {title}
            </h3>

            {/* Short description placeholder */}
            {shortDescription ? (
              <p className="text-sm text-glass-600 mb-4 line-clamp-2">
                {shortDescription}
              </p>
            ) : (
              <div className="mb-4 space-y-2">
                <div className="h-4 bg-glass-200 rounded w-full" />
                <div className="h-4 bg-glass-200 rounded w-5/6" />
              </div>
            )}

            {/* Info rows with icons - Placeholders */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-glass-700">
                <span className="text-ocean-600">👥</span>
                <span>Small group: —</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-glass-700">
                <span className="text-ocean-600">🚌</span>
                <span>{t('pickupService')}: —</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-glass-700">
                <span className="text-ocean-600">⏱</span>
                <span>Duration: —</span>
              </div>
            </div>

            {/* View button */}
            <div className="mt-auto pt-4">
              <span className="inline-block px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2">
                Ver detalles
              </span>
            </div>
          </div>

          {/* Right: Price placeholder */}
          <div className="md:w-48 md:flex-shrink-0 p-4 md:p-6 bg-glass-50 flex items-center justify-center md:border-l border-glass-200">
            <div className="text-center">
              <div className="text-sm text-glass-600 mb-1">
                Desde
              </div>
              <div className="text-3xl font-bold text-glass-400">
                —
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

