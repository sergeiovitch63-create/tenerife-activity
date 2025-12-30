'use client'

import { ExperienceCard } from '@/ui/components/experience'
import { trackingProvider } from '@/config/tracking'
import type { Experience } from '@/core/entities/experience'
import { useEffect, useRef } from 'react'

interface SearchResultCardProps {
  experience: Experience
}

export function SearchResultCard({ experience }: SearchResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handleClick = (e: MouseEvent) => {
      // Track when any part of the card is clicked
      trackingProvider.track({
        type: 'search_result_clicked',
        experienceId: experience.id,
      })
    }

    card.addEventListener('click', handleClick)
    return () => card.removeEventListener('click', handleClick)
  }, [experience.id])

  return (
    <div ref={cardRef}>
      <ExperienceCard experience={experience} />
    </div>
  )
}

