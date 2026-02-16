'use client'

import { SafeImage } from '@/components/SafeImage'
import { use } from 'react'

type PageParams = {
  params: Promise<{ locale: string; slug: string }>
}

export default function ActivityPhotosPage({ params }: PageParams) {
  const { slug } = use(params)

  // For now we only have a local gallery for activity 303
  const is303 = slug === '303'

  const images303 = [
    '/images/events/303/A.webp',
    '/images/events/303/B.jpg',
    '/images/events/303/C.jpg',
    '/images/events/303/D.jpg',
    '/images/events/303/E.jpg',
  ]

  const images = is303 ? images303 : []

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">
          {is303 ? 'Photos - VIP Ascent to the Peak on foot (303)' : `Photos for activity ${slug}`}
        </h1>

        {images.length === 0 ? (
          <p className="text-glass-600">
            No photos are configured yet for this activity.
          </p>
        ) : (
          <>
            {/* Large preview (first image) */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-8 border border-glass-200 bg-glass-100">
              <SafeImage
                src={images[0]}
                alt="Main photo"
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>

            {/* Grid of all photos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((src, idx) => (
                <div
                  key={src}
                  className="relative w-full aspect-video rounded-lg overflow-hidden border border-glass-200 bg-glass-100"
                >
                  <SafeImage
                    src={src}
                    alt={`Photo ${idx + 1}`}
                    fill
                    sizes="33vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}


