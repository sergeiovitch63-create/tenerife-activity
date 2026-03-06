'use client'

import { useRef } from 'react'

interface GroupDetailsGalleryProps {
  images: string[]
  alt: string
}

export function GroupDetailsGallery({ images, alt }: GroupDetailsGalleryProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  if (!images || images.length === 0) return null

  const scrollBy = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const delta = el.clientWidth * 0.8
    el.scrollBy({
      left: direction === 'left' ? -delta : delta,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="relative w-full h-40 md:h-56 lg:h-64 overflow-x-auto flex gap-3 snap-x snap-mandatory scroll-smooth scrollbar-hide rounded-2xl bg-glass-100"
      >
        {images.map((url) => (
          <div
            key={url}
            className="h-full aspect-[4/3] flex-shrink-0 snap-center rounded-2xl overflow-hidden bg-glass-100"
          >
            <img
              src={url}
              alt={alt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Left arrow */}
      <button
        type="button"
        onClick={() => scrollBy('left')}
        className="hidden md:flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white shadow-sm hover:bg-black/60 transition-colors"
        aria-label="Scroll photos left"
      >
        ‹
      </button>

      {/* Right arrow */}
      <button
        type="button"
        onClick={() => scrollBy('right')}
        className="hidden md:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white shadow-sm hover:bg-black/60 transition-colors"
        aria-label="Scroll photos right"
      >
        ›
      </button>
    </div>
  )
}

