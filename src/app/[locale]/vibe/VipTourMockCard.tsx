/**
 * VIP Tour Mock Card Component
 * 
 * Displays a VIP tour card using mock data.
 * Same structure and design as VipTourRowCard but uses mock data instead of API data.
 */

import { Link } from '@/navigation'
import { ClientImage } from '../catalog/ClientImage'
import type { VipTourMockData } from '@/content/vibes/vip-tours.mock'

/**
 * Format price with currency
 */
function formatPrice(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * VIP Tour Mock Card Component
 */
export function VipTourMockCard({ mockData }: { mockData: VipTourMockData }) {
  const title = mockData.title
  const description = mockData.shortDescription
  const price = mockData.fromPrice
  const imageUrl = mockData.image

  return (
    <div className="bg-white border border-glass-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row md:items-stretch">
        {/* Left: Image - Full height, same as real cards */}
        <div className="md:w-64 md:flex-shrink-0 md:self-stretch">
          <div className="w-full h-full md:h-full">
            <ClientImage 
              src={imageUrl} 
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

          {/* Short description */}
          {description && (
            <p className="text-sm text-glass-600 mb-4 line-clamp-2">
              {description}
            </p>
          )}

          {/* Info rows with icons - 3 bullet points */}
          <div className="flex flex-col gap-2 mb-4">
            {mockData.bullets.smallGroup && (
              <div className="flex items-center gap-2 text-sm text-glass-700">
                <span className="text-ocean-600">👥</span>
                <span>Small group: {mockData.bullets.smallGroup}</span>
              </div>
            )}
            {mockData.bullets.pickup && (
              <div className="flex items-center gap-2 text-sm text-glass-700">
                <span className="text-ocean-600">🚌</span>
                <span>Pickup service: {mockData.bullets.pickup}</span>
              </div>
            )}
            {mockData.bullets.duration && (
              <div className="flex items-center gap-2 text-sm text-glass-700">
                <span className="text-ocean-600">⏱</span>
                <span>Duration: {mockData.bullets.duration}</span>
              </div>
            )}
          </div>

          {/* View button */}
          <div className="mt-auto pt-4">
            <Link
              href={`/activities/${mockData.slug}`}
              className="inline-block px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
            >
              Ver detalles
            </Link>
          </div>
        </div>

        {/* Right: Price */}
        <div className="md:w-48 md:flex-shrink-0 p-4 md:p-6 bg-glass-50 flex items-center justify-center md:border-l border-glass-200">
          <div className="text-center">
            {price > 0 ? (
              <>
                <div className="text-sm text-glass-600 mb-1">
                  Desde
                </div>
                <div className="text-3xl font-bold text-ocean-600">
                  {formatPrice(price, 'EUR')}
                </div>
              </>
            ) : (
              <div className="text-sm text-glass-500 font-medium">Price on request</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}












