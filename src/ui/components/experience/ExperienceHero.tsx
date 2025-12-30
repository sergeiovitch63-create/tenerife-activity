'use client'

import { cn } from '@/ui/lib/cn'
import type { Experience } from '@/core/entities/experience'
import { Badge } from '@/ui/components/shared'
import { BADGE_RULES, MAX_BADGES_PER_CARD, type BadgeConfig } from './badge-config'
import { useTranslations } from 'next-intl'

function getExperienceBadges(experience: Experience): BadgeConfig[] {
  const badges: BadgeConfig[] = []

  for (const rule of BADGE_RULES) {
    if (rule.condition(experience)) {
      badges.push(rule.config)
      if (badges.length >= MAX_BADGES_PER_CARD) {
        break
      }
    }
  }

  return badges
}

interface ExperienceHeroProps {
  experience: Experience
}

export function ExperienceHero({ experience }: ExperienceHeroProps) {
  const t = useTranslations('experience')
  const badges = getExperienceBadges(experience)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {badges.map((badge, idx) => (
          <Badge key={idx} variant={badge.variant}>
            {badge.label}
          </Badge>
        ))}
      </div>

      <h1 className="text-4xl md:text-5xl font-bold text-glass-900">
        {experience.title}
      </h1>

      {/* Key facts row */}
      <div className="flex flex-wrap items-center gap-6 text-sm text-glass-600">
        {experience.duration && (
          <span className="flex items-center gap-2">
            <span>⏱</span>
            <span>{experience.duration}</span>
          </span>
        )}
        {experience.location && (
          <span className="flex items-center gap-2">
            <span>📍</span>
            <span>{experience.location}</span>
          </span>
        )}
        {experience.rating && (
          <span className="flex items-center gap-2">
            <span>⭐</span>
            <span className="font-medium">{experience.rating.toFixed(1)}</span>
            {experience.reviewCount && (
              <span className="text-glass-500">
                ({t('reviewsCount', { count: experience.reviewCount })})
              </span>
            )}
          </span>
        )}
        {experience.meetingPoint && (
          <span className="flex items-center gap-2">
            <span>🚌</span>
            <span>{t('pickupAvailable')}</span>
          </span>
        )}
      </div>
    </div>
  )
}







