'use client'

import Image from 'next/image'
import { cn } from '@/ui/lib/cn'

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
  return (
    <div className="w-full">
      {/* Title */}
      <h2 className="mb-4 md:mb-6 text-center text-2xl md:text-3xl font-semibold text-white tracking-tight">
        Our Trusted Partners
      </h2>

      {/* Logos Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 items-start justify-items-center max-w-4xl mx-auto px-4">
        {partnerLogos.map((partner, index) => (
          <a
            key={partner.name}
            href={partner.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open WhatsApp chat with ${partner.name}`}
            className={cn(
              'flex flex-col items-center justify-center gap-3',
              'w-full',
              'cursor-pointer',
              'transition-opacity duration-300 ease-out',
              'hover:opacity-90'
            )}
          >
            {/* Square Tile Container */}
            <div
              className={cn(
                'relative',
                'w-[120px] h-[120px] md:w-[160px] md:h-[160px]',
                'bg-white/10 backdrop-blur-sm',
                'border border-white/20',
                'rounded-lg',
                'flex items-center justify-center',
                'transition-opacity duration-300 ease-out',
                'opacity-75 hover:opacity-100'
              )}
            >
              <div className="relative w-full h-full p-4">
                <Image
                  src={partner.logoPath}
                  alt={partner.alt}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 120px, 160px"
                  loading="lazy"
                />
              </div>
            </div>
            {/* Partner Name */}
            <p className="text-sm md:text-base font-medium text-white text-center">
              {partner.name}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}

