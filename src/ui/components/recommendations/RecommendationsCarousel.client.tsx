'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { getMustSeeHref } from '@/data/must-see-group-mapping'
import { setupPrefetchOnInteraction } from '@/lib/mobile/prefetch'

interface MustSeeItem {
  title: string
  subtitleKey: string
  image: string
}

// Helper function to map subtitle strings to translation keys
function getSubtitleKey(subtitle: string): string {
  const mapping: Record<string, string> = {
    'Relaxation': 'relaxation',
    'Zoo': 'zoo',
    'Show': 'show',
    'Theme Park': 'themePark',
    'Boat Tour': 'boatTour',
    'Water Park': 'waterPark',
    'Adventure': 'adventure',
    'Island Tour': 'islandTour',
    'Aquarium': 'aquarium',
    'Night Show': 'nightShow',
    'Stargazing': 'stargazing',
    'Nature': 'nature',
    'Party': 'party',
    'Paragliding': 'paragliding',
  }
  return mapping[subtitle] || subtitle.toLowerCase().replace(/\s+/g, '')
}

// Row 1 - Must See items with exact order matching actual filenames
const mustSeeRow1: MustSeeItem[] = [
  { title: 'Club Termal', subtitleKey: 'relaxation', image: '/images/home/must-see/row-1/club-termal.jpg' },
  { title: 'Loro Parque', subtitleKey: 'zoo', image: '/images/home/must-see/row-1/Loro-Parque.png' },
  { title: 'Flamenco', subtitleKey: 'show', image: '/images/home/must-see/row-1/flamenco.png' },
  { title: 'Siam Park', subtitleKey: 'themePark', image: '/images/home/must-see/row-1/Siam-Park.png' },
  { title: 'Jungle Park', subtitleKey: 'zoo', image: '/images/home/must-see/row-1/Jungle-Park.png' },
  { title: 'Shogun Boat', subtitleKey: 'boatTour', image: '/images/home/must-see/row-1/Shogun-Boat.jpg' },
  { title: 'Aqualand', subtitleKey: 'waterPark', image: '/images/home/must-see/row-1/Aqualand.png' },
]

// Row 2 - Files found in /public/images/home/must-see/row-2/
// FOUND ROW-2 IMAGES (UPDATED): buggy.jpg, la-palma-con-almuerzo.jpg, poema-del-mar.jpg, scandal-dinner-show.jpg, sky-of-tenerife.jpg, teide-by-night.jpg, teide-tour-with-cable-car.jpg, utopia.jpg
const mustSeeRow2: MustSeeItem[] = [
  { title: 'Buggy', subtitleKey: 'adventure', image: '/images/home/must-see/row-2/buggy.jpg' },
  { title: 'La Palma con Almuerzo', subtitleKey: 'islandTour', image: '/images/home/must-see/row-2/la-palma-con-almuerzo.jpg' },
  { title: 'Poema del Mar Gran Canaria', subtitleKey: 'aquarium', image: '/images/home/must-see/row-2/poema-del-mar-gran-canaria.jpg' },
  { title: 'Scandal Dinner Show', subtitleKey: 'nightShow', image: '/images/home/must-see/row-2/scandal-dinner-show.jpg' },
  { title: 'Teide by Night', subtitleKey: 'stargazing', image: '/images/home/must-see/row-2/teide-by-night.jpg' },
  { title: 'Teide Tour with Cable Car', subtitleKey: 'nature', image: '/images/home/must-see/row-2/teide-tour-with-cable-car.jpg' },
  { title: 'Utopia', subtitleKey: 'party', image: '/images/home/must-see/row-2/utopia.jpg' },
  { title: 'Sky of Tenerife', subtitleKey: 'paragliding', image: '/images/home/must-see/row-2/sky-of-tenerife.jpg' },
]

// Removed dev logging - use React DevTools for debugging

interface RecommendationsCarouselProps {
  /** Server-enriched row 1 items (with images from groupDetails). Fallback to static if not provided. */
  row1?: MustSeeItem[]
  /** Server-enriched row 2 items (with images from groupDetails). Fallback to static if not provided. */
  row2?: MustSeeItem[]
}

