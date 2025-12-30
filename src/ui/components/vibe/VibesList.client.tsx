'use client'

import { useProgressiveRender } from '@/ui/hooks/useProgressiveRender'
import { VibeRow } from './VibeRow'
import type { Vibe } from '@/core/entities/vibe'
import { useMemo } from 'react'

interface VibesListProps {
  vibes: Vibe[]
}

export function VibesList({ vibes }: VibesListProps) {
  const { visibleCount } = useProgressiveRender({
    initialCount: 10,
    batchSize: 6,
    threshold: 500,
    totalCount: vibes.length,
  })

  // Memoize visible vibes to prevent unnecessary recalculations
  const visibleVibes = useMemo(() => vibes.slice(0, visibleCount), [vibes, visibleCount])

  return (
    <div className="space-y-4 md:space-y-6">
      {visibleVibes.map((vibe, index) => (
        <VibeRow key={vibe.id} vibe={vibe} index={index} />
      ))}
    </div>
  )
}
