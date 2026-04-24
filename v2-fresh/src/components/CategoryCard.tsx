'use client'

import Image from 'next/image'
import LocaleLink from './LocaleLink'
import {
  Ship, Mountain, Waves, FerrisWheel, MountainSnow, Fish, Theater, Crown,
  CarFront, Bike, UtensilsCrossed, Bus, Ticket, Plane, Accessibility, Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { AtlanticoClassification } from '@/lib/atlantico/types'
import { themeFor } from '@/lib/category-theme'
import { cleanText } from '@/lib/atlantico/normalize'

/**
 * CategoryCard — brand duotone tile.
 *
 * Photos are the v1 thumbnails ported into `/images/categories/`, rendered
 * desaturated and tinted turquoise via a multiply-blended gradient overlay.
 * This is the "duotone" look: all 15 cards read as one family visually
 * (brand turquoise), while the photo still communicates the category.
 *
 * A gold icon chip (top-right) + a gold halo + a gold underline (bottom)
 * are the only non-turquoise accents — consistent with the 2-color brand.
 *
 * If a category has no photo (image: null) we fall back to an SVG wave
 * backdrop, keeping the card usable without breaking the grid.
 */

const iconMap: Record<string, LucideIcon> = {
  Ship, Mountain, Waves, FerrisWheel, MountainSnow, Fish, Theater, Crown,
  CarFront, Bike, UtensilsCrossed, Bus, Ticket, Plane, Accessibility, Sparkles,
}

export default function CategoryCard({ category }: { category: AtlanticoClassification }) {
  const theme = themeFor(category.id)
  const Icon = iconMap[theme.icon] ?? Sparkles
  const desc = cleanText(category.desc)
  const hasPhoto = !!theme.image

  return (
    <LocaleLink
      href={`/categorie/${category.code}`}
      aria-label={category.name}
      className="group relative overflow-hidden rounded-2xl aspect-[4/5] shadow-soft hover:shadow-card transition-all duration-300"
    >
      {/* Deep turquoise base — always present; photo sits on top at reduced
          saturation; gradient overlay unifies everything. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, #2A9BA2 0%, #1F7A83 45%, #1B5A66 100%)',
        }}
      />

      {hasPhoto ? (
        <Image
          src={`/images/categories/${theme.image}`}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover grayscale contrast-[1.1] brightness-[0.9] transition-transform duration-700 group-hover:scale-105"
          priority={theme.order <= 5}
        />
      ) : (
        /* Fallback — same wave SVG we used in the photoless version */
        <svg
          aria-hidden
          viewBox="0 0 200 250"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full opacity-[0.10] text-white"
        >
          <path
            d="M0 160 C 40 130, 80 180, 120 155 S 200 165, 220 140 L 220 260 L -20 260 Z"
            fill="currentColor"
          />
          <path
            d="M0 190 C 50 165, 90 210, 140 185 S 210 195, 230 170 L 230 260 L -20 260 Z"
            fill="currentColor"
            opacity="0.6"
          />
        </svg>
      )}

      {/* Turquoise duotone tint — multiply blend tints the grayscale photo.
          The diagonal mirrors the gradient below it so cards read together. */}
      {hasPhoto && (
        <div
          aria-hidden
          className="absolute inset-0 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-80"
          style={{
            background:
              'linear-gradient(160deg, rgba(42,155,162,0.85) 0%, rgba(31,122,131,0.92) 45%, rgba(20,66,74,0.98) 100%)',
          }}
        />
      )}

      {/* Bottom-to-top dark gradient for text legibility */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background:
            'linear-gradient(to top, rgba(11,45,52,0.85) 0%, rgba(11,45,52,0.35) 55%, transparent 100%)',
        }}
      />

      {/* Gold halo behind the icon — reveals on hover */}
      <div
        aria-hidden
        className="absolute top-5 right-5 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"
        style={{ background: 'radial-gradient(circle, #F4BE3D 0%, transparent 70%)' }}
      />

      {/* Icon chip — top-right, gold accent */}
      <div className="relative flex justify-end p-4 md:p-5">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
          <Icon
            className="w-5 h-5 md:w-6 md:h-6 text-brand-gold-400 transition-colors duration-300 group-hover:text-brand-gold-300"
            strokeWidth={2}
          />
        </div>
      </div>

      {/* Title + desc — bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 text-white">
        <h3 className="font-display font-bold tracking-tight text-base md:text-lg leading-tight drop-shadow-sm">
          {category.name}
        </h3>
        {desc && (
          <p className="mt-1 text-[11px] md:text-xs text-white/80 line-clamp-2 leading-snug">
            {desc}
          </p>
        )}
        {/* Thin gold line — animates in on hover */}
        <div className="mt-3 h-px bg-brand-gold-400/60 w-8 group-hover:w-full transition-all duration-500" />
      </div>
    </LocaleLink>
  )
}
