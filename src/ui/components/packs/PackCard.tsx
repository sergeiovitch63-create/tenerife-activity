'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/ui/lib/cn'
import { Button } from '@/ui/components/shared/Button'

interface PackCardData {
  id: string
  slug: string
  title: string
  category?: string
  description: string
  badge?: string
  image: string
  fallbackImage?: string
  fromPrice?: number | null
}

interface PackCardProps {
  pack: PackCardData
  href?: string
}

export function PackCard({ pack, href }: PackCardProps) {
  const [imageError, setImageError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(pack.image)
  const t = useTranslations('activityPacks')
  const tActivite = useTranslations('activite')

  const handleImageError = () => {
    if (pack.fallbackImage && currentSrc !== pack.fallbackImage) {
      setCurrentSrc(pack.fallbackImage)
    } else {
      setImageError(true)
    }
  }

  const baseClassName = cn(
    'group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm',
    'transition-all duration-300 ease-out h-full',
    'hover:shadow-xl hover:-translate-y-0.5',
    'focus-within:outline-none focus-within:ring-2 focus-within:ring-ocean-500 focus-within:ring-offset-2',
    'border border-glass-100'
  )

  if (href) {
    return (
      <Link
        href={href}
        className={baseClassName}
      >
      {/* Image Section */}
      <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-ocean-100 to-ocean-300 overflow-hidden">
        {!imageError && currentSrc ? (
          <Image
            src={currentSrc}
            alt={pack.title}
            fill
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="object-cover transition-all duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={handleImageError}
          />
        ) : null}
        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        {pack.badge && (
          <div className="absolute top-4 right-4 z-10">
            <span className="inline-flex items-center rounded-full bg-ocean-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
              {pack.badge}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 p-6 gap-4">
        {/* Category label */}
        {pack.category && (
          <span className="text-xs font-semibold text-ocean-600 uppercase tracking-widest">
            {pack.category}
          </span>
        )}

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold text-glass-900 leading-snug tracking-tight group-hover:text-ocean-700 transition-colors">
          {pack.title}
        </h3>

        {/* Description */}
        {pack.description && (
          <p className="text-base text-glass-600 leading-relaxed line-clamp-3 flex-1 min-h-[4.5rem]">
            {pack.description}
          </p>
        )}

        {/* Starting from price */}
        {typeof pack.fromPrice === 'number' && pack.fromPrice > 0 && (
          <p className="text-sm font-semibold text-ocean-700">
            {tActivite('startingFrom')} {pack.fromPrice.toFixed(2)} €
          </p>
        )}

        {/* CTA */}
        <div className="pt-2 mt-auto">
          {href ? (
            <span className="inline-flex w-full items-center justify-center rounded-lg bg-ocean-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-ocean-700">
              {t('viewPack')}
            </span>
          ) : (
            <Button variant="primary" size="md" fullWidth className="font-semibold py-3">
              {t('viewPack')}
            </Button>
          )}
        </div>
      </div>
      </Link>
    )
  }

  return (
    <div className={baseClassName}>
      {/* Image Section */}
      <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-ocean-100 to-ocean-300 overflow-hidden">
        {!imageError && currentSrc ? (
          <Image
            src={currentSrc}
            alt={pack.title}
            fill
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="object-cover transition-all duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={handleImageError}
          />
        ) : null}
        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        {pack.badge && (
          <div className="absolute top-4 right-4 z-10">
            <span className="inline-flex items-center rounded-full bg-ocean-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
              {pack.badge}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 p-6 gap-4">
        {/* Category label */}
        {pack.category && (
          <span className="text-xs font-semibold text-ocean-600 uppercase tracking-widest">
            {pack.category}
          </span>
        )}

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold text-glass-900 leading-snug tracking-tight group-hover:text-ocean-700 transition-colors">
          {pack.title}
        </h3>

        {/* Description */}
        {pack.description && (
          <p className="text-base text-glass-600 leading-relaxed line-clamp-3 flex-1 min-h-[4.5rem]">
            {pack.description}
          </p>
        )}

        {/* Starting from price */}
        {typeof pack.fromPrice === 'number' && pack.fromPrice > 0 && (
          <p className="text-sm font-semibold text-ocean-700">
            {tActivite('startingFrom')} {pack.fromPrice.toFixed(2)} €
          </p>
        )}

        {/* CTA */}
        <div className="pt-2 mt-auto">
          <Button variant="primary" size="md" fullWidth className="font-semibold py-3">
            {t('viewPack')}
          </Button>
        </div>
      </div>
    </div>
  )
}

