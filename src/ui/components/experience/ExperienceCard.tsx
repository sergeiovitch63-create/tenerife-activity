'use client'

import { cn } from '@/ui/lib/cn'
import type { Experience } from '@/core/entities/experience'
import { Badge } from '@/ui/components/shared'
import { Link } from '@/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  BADGE_RULES,
  MAX_BADGES_PER_CARD,
  type BadgeConfig,
} from './badge-config'

interface ExperienceCardProps {
  experience: Experience
  variant?: 'grid' | 'list'
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Determine which badges to display for an experience
 * 
 * Badge logic is isolated in badge-config.ts for easy remapping to operator API fields
 */
function getExperienceBadges(experience: Experience): BadgeConfig[] {
  const badges: BadgeConfig[] = []

  for (const rule of BADGE_RULES) {
    if (rule.condition(experience)) {
      badges.push(rule.config)
      // Stop if we've reached the maximum
      if (badges.length >= MAX_BADGES_PER_CARD) {
        break
      }
    }
  }

  return badges
}

export function ExperienceCard({ experience, variant = 'grid' }: ExperienceCardProps) {
  const t = useTranslations('experience')
  const displayBadges = getExperienceBadges(experience)
  
  // Get image URL (prefer first from array, fallback to single imageUrl)
  const imageUrl = experience.imageUrls?.[0] || experience.imageUrl

  // List variant: horizontal layout with image on right
  if (variant === 'list') {
    return (
      <Link
        href={`/experience/${experience.slug}`}
        className={cn(
          'group block bg-white border border-glass-200 transition-all duration-200 overflow-hidden',
          'hover:border-ocean-300/50 hover:shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2',
          'flex flex-col md:flex-row md:items-stretch md:min-h-[200px]'
        )}
      >
        {/* Image Section - Top on mobile, Right on desktop */}
        {imageUrl && (
          <div className="w-full md:w-1/3 relative aspect-[4/3] md:aspect-auto md:h-auto order-1 md:order-2 md:min-h-[200px]">
            <Image
              src={imageUrl}
              alt={experience.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        )}
        {!imageUrl && (
          <div className="w-full md:w-1/3 relative aspect-[4/3] md:aspect-auto md:h-auto md:min-h-[200px] bg-gradient-to-br from-ocean-200 to-ocean-400 order-1 md:order-2" />
        )}

        {/* Text Section - Bottom on mobile, Left on desktop */}
        <div className="flex-1 p-5 md:p-6 flex flex-col justify-between order-2 md:order-1">
          <div className="flex flex-col gap-3">
            {/* Header: Title and Badges */}
            <div className="flex items-start gap-3">
              <h3 className="text-lg md:text-xl font-semibold text-glass-900 group-hover:text-ocean-600 transition-colors flex-1 line-clamp-2 leading-tight">
                {experience.title}
              </h3>
              {displayBadges.length > 0 && (
                <div className="flex gap-2 flex-shrink-0 pt-0.5">
                  {displayBadges.map((badge, idx) => (
                    <Badge key={idx} variant={badge.variant}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Short description */}
            {experience.shortDescription && (
              <p className="text-sm md:text-base text-glass-600 leading-relaxed line-clamp-2">
                {experience.shortDescription}
              </p>
            )}

            {/* Details: Duration, Location, Rating */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-glass-500">
              {experience.duration && (
                <span className="flex items-center gap-1.5">
                  <span>⏱</span>
                  <span>{experience.duration}</span>
                </span>
              )}
              {experience.location && (
                <span className="flex items-center gap-1.5">
                  <span>📍</span>
                  <span>{experience.location}</span>
                </span>
              )}
              {experience.rating && (
                <span className="flex items-center gap-1.5">
                  <span>⭐</span>
                  <span>{experience.rating.toFixed(1)}</span>
                  {experience.reviewCount && (
                    <span className="text-glass-400">
                      ({experience.reviewCount})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Footer: Price and CTA */}
          <div className="flex items-center justify-between gap-4 pt-4 mt-2 border-t border-glass-100">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-glass-500">{t('priceFrom')}</span>
              <span className="text-xl font-bold text-glass-900">
                {formatPrice(experience.price, experience.currency)}
              </span>
            </div>
            <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-ocean-600 text-white rounded transition-colors duration-200 group-hover:bg-ocean-700">
              {t('viewExperience')}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  // Grid variant: original vertical layout
  return (
    <Link
      href={`/experience/${experience.slug}`}
      className={cn(
        'group block p-6 bg-white border border-glass-200 transition-all duration-200',
        'hover:border-ocean-300/50 hover:shadow-md hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2'
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Header: Title and Badges */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-glass-900 group-hover:text-ocean-600 transition-colors flex-1">
              {experience.title}
            </h3>
            {displayBadges.length > 0 && (
              <div className="flex gap-2 flex-shrink-0">
                {displayBadges.map((badge, idx) => (
                  <Badge key={idx} variant={badge.variant}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Short description */}
          {experience.shortDescription && (
            <p className="text-sm text-glass-600 leading-relaxed">
              {experience.shortDescription}
            </p>
          )}
        </div>

        {/* Details: Duration, Location, Rating */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-glass-500">
          {experience.duration && (
            <span className="flex items-center gap-1">
              <span>⏱</span>
              <span>{experience.duration}</span>
            </span>
          )}
          {experience.location && (
            <span className="flex items-center gap-1">
              <span>📍</span>
              <span>{experience.location}</span>
            </span>
          )}
          {experience.rating && (
            <span className="flex items-center gap-1">
              <span>⭐</span>
              <span>{experience.rating.toFixed(1)}</span>
              {experience.reviewCount && (
                <span className="text-glass-400">
                  ({experience.reviewCount})
                </span>
              )}
            </span>
          )}
        </div>

        {/* Footer: Price and CTA */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-glass-100">
          <div className="flex flex-col">
            <span className="text-xs text-glass-500">{t('priceFrom')}</span>
            <span className="text-xl font-bold text-glass-900">
              {formatPrice(experience.price, experience.currency)}
            </span>
          </div>
          <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-ocean-600 text-white rounded transition-colors duration-200 group-hover:bg-ocean-700">
            {t('viewExperience')}
          </span>
        </div>
      </div>
    </Link>
  )
}

