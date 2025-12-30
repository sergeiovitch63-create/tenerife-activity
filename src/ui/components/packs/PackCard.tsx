'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { cn } from '@/ui/lib/cn'
import { Badge } from '@/ui/components/shared'
import { Button } from '@/ui/components/shared/Button'

interface PackCardData {
  id: string
  slug: string
  title: string
  category: string
  description: string
  badge?: string
  image: string
}

interface PackCardProps {
  pack: PackCardData
}

export function PackCard({ pack }: PackCardProps) {
  const [imageError, setImageError] = useState(false)
  const t = useTranslations('activityPacks')

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div
      className={cn(
          'group relative flex flex-col bg-white border border-glass-200 rounded-xl overflow-hidden',
          'transition-all duration-300 ease-out h-full',
          'hover:border-ocean-300/50 hover:shadow-lg',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-ocean-500 focus-within:ring-offset-2',
          'will-change-transform'
        )}
    >
      {/* Image Section - 16:9 aspect ratio */}
      <div className="relative w-full aspect-video bg-gradient-to-br from-ocean-200 to-ocean-400 overflow-hidden rounded-t-xl">
        {!imageError ? (
          <Image
            src={pack.image}
            alt={pack.title}
            fill
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="object-cover rounded-t-xl transition-all duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={handleImageError}
          />
        ) : null}
        {/* Badge - Overlay on image */}
        {pack.badge && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="top">{pack.badge}</Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Category */}
        {pack.category && (
          <div className="text-xs font-medium text-ocean-600 uppercase tracking-wide">
            {pack.category}
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl font-bold text-glass-900 group-hover:text-ocean-700 transition-colors line-clamp-2 leading-tight">
          {pack.title}
        </h3>

        {/* Description */}
        {pack.description && (
          <p className="text-sm text-glass-600 leading-relaxed line-clamp-3 flex-1">
            {pack.description}
          </p>
        )}

        {/* CTA Button */}
        <div className="pt-3 mt-auto">
          <Button variant="primary" size="md" fullWidth>
            {t('viewPack')}
          </Button>
        </div>
      </div>
    </div>
  )
}

