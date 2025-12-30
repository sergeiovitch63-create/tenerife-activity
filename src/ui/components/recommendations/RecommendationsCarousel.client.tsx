'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

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

export function RecommendationsCarousel() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Duplicate items multiple times for seamless looping (4x for smooth infinite feel)
  const row1Duplicated = [
    ...mustSeeRow1,
    ...mustSeeRow1,
    ...mustSeeRow1,
    ...mustSeeRow1,
  ]
  const row2Duplicated = [
    ...mustSeeRow2,
    ...mustSeeRow2,
    ...mustSeeRow2,
    ...mustSeeRow2,
  ]

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const tCommon = useTranslations('common')
  const tMustSee = useTranslations('mustSee')

  return (
    <div
      className="w-full max-w-5xl mx-auto px-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
          {row1Duplicated.map((item, index) => (
            <div key={`row1-${item.title}-${index}`} className="marquee-item">
              <div className="flex flex-col items-center gap-2">
                {/* Square Image Card */}
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden bg-white/10 shadow-lg hover:scale-[1.03] transition-transform duration-300 cursor-pointer">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 768px) 128px, 160px"
                    loading="lazy"
                  />
                </div>
                {/* Title Below Card */}
                <div className="text-center space-y-0.5">
                  <p className="mt-3 text-sm md:text-base font-semibold text-white text-center whitespace-normal leading-snug line-clamp-2 max-w-[128px] md:max-w-[160px]">
                    {item.title}
                  </p>
                  {item.subtitleKey && (
                    <p className="text-xs md:text-sm text-white/70 truncate max-w-[128px] md:max-w-[160px]">
                      {tMustSee(`itemCategories.${item.subtitleKey}`)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 - Scrolls Right */}
      <div
        className={`marquee-row mt-4 ${prefersReducedMotion ? 'marquee-disabled' : 'marquee-right'} ${isHovered && !prefersReducedMotion ? 'marquee-paused' : ''}`}
      >
        <div className="marquee-track">
          {row2Duplicated.map((item, index) => (
            <div key={`row2-${item.title}-${index}`} className="marquee-item">
              <div className="flex flex-col items-center gap-2">
                {/* Square Image Card */}
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden bg-white/10 shadow-lg hover:scale-[1.03] transition-transform duration-300 cursor-pointer">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 768px) 128px, 160px"
                    loading="lazy"
                  />
                </div>
                {/* Title Below Card */}
                <div className="text-center space-y-0.5">
                  <p className="mt-3 text-sm md:text-base font-semibold text-white text-center whitespace-normal leading-snug line-clamp-2 max-w-[128px] md:max-w-[160px]">
                    {item.title}
                  </p>
                  {item.subtitleKey && (
                    <p className="text-xs md:text-sm text-white/70 truncate max-w-[128px] md:max-w-[160px]">
                      {tMustSee(`itemCategories.${item.subtitleKey}`)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