function RecommendationsCarouselComponent({ row1: row1Prop, row2: row2Prop }: RecommendationsCarouselProps = {}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())

  // Use server-enriched data when provided, else fallback to static
  const row1 = row1Prop ?? mustSeeRow1
  const row2 = row2Prop ?? mustSeeRow2

  // Memoize duplicated arrays to prevent recreation on every render
  const row1Duplicated = useMemo(() => [
    ...row1,
    ...row1,
    ...row1,
    ...row1,
  ], [row1])
  
  const row2Duplicated = useMemo(() => [
    ...row2,
    ...row2,
    ...row2,
    ...row2,
  ], [row2])

  // Memoize handlers to prevent recreation
  const handleMediaChange = useCallback((e: MediaQueryListEvent) => {
    setPrefersReducedMotion(e.matches)
  }, [])

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    mediaQuery.addEventListener('change', handleMediaChange)
    return () => mediaQuery.removeEventListener('change', handleMediaChange)
  }, [handleMediaChange])

  // Memoize translation functions
  const tCommon = useTranslations('common')
  const tMustSee = useTranslations('mustSee')
  
  // Memoize hover handlers
  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])

  return (
    <div
      className="w-full max-w-5xl mx-auto px-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Section Title */}
      <h2 className="mb-8 text-center text-2xl md:text-3xl font-semibold text-white tracking-tight">
        {tCommon('mustSee')}
      </h2>

      {/* Row 1 - Scrolls Left */}
      <div
        className={`marquee-row ${prefersReducedMotion ? 'marquee-disabled' : 'marquee-left'} ${isHovered && !prefersReducedMotion ? 'marquee-paused' : ''}`}
      >
        <div className="marquee-track">
          {row1Duplicated.map((item, index) => {
            const href = getMustSeeHref(item.title)
            const linkKey = `row1-${item.title}-${index}`
            return (
              <div key={linkKey} className="marquee-item">
                <Link
                ref={(el) => {
                  if (el) {
                    linkRefs.current.set(linkKey, el)
                    // Setup prefetch on mount for instant navigation
                    setupPrefetchOnInteraction(el, href)
                  } else {
                    linkRefs.current.delete(linkKey)
                  }
                }}
                href={href}
                prefetch={true}
                className="flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded-xl"
              >
                {/* Card layout similar to "You might also like" */}
                <div className="w-48 md:w-56 rounded-xl overflow-hidden bg-white/95 shadow-lg hover:shadow-xl border border-glass-200 transition-all cursor-pointer">
                  <div className="relative w-full aspect-[4/3] bg-glass-100 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={224}
                      height={168}
                      className="w-full h-full object-cover"
                      sizes="(max-width: 768px) 192px, 224px"
                      loading={index < 4 ? 'eager' : 'lazy'}
                      priority={index < 4}
                      quality={index < 4 ? 90 : 80}
                    />
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    <p className="text-sm font-semibold text-glass-900 line-clamp-2">
                      {item.title}
                    </p>
                    {item.subtitleKey && (
                      <p className="text-xs text-glass-600">
                        {tMustSee(`itemCategories.${item.subtitleKey}`)}
                      </p>
                    )}
                  </div>
                </div>
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* Row 2 - Scrolls Right */}
      <div
        className={`marquee-row mt-4 ${prefersReducedMotion ? 'marquee-disabled' : 'marquee-right'} ${isHovered && !prefersReducedMotion ? 'marquee-paused' : ''}`}
      >
        <div className="marquee-track">
          {row2Duplicated.map((item, index) => {
            const href = getMustSeeHref(item.title)
            const linkKey = `row2-${item.title}-${index}`
            return (
              <div key={linkKey} className="marquee-item">
                <Link
                ref={(el) => {
                  if (el) {
                    linkRefs.current.set(linkKey, el)
                    // Setup prefetch on mount for instant navigation
                    setupPrefetchOnInteraction(el, href)
                  } else {
                    linkRefs.current.delete(linkKey)
                  }
                }}
                href={href}
                prefetch={true}
                className="flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 rounded-xl"
              >
                {/* Card layout similar to "You might also like" */}
                <div className="w-48 md:w-56 rounded-xl overflow-hidden bg-white/95 shadow-lg hover:shadow-xl border border-glass-200 transition-all cursor-pointer">
                  <div className="relative w-full aspect-[4/3] bg-glass-100 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={224}
                      height={168}
                      className="w-full h-full object-cover"
                      sizes="(max-width: 768px) 192px, 224px"
                      loading={index < 4 ? 'eager' : 'lazy'}
                      priority={index < 4}
                      quality={index < 4 ? 90 : 80}
                    />
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    <p className="text-sm font-semibold text-glass-900 line-clamp-2">
                      {item.title}
                    </p>
                    {item.subtitleKey && (
                      <p className="text-xs text-glass-600">
                        {tMustSee(`itemCategories.${item.subtitleKey}`)}
                      </p>
                    )}
                  </div>
                </div>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export const RecommendationsCarousel = memo(RecommendationsCarouselComponent)
