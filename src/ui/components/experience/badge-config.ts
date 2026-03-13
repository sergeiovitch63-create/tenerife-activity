/**
 * Badge configuration for ExperienceCard
 * 
 * Centralized badge labels and logic for easy remapping to operator API fields.
 * When operator API is integrated, update the badge rules to map to API fields.
 */

export type BadgeVariant = 'top' | 'bestseller' | 'family' | 'new'

export interface BadgeConfig {
  variant: BadgeVariant
  /** i18n key under namespace 'badges' */
  labelKey: string
}

/**
 * Badge i18n keys (namespace: badges)
 */
export const BADGE_LABEL_KEYS = {
  TOP_RATED: 'topRated',
  BESTSELLER: 'bestseller',
  FAMILY: 'family',
  NEW: 'new',
} as const

/**
 * Badge rules - isolated logic for determining which badges to show
 * 
 * TODO: When operator API is integrated, remap these rules to API fields:
 * - rating -> operator.rating or operator.reviewScore
 * - reviewCount -> operator.reviewCount or operator.totalReviews
 * - Add operator-specific badge fields if available
 */
export interface BadgeRule {
  condition: (experience: {
    rating?: number
    reviewCount?: number
  }) => boolean
  config: BadgeConfig
}

export const BADGE_RULES: BadgeRule[] = [
  {
    condition: (exp) => exp.rating !== undefined && exp.rating >= 4.5,
    config: {
      variant: 'top',
      labelKey: BADGE_LABEL_KEYS.TOP_RATED,
    },
  },
  {
    condition: (exp) => exp.reviewCount !== undefined && exp.reviewCount > 200,
    config: {
      variant: 'bestseller',
      labelKey: BADGE_LABEL_KEYS.BESTSELLER,
    },
  },
]

/**
 * Maximum number of badges to display per experience card
 */
export const MAX_BADGES_PER_CARD = 2








