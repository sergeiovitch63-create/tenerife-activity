export interface Experience {
  id: string
  slug: string
  title: string
  description: string
  shortDescription?: string
  price: number
  currency: string
  imageUrl?: string
  imageUrls?: string[]
  vibeId: string
  location?: string
  duration?: string
  rating?: number
  reviewCount?: number
  highlights?: string[]
  included?: string[]
  notIncluded?: string[]
  importantInfo?: string[]
  cancellationPolicy?: string
  meetingPoint?: string
  language?: string
  groupSize?: string
  availabilityHint?: string
  durationMinutes?: number // Duration in minutes for filtering/sorting
}

