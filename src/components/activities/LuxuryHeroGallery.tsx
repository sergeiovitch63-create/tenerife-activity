/**
 * Luxury Hero Gallery - Disney/GetYourGuide Style
 * 
 * Layout:
 * - Large main image on the left (2/3 width)
 * - Stacked thumbnails on the right (1/3 width)
 * - Badge showing total image count
 * - Click to view full image
 */

'use client'

import { useState, useEffect } from 'react'
import { SafeImage } from '@/components/SafeImage'

interface LuxuryHeroGalleryProps {
  images: string[]
  title: string
  duration?: string | number
  rating?: number
  reviewCount?: number
  fullScreenMobile?: boolean // For activity 508: full screen image on mobile
}

export function LuxuryHeroGallery({ 
  images, 
  title, 
  duration,
  rating,
  reviewCount,
  fullScreenMobile = false
}: LuxuryHeroGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [mainImageIndex, setMainImageIndex] = useState(0)

  // If no images, show placeholder
  if (images.length === 0) {
    return (
      <div className="relative w-full h-[500px] bg-glass-200 flex items-center justify-center rounded-lg">
        <div className="text-glass-400 text-sm">No photos available</div>
      </div>
    )
  }

  // Get main image and thumbnails
  const mainImage = images[mainImageIndex] || images[0]
  const thumbnails = images.filter((_, idx) => idx !== mainImageIndex).slice(0, 4) // Show max 4 thumbnails

  return (
    <div className="relative w-full">
      {/* Title and Info Section - Above Gallery (like Disney) - Hidden on mobile for fullScreenMobile */}
      {!fullScreenMobile && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-ocean-600 bg-ocean-50 px-2 py-1 rounded">
              Certified by Tenerife Activity
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-glass-900 mb-2">
            {title}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            {rating && (
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold text-glass-900">{rating}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-glass-300'}`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                {reviewCount && (
                  <span className="text-sm text-glass-600 ml-1">
                    {reviewCount.toLocaleString()} reviews
                  </span>
                )}
              </div>
            )}
            {duration && (
              <div className="text-glass-600">
                <span className="font-medium">Duration:</span> {typeof duration === 'number' ? `${duration} hours` : `${duration} hours`}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Title overlay on mobile for fullScreenMobile - positioned over image */}
      {fullScreenMobile && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 via-black/40 to-transparent p-4 md:hidden">
          <h1 className="text-2xl font-bold text-white mb-2">
            {title}
          </h1>
          {duration && (
            <div className="text-white/90 text-sm">
              <span className="font-medium">Duration:</span> {typeof duration === 'number' ? `${duration} hours` : `${duration} hours`}
            </div>
          )}
        </div>
      )}
      
      {/* Title and Info Section - Desktop only for fullScreenMobile */}
      {fullScreenMobile && (
        <div className="hidden md:block mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-ocean-600 bg-ocean-50 px-2 py-1 rounded">
              Certified by Tenerife Activity
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-glass-900 mb-2">
            {title}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            {rating && (
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold text-glass-900">{rating}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-glass-300'}`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                {reviewCount && (
                  <span className="text-sm text-glass-600 ml-1">
                    {reviewCount.toLocaleString()} reviews
                  </span>
                )}
              </div>
            )}
            {duration && (
              <div className="text-glass-600">
                <span className="font-medium">Duration:</span> {typeof duration === 'number' ? `${duration} hours` : `${duration} hours`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gallery Section - Disney / Atlantico style */}
      <div
        className={`relative w-full ${
          fullScreenMobile ? 'h-screen md:h-[600px]' : 'h-[500px] md:h-[600px]'
        } ${
          fullScreenMobile ? 'grid grid-cols-1 md:grid-cols-3' : 'grid grid-cols-3'
        } gap-2 ${fullScreenMobile ? 'rounded-none md:rounded-lg' : 'rounded-lg'} overflow-hidden`}
      >
        {/* Main Large Image - Full screen on mobile for activity 508 */}
        <div 
          className={`${fullScreenMobile ? 'col-span-1 md:col-span-2' : 'col-span-2'} relative cursor-pointer group`}
          onClick={() => setSelectedImage(mainImage)}
        >
          <SafeImage
            src={mainImage}
            alt={`${title} - Main photo`}
            fill
            priority
            sizes={fullScreenMobile ? "100vw" : "66vw"}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>

        {/* Thumbnails Grid (Right - 1 column = 4 small images) - Hidden on mobile for activity 508 */}
        <div
          className={`${
            fullScreenMobile ? 'hidden md:grid' : 'grid'
          } col-span-1 grid-rows-2 grid-cols-2 gap-2`}
        >
          {thumbnails.map((img, idx) => (
            <div
              key={idx}
              className="relative cursor-pointer group overflow-hidden rounded"
              onClick={() => {
                // Set clicked thumbnail as main image
                const clickedIndex = images.findIndex(i => i === img)
                if (clickedIndex !== -1) {
                  setMainImageIndex(clickedIndex)
                }
                setSelectedImage(img)
              }}
            >
              <SafeImage
                src={img}
                alt={`${title} - Photo ${idx + 2}`}
                fill
                sizes="33vw"
                className="object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <SafeImage
              src={selectedImage}
              alt={title}
              width={1200}
              height={800}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 transition-colors bg-black/50 rounded-full w-12 h-12 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImage(null)
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

