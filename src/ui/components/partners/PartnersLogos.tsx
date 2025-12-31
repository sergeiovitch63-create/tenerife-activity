'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface PartnerLogo {
  name: string
  logoPath: string
  alt: string
  whatsappUrl: string
}

// Partner logos
const partnerLogos: PartnerLogo[] = [
  {
    name: 'Cafe Con Arte',
    logoPath: '/partners/cafe_con_arte.jpg',
    alt: 'Cafe Con Arte',
    whatsappUrl: 'https://wa.me/34642053214',
  },
  {
    name: 'PUBLOX',
    logoPath: '/partners/publox.jpg',
    alt: 'PUBLOX',
    whatsappUrl: 'https://wa.me/34614052889',
  },
  {
    name: 'Marina Masaje',
    logoPath: '/partners/marina_masaje.jpg',
    alt: 'Marina Masaje',
    whatsappUrl: 'https://wa.me/34614202296',
  },
  {
    name: 'Auto Detailing',
    logoPath: '/partners/auto_detailing.jpg',
    alt: 'Auto Detailing',
    whatsappUrl: 'https://wa.me/34614397963',
  },
]

export function PartnersLogos() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Duplicate items multiple times for seamless looping (same as Must See)
  const partnersDuplicated = [
    ...partnerLogos,
    ...partnerLogos,
    ...partnerLogos,
    ...partnerLogos,
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

  return (
    <div
      className="w-full max-w-5xl mx-auto px-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Section Title */}
      <h2 className="mb-8 text-center text-2xl md:text-3xl font-semibold text-white tracking-tight">
        Our Trusted Partners
      </h2>

      {/* Horizontal Carousel - Same pattern as Must See */}
      <div
        className={`marquee-row ${prefersReducedMotion ? 'marquee-disabled' : 'marquee-left'} ${isHovered && !prefersReducedMotion ? 'marquee-paused' : ''}`}
      >
        <div className="marquee-track">
          {partnersDuplicated.map((partner, index) => (
            <div key={`${partner.name}-${index}`} className="marquee-item">
              <a
                href={partner.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open WhatsApp chat with ${partner.name}`}
                className="flex flex-col items-center gap-2 cursor-pointer"
              >
                {/* Square Tile Container - Smaller than Must See */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-white/10 shadow-lg hover:scale-[1.03] transition-transform duration-300 border border-white/20 flex items-center justify-center">
                  <div className="relative w-full h-full p-3">
                    <Image
                      src={partner.logoPath}
                      alt={partner.alt}
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 96px, 112px"
                      loading="lazy"
                    />
                  </div>
                </div>
                {/* Partner Name */}
                <div className="text-center">
                  <p className="mt-3 text-xs sm:text-sm font-medium text-white text-center whitespace-nowrap">
                    {partner.name}
                  </p>
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

