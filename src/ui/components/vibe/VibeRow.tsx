'use client'

import { useRef, useMemo, useState, memo } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { cn } from '@/ui/lib/cn'
import type { Vibe } from '@/core/entities/vibe'
import { trackingProvider } from '@/config/tracking'
import { useVibeVideoPlayback } from './useVibeVideoPlayback'
import { vibeSlugToTranslationKey } from './vibe-translations'
import { vibeThumbnails } from '@/data/vibeThumbnails'
import Image from 'next/image'
import { devWarn, devError } from '@/lib/dev'

// Mapping of vibe slugs to video files
// MISSING VIDEOS NOW ADDED: vip-tours, car-rental, bike-rental, transfers-transport
const VIBE_VIDEO_MAP: Record<string, string> = {
  'vip-tours': '/videos/VIP-Tours.mp4',
  'theme-parks': '/videos/vibe-theme-parks.mp4',
  'tickets-attractions': '/videos/tickets-attractions.mp4',
  'bus-excursions': '/videos/bus-excursions.mp4',
  'boat-trips-cruises': '/videos/boat-trips-cruises.mp4',
  'shows-entertainment': '/videos/shows-entertainment.mp4',
  'water-sports': '/videos/water-sports.mp4',
  'cable-car-observatory': '/videos/cable-car-observatory.mp4',
  'diving-fishing': '/videos/diving-fishing.mp4',
  'adventure-nature': '/videos/adventure-nature.mp4',
  'gastronomy-tastings': '/videos/gastronomy-tastings.mp4',
  'car-rental': '/videos/car-rental.mp4',
  'bike-rental': '/videos/bike-rental.mp4',
  'transfers-transport': '/videos/transfers-transport.mp4',
}

function getVibeVideoPath(slug: string): string | null {
  return VIBE_VIDEO_MAP[slug] || null
}

interface VibeRowProps {
  vibe: Vibe
  index: number
}

function VibeRowComponent({ vibe, index }: VibeRowProps) {
  const t = useTranslations('vibes')
  const tCommon = useTranslations('common')
  const isMediaLeft = index % 2 === 0
  const videoRef = useRef<HTMLVideoElement>(null)
  // Use useMemo to ensure stable videoPath across renders
  const videoPath = useMemo(() => getVibeVideoPath(vibe.slug), [vibe.slug])
  const hasVideo = !!videoPath
  
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
  
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [hasVideoError, setHasVideoError] = useState(false)

  // Register with video playback manager
  const containerRef = useVibeVideoPlayback(vibe.id, videoRef)

  const handleClick = () => {
    trackingProvider.track({ type: 'vibe_opened', vibeId: vibe.id })
  }

  return (
    <Link
      href={`/vibe/${vibe.slug}`}
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
            ref={hasVideo ? containerRef : undefined}
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
            {hasVideo ? (
              <>
                {/* Gradient background fallback (always present) */}
                <div
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.3), rgba(30, 58, 138, 0.2))',
                    zIndex: 0,
                  }}
                />

                {/* Thumbnail poster layer - uses static thumbnail from /videos/thumbnails/ */}
                {vibeThumbnail && (
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500"
                    style={{
                      zIndex: 1,
                      opacity: isVideoReady ? 0 : 1,
                    }}
                  >
                    <Image
                      src={vibeThumbnail}
                      alt={translatedTitle}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 41.666667vw"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}

                {/* Video element - ALWAYS rendered */}
                <video
                  ref={videoRef}
                  muted
                  loop
                  playsInline
                  preload="none"
                  controls={false}
                  disablePictureInPicture
                  poster={vibeThumbnail || undefined}
                  className="absolute inset-0 h-full w-full object-cover pointer-events-none transition-opacity duration-500 ease-out"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: hasVideoError ? 0 : isVideoReady ? 1 : 0,
                    zIndex: 2,
                  }}
                  onLoadedData={() => {
                    setIsVideoReady(true)
                  }}
                  onCanPlay={() => {
                    setIsVideoReady(true)
                  }}
                  onPlaying={() => {
                    setIsVideoReady(true)
                  }}
                  onError={() => {
                    devError('[VIDEO_ERROR]', videoPath)
                    setHasVideoError(true)
                  }}
                >
                  <source src={videoPath} type="video/mp4" />
                </video>

                {/* Dark gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent pointer-events-none" style={{ zIndex: 3 }} />
              </>
            ) : (
              vibeThumbnail ? (
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
              )
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
export const VibeRow = memo(VibeRowComponent)

