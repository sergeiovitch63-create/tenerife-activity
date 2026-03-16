'use client'

import { useMemo, memo, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { cn } from '@/ui/lib/cn'
import type { Vibe } from '@/core/entities/vibe'
import { trackingProvider } from '@/config/tracking'
import { vibeSlugToTranslationKey } from './vibe-translations'
import { vibeThumbnails } from '@/data/vibeThumbnails'
import Image from 'next/image'
import { devWarn } from '@/lib/dev'
import { setupPrefetchOnInteraction } from '@/lib/mobile/prefetch'

interface VibeRowProps {
  vibe: Vibe
  index: number
}

function VibeRowComponent({ vibe, index }: VibeRowProps) {
  const t = useTranslations('vibes')
  const tCommon = useTranslations('common')
  const isMediaLeft = index % 2 === 0
  const linkRef = useRef<HTMLAnchorElement>(null)

  // Get translated vibe title
  const translationKey = vibeSlugToTranslationKey(vibe.slug)
  const translatedTitle = t(translationKey as any) || vibe.title
  
  // Get vibe thumbnail from static mapping (used for all vibes)
  const vibeThumbnail = useMemo(() => {
    const thumb = vibeThumbnails[vibe.slug]
    if (!thumb) {
      devWarn(`[vibes] Missing thumbnail for slug: ${vibe.slug}`)
    }
    return thumb || null
  }, [vibe.slug])
  
  // Setup intelligent prefetching for mobile
  useEffect(() => {
    if (!linkRef.current) return
    const cleanup = setupPrefetchOnInteraction(linkRef.current, `/activite/${vibe.slug}`)
    return cleanup
  }, [vibe.slug])

  // Memoize click handler to prevent recreation
  const handleClick = useCallback(() => {
    trackingProvider.track({ type: 'vibe_opened', vibeId: vibe.id })
  }, [vibe.id])

  return (
    <Link
      ref={linkRef}
      href={`/activite/${vibe.slug}`}
      prefetch={true}
      onClick={handleClick}
      className={cn(
        'block group',
        'transition-all duration-300'
      )}
    >
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-12 md:gap-8 md:items-center',
          'rounded-lg',
          'bg-white/70 backdrop-blur-md',
          'border border-glass-200/50',
          'p-6 md:p-8',
          'shadow-sm',
          'hover:shadow-lg hover:bg-white/80 hover:-translate-y-1',
          'transition-all duration-300 ease-out',
          'animate-fade-in-up',
          'will-change-transform'
        )}
        style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
      >
        {/* Media - Video for Theme Parks, placeholder for others */}
        <div
          className={cn(
            'md:col-span-5',
            isMediaLeft ? 'md:order-1' : 'md:order-2'
          )}
        >
          <div
            className={cn(
              'relative w-full',
              'aspect-video',
              'bg-gradient-to-br from-ocean-950/20 via-ocean-800/10 to-glass-900/20',
              'border border-glass-200 rounded-lg',
              'shadow-sm',
              'overflow-hidden',
              'group-hover:shadow-lg transition-all duration-300 ease-out',
              'min-h-[180px]'
            )}
          >
            {vibeThumbnail ? (
                <>
                  <Image
                    src={vibeThumbnail}
                    alt={translatedTitle}
                    fill
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    className="object-cover rounded-lg"
                    sizes="(max-width: 768px) 100vw, 41.666667vw"
                  />
                  {/* Subtle dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium text-glass-500">
                    {tCommon('videoPreview')}
                  </span>
                </div>
              )}
          </div>
        </div>

        {/* Text Content */}
        <div
          className={cn(
            'md:col-span-7',
            'flex flex-col justify-center',
            isMediaLeft ? 'md:order-2' : 'md:order-1'
          )}
        >
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-glass-900 group-hover:text-ocean-700 transition-colors">
              {translatedTitle}
            </h3>
            {(() => {
              const descriptionKey = `items.${translationKey}.description`
              const translatedDescription = t(descriptionKey as any)
              return translatedDescription ? (
                <p className="text-base md:text-lg text-glass-600 leading-relaxed">
                  {translatedDescription}
                </p>
              ) : null
            })()}
          </div>
        </div>
      </div>
    </Link>
  )
}

// Memoize to prevent unnecessary re-renders
// Only re-render if vibe or index changes
export const VibeRow = memo(VibeRowComponent, (prevProps, nextProps) => {
  return prevProps.vibe.id === nextProps.vibe.id && 
         prevProps.index === nextProps.index &&
         prevProps.vibe.slug === nextProps.vibe.slug
})

