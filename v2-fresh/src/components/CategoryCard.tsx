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

const iconMap: Record<string, LucideIcon> = {
  Ship, Mountain, Waves, FerrisWheel, MountainSnow, Fish, Theater, Crown,
  CarFront, Bike, UtensilsCrossed, Bus, Ticket, Plane, Accessibility, Sparkles,
}

export default function CategoryCard({ category }: { category: AtlanticoClassification }) {
  const theme = themeFor(category.id)
  const Icon = iconMap[theme.icon] ?? Sparkles
  return (
    <LocaleLink
      href={`/categorie/${category.code}`}
      className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white hover:border-transparent hover:shadow-card transition-all duration-300"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})` }}
      />
      <div className="absolute inset-0 bg-shine opacity-0 group-hover:opacity-100 animate-shine-sweep pointer-events-none" />
      <div className="relative p-5 flex items-start gap-3">
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-soft group-hover:bg-white/20 transition-all"
          style={{ background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})` }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-ink-900 group-hover:text-white transition-colors">
            {category.name}
          </h3>
          <p className="text-xs text-ink-500 group-hover:text-white/80 transition-colors line-clamp-1">
            {cleanText(category.desc)}
          </p>
        </div>
      </div>
    </LocaleLink>
  )
}
