/**
 * Hero Gallery Component - Atlántico Style
 * Mosaic layout: 1 large image + 3 small images
 */

'use client'

import { useRef, useState, useCallback } from 'react'

interface HeroGalleryProps {
  images: string[]
  title: string
  /**
   * When true, enables a horizontal slider with arrows on mobile (≤ md)
   * while keeping the existing mosaic layout on desktop.
   * Used only for Astronomic Tour VIP.
   */
  enableMobileSlider?: boolean
}

export function HeroGallery({ images, title, enableMobileSlider = false }: HeroGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchEndXRef = useRef<number | null>(null)

  const scrollToIndex = useCallback((index: number) => {
    if (!sliderRef.current) return
    const container = sliderRef.current
    const width = container.clientWidth
    container.scrollTo({
      left: width * index,
      behavior: 'smooth',
    })
  }, [])

  const goToPrev = () => {
    if (images.length === 0) return
    const nextIndex = activeIndex === 0 ? images.length - 1 : activeIndex - 1
    setActiveIndex(nextIndex)
    scrollToIndex(nextIndex)
  }

  const goToNext = () => {
    if (images.length === 0) return
    const nextIndex = activeIndex === images.length - 1 ? 0 : activeIndex + 1
    setActiveIndex(nextIndex)
    scrollToIndex(nextIndex)
  }

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!enableMobileSlider) return
    touchStartXRef.current = e.touches[0].clientX
    touchEndXRef.current = null
  }

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!enableMobileSlider || touchStartXRef.current === null) return
    touchEndXRef.current = e.touches[0].clientX
  }

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    if (!enableMobileSlider || touchStartXRef.current === null || touchEndXRef.current === null) return
    const deltaX = touchStartXRef.current - touchEndXRef.current
    const threshold = 40 // minimal swipe distance

    if (deltaX > threshold) {
      // swipe left -> next image
      goToNext()
    } else if (deltaX < -threshold) {
      // swipe right -> previous image
      goToPrev()
    }

    touchStartXRef.current = null
    touchEndXRef.current = null
  }

  if (images.length === 0) {
    return (
      <div className="relative w-full h-64 md:h-96 lg:h-[500px] bg-glass-200 flex items-center justify-center">
        <div className="text-glass-400 text-sm">No photos available</div>
      </div>
    )
  }

  // If we have exactly 1 image, show it full width (both mobile & desktop)
  if (images.length === 1) {
    return (
      <div className="relative w-full h-64 md:h-96 lg:h-[500px]">
        <img
          src={images[0]}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  // MOBILE (≤ md): optional slider with arrows for enabled activities
  const renderMobileSlider = enableMobileSlider && images.length > 0

  return (
    <div className="relative w-full">
      {/* Mobile slider version - only visible on small screens */}
      {renderMobileSlider && (
        <div className="relative h-64 w-full overflow-hidden md:hidden">
          <div
            ref={sliderRef}
            className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {images.map((img, index) => (
              <div
                key={index}
                className="relative h-full w-full flex-shrink-0 snap-center"
                style={{ minWidth: '100%' }}
              >
                <img
                  src={img}
                  alt={`${title} - ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Left / Right arrows - only on mobile slider */}
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white md:hidden"
            aria-label="Previous image"
            onClick={goToPrev}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white md:hidden"
            aria-label="Next image"
            onClick={goToNext}
          >
            ›
          </button>
        </div>
      )}

      {/* Desktop / tablet mosaic layout - unchanged, only visible from md and up */}
      <div className={`${renderMobileSlider ? 'hidden md:block' : ''}`}>
        {/* If we have 2-3 images, show first large + rest small */}
        {images.length <= 3 ? (
          <div className="relative w-full h-64 md:h-96 lg:h-[500px] grid grid-cols-2 gap-2">
            <div className="row-span-2">
              <img
                src={images[0]}
                alt={`${title} - Main`}
                className="w-full h-full object-cover rounded-l-lg"
              />
            </div>
            {images.slice(1).map((img, idx) => (
              <div key={idx} className="relative">
                <img
                  src={img}
                  alt={`${title} - ${idx + 2}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {/* Fill remaining slots if needed */}
            {images.length === 2 && (
              <div className="bg-glass-200 rounded-r-lg" />
            )}
          </div>
        ) : (
          // Standard mosaic: 1 large + all remaining small images (4+ images)
          (() => {
            const mainImage = images[0]
            const smallImages = images.slice(1)

            return (
              <div className="relative w-full h-64 md:h-96 lg:h-[500px] grid grid-cols-4 gap-2">
                {/* Main large image */}
                <div className="col-span-2 row-span-2">
                  <img
                    src={mainImage}
                    alt={`${title} - Main`}
                    className="w-full h-full object-cover rounded-l-lg cursor-pointer"
                    onClick={() => setSelectedImage(mainImage)}
                  />
                </div>
                
                {/* Small images */}
                {smallImages.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={img}
                      alt={`${title} - ${idx + 2}`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(img)}
                    />
                  </div>
                ))}
                
                {/* Lightbox overlay */}
                {selectedImage && (
                  <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                  >
                    <img
                      src={selectedImage}
                      alt={title}
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
                      onClick={() => setSelectedImage(null)}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}

