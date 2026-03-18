'use client'

/**
 * Shared hero carousel for group details.
 * Used by GroupDetails508LuxLayout, debug generic layout, and catalog page.
 * Logic: galleryUrls.length > 0 → carousel with scroll; else heroUrl → single image; else gradient placeholder.
 * Click on a photo opens fullscreen lightbox with navigation.
 */

import { useRef, useState, useEffect } from 'react'

interface GroupDetailsHeroCarouselProps {
  galleryUrls: string[]
  heroUrl: string | null
  alt: string
  className?: string
}

export function GroupDetailsHeroCarousel({
  galleryUrls,
  heroUrl,
  alt,
  className = '',
}: GroupDetailsHeroCarouselProps) {
  const heroScrollRef = useRef<HTMLDivElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const images = galleryUrls.length > 0 ? galleryUrls : heroUrl ? [heroUrl] : []
  const hasMultiple = images.length > 1

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => setLightboxOpen(false)

  const goPrev = () => setLightboxIndex((i) => (i <= 0 ? images.length - 1 : i - 1))
  const goNext = () => setLightboxIndex((i) => (i >= images.length - 1 ? 0 : i + 1))

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen, lightboxIndex, images.length])

  const scrollHero = (direction: 'left' | 'right') => {
    const el = heroScrollRef.current
    if (!el) return
    el.scrollBy({ left: direction === 'left' ? -el.clientWidth : el.clientWidth, behavior: 'smooth' })
  }

  const baseClasses = 'relative w-full h-56 md:h-72 lg:h-80 overflow-hidden'
  const containerClasses = className ? `${baseClasses} ${className}` : baseClasses

  const ImageButton = ({
    url,
    index,
    className: imgClassName,
  }: {
    url: string
    index: number
    className: string
  }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openLightbox(index)}
      onKeyDown={(e) => e.key === 'Enter' && openLightbox(index)}
      className={`${imgClassName} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500`}
    >
      <img src={url} alt={`${alt} ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
    </div>
  )

  return (
    <>
      <div className={containerClasses}>
        {galleryUrls.length > 0 ? (
          <>
            {/* Desktop: Atlantico-style grid (1 large + 4 thumbnails) */}
            <div className="hidden lg:grid w-full h-full grid-cols-4 grid-rows-2 gap-2">
              <ImageButton url={galleryUrls[0]} index={0} className="col-span-2 row-span-2 overflow-hidden rounded-2xl" />
              <div className="col-span-2 row-span-2 grid grid-cols-2 grid-rows-2 gap-2">
                {galleryUrls.slice(1, 5).map((url, idx) => (
                  <ImageButton
                    key={`${url}-${idx}`}
                    url={url}
                    index={idx + 1}
                    className="overflow-hidden rounded-2xl"
                  />
                ))}
                {/* If we have fewer than 5 images, fill remaining cells with the next ones (or repeat none) */}
                {galleryUrls.length < 5 &&
                  Array.from({ length: Math.max(0, 4 - (galleryUrls.length - 1)) }).map((_, fillerIdx) => (
                    <div
                      // eslint-disable-next-line react/no-array-index-key
                      key={`filler-${fillerIdx}`}
                      className="bg-gradient-to-br from-glass-50 to-glass-100 rounded-2xl border border-glass-200"
                    />
                  ))}
              </div>
            </div>

            {/* Mobile/tablet: carousel */}
            <div
              ref={heroScrollRef}
              className="lg:hidden w-full h-full overflow-x-auto flex snap-x snap-mandatory scroll-smooth scrollbar-hide cursor-pointer"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {galleryUrls.map((url, index) => (
                <ImageButton
                  key={url}
                  url={url}
                  index={index}
                  className="w-full h-full min-w-full flex-shrink-0 snap-center"
                />
              ))}
            </div>

            {galleryUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    scrollHero('left')
                  }}
                  className="lg:hidden absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                  aria-label="Photo précédente"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    scrollHero('right')
                  }}
                  className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                  aria-label="Photo suivante"
                >
                  ›
                </button>
              </>
            )}
          </>
        ) : heroUrl ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => openLightbox(0)}
            onKeyDown={(e) => e.key === 'Enter' && openLightbox(0)}
            className="w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
          >
            <img src={heroUrl} alt={alt} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100" />
        )}
      </div>

      {/* Fullscreen lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Vue plein écran"
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition-colors"
            aria-label="Photo précédente"
          >
            ‹
          </button>
          <img
            src={images[lightboxIndex]}
            alt={`${alt} ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition-colors"
            aria-label="Photo suivante"
          >
            ›
          </button>
          {hasMultiple && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {lightboxIndex + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </>
  )
}
