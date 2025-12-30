/**
 * Badge configuration for ExperienceCard
 * 
 * Centralized badge labels and logic for easy remapping to operator API fields.
 * When operator API is integrated, update the badge rules to map to API fields.
 */

export type BadgeVariant = 'top' | 'bestseller' | 'family' | 'new'

export interface BadgeConfig {
  variant: BadgeVariant
  label: string
}

/**
 * Badge labels - centralized for easy translation/API mapping
 */
export const BADGE_LABELS = {
  TOP_RATED: 'Top Rated',
  BESTSELLER: 'Bestseller',
  FAMILY: 'Family',
  NEW: 'New',
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
      label: BADGE_LABELS.TOP_RATED,
    },
  },
  {
    condition: (exp) => exp.reviewCount !== undefined && exp.reviewCount > 200,
    config: {
      variant: 'bestseller',
      label: BADGE_LABELS.BESTSELLER,
    },
  },
]

/**
 * Maximum number of badges to display per experience card
 */
export const MAX_BADGES_PER_CARD = 2







