'use client'

import { useProgressiveRender } from '@/ui/hooks/useProgressiveRender'
import { VibeRow } from './VibeRow'
import type { Vibe } from '@/core/entities/vibe'
import { useMemo, memo } from 'react'

interface VibesListProps {
  vibes: Vibe[]
}

function VibesListComponent({ vibes }: VibesListProps) {
  const { visibleCount } = useProgressiveRender({
    initialCount: Math.max(15, vibes.length),
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

// Memoize to prevent re-renders when vibes array reference doesn't change
export const VibesList = memo(VibesListComponent, (prevProps, nextProps) => {
  // Only re-render if vibes array length or IDs change
  if (prevProps.vibes.length !== nextProps.vibes.length) return false
  return prevProps.vibes.every((vibe, index) => vibe.id === nextProps.vibes[index]?.id)
})
