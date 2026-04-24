'use client'

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
 * Mono-surface design: every card shares the exact same turquoise gradient.
 * Only the icon changes per category. A gold halo + icon tint appears on
 * hover — gold is never a per-category color, it's the brand's accent.
 *
 * Rationale:
 *  - Consistent with 2-color brand (turquoise + gold from the logo).
 *  - Cards no longer compete visually with activity cards (which carry real
 *    photos below in the catalog). The "it's a category" signal is obvious.
 *  - Fully mobile-first: no image loading, zero CLS, works offline.
 *  - Upgradable: the wave SVG backdrop can later be swapped for a duotone
 *    photo without any API change.
 */

const iconMap: Record<string, LucideIcon> = {
  Ship, Mountain, Waves, FerrisWheel, MountainSnow, Fish, Theater, Crown,
  CarFront, Bike, UtensilsCrossed, Bus, Ticket, Plane, Accessibility, Sparkles,
}

export default function CategoryCard({ category }: { category: AtlanticoClassification }) {
  const theme = themeFor(category.id)
  const Icon = iconMap[theme.icon] ?? Sparkles
  const desc = cleanText(category.desc)

  return (
    <LocaleLink
      href={`/categorie/${category.code}`}
      aria-label={category.name}
      className="group relative overflow-hidden rounded-2xl aspect-[4/5] shadow-soft hover:shadow-card transition-all duration-300"
    >
      {/* Turquoise gradient surface — deep at bottom, lighter at top.
          Same for every card; that's the point. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, #2A9BA2 0%, #1F7A83 45%, #1B5A66 100%)',
        }}
      />

      {/* Subtle wave-shape backdrop (SVG echoes the logo).
          Kept very low-opacity so it reads as texture, not illustration. */}
      <svg
        aria-hidden
        viewBox="0 0 200 250"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-[0.08] text-white"
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

      {/* Gold halo behind the icon — invisible by default, reveals on hover. */}
      <div
        aria-hidden
        className="absolute top-5 right-5 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"
        style={{ background: 'radial-gradient(circle, #F4BE3D 0%, transparent 70%)' }}
      />

      {/* Icon — gold accent, top-right */}
      <div className="relative flex justify-end p-4 md:p-5">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-brand-gold-400 transition-colors duration-300 group-hover:text-brand-gold-300" strokeWidth={2} />
        </div>
      </div>

      {/* Title + desc — bottom, left-aligned */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 text-white">
        <h3 className="font-display font-bold tracking-tight text-base md:text-lg leading-tight">
          {category.name}
        </h3>
        {desc && (
          <p className="mt-1 text-[11px] md:text-xs text-white/70 line-clamp-2 leading-snug">
            {desc}
          </p>
        )}
        {/* Thin gold line — animates in on hover */}
        <div className="mt-3 h-px bg-brand-gold-400/50 w-8 group-hover:w-full transition-all duration-500" />
      </div>
    </LocaleLink>
  )
}
