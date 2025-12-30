'use client'

import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/ui/lib/cn'
import type { Vibe } from '@/core/entities/vibe'
import { trackingProvider } from '@/config/tracking'
import { Link } from '@/navigation'
import { useVibeVideoPlayback } from './useVibeVideoPlayback'
import { getThumbnailPaths } from './video-utils'
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

interface VibeCardProps {
  vibe: Vibe
}

export function VibeCard({ vibe }: VibeCardProps) {
  const t = useTranslations('vibes')
  const videoRef = useRef<HTMLVideoElement>(null)
  // Use useMemo to ensure stable videoPath across renders
  const videoPath = useMemo(() => getVibeVideoPath(vibe.slug), [vibe.slug])
  const thumbnailPaths = useMemo(() => getThumbnailPaths(videoPath), [videoPath])
  const hasVideo = !!videoPath
  
  // Get translated vibe title
  const translationKey = vibeSlugToTranslationKey(vibe.slug)
  const translatedTitle = t(translationKey as any) || vibe.title
  
  // Get vibe thumbnail (fallback for non-video vibes)
  const vibeThumbnail = useMemo(() => {
    const thumb = vibeThumbnails[vibe.slug]
    if (!thumb) {
      devWarn(`[vibes] Missing thumbnail for slug: ${vibe.slug}`)
    }
    return thumb || null
  }, [vibe.slug])
  
  // Thumbnail state: try webp first, then jpg, then null (gradient shows)
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [hasVideoError, setHasVideoError] = useState(false)
  
  // Track which thumbnail formats we've already tried to prevent infinite loops
  const triedFormatsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)
  const hasErroredRef = useRef(false)

  // Register with video playback manager
  const containerRef = useVibeVideoPlayback(vibe.id, videoRef)

  // Initialize thumbnail source once when paths are available
  useEffect(() => {
    // Only initialize once per component mount
    if (!initializedRef.current && hasVideo && !hasErroredRef.current) {
      initializedRef.current = true
      if (thumbnailPaths.webp) {
        setThumbnailSrc(thumbnailPaths.webp)
        triedFormatsRef.current.add(thumbnailPaths.webp)
      } else if (thumbnailPaths.jpg) {
        setThumbnailSrc(thumbnailPaths.jpg)
        triedFormatsRef.current.add(thumbnailPaths.jpg)
      } else {
        setThumbnailSrc(null)
        hasErroredRef.current = true
      }
    }
  }, [hasVideo, thumbnailPaths.webp, thumbnailPaths.jpg])

  // Handle thumbnail load error - try jpg fallback ONCE
  const handleThumbnailError = useCallback(() => {
    // Only execute if we haven't already errored
    if (hasErroredRef.current) return
    
    // Use functional setState to access current value
    setThumbnailSrc((currentSrc) => {
      // Only try fallback if we haven't already tried jpg
      if (currentSrc?.endsWith('.webp') && thumbnailPaths.jpg && !triedFormatsRef.current.has(thumbnailPaths.jpg)) {
        // Try jpg fallback once
        triedFormatsRef.current.add(thumbnailPaths.jpg)
        return thumbnailPaths.jpg
      } else {
        // Both failed or already tried, use gradient (set to null) - prevent further attempts
        hasErroredRef.current = true
        triedFormatsRef.current.add(currentSrc || '')
        return null
      }
    })
  }, [thumbnailPaths.jpg])

  const handleClick = () => {
    trackingProvider.track({ type: 'vibe_opened', vibeId: vibe.id })
  }

  return (
    <Link
      href={`/vibe/${vibe.slug}`}
      onClick={handleClick}
      className={cn(
        'group block p-8 bg-white transition-all duration-300 ease-out relative overflow-hidden',
            'hover:bg-glass-50/50 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01]',
            'focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2',
            'border border-transparent hover:border-glass-200/50',
            'animate-fade-in-up',
            'will-change-transform',
            (hasVideo || vibeThumbnail) && 'min-h-[180px]'
          )}
          style={{ opacity: 0 }}
    >
      {/* Video background - ALWAYS render video element if hasVideo */}
      {hasVideo && (
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            minHeight: '180px',
            overflow: 'hidden',
          }}
        >
          {/* Gradient background fallback (always present) */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.3), rgba(30, 58, 138, 0.2))',
              zIndex: 0,
            }}
          />

          {/* Thumbnail poster layer - uses CSS background-image (NO visible <img> tag to prevent broken icon) */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500"
            style={{
              backgroundImage: thumbnailSrc ? `url(${thumbnailSrc})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: isVideoReady ? 0 : 1,
              zIndex: 1,
            }}
          >
            {/* Hidden image element to detect load errors and trigger fallback - only render once per format */}
            {thumbnailSrc && !hasErroredRef.current && (
              <img
                key={thumbnailSrc}
                src={thumbnailSrc}
                alt=""
                style={{ display: 'none', width: 0, height: 0, position: 'absolute' }}
                onError={handleThumbnailError}
                onLoad={() => {
                  // Image loaded successfully - mark as tried to prevent re-renders
                  triedFormatsRef.current.add(thumbnailSrc)
                }}
              />
            )}
          </div>

          {/* Video element - ALWAYS rendered */}
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            controls={false}
            disablePictureInPicture
            poster={thumbnailSrc || undefined}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ease-out"
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
        </div>
      )}
      
      {/* Thumbnail background for non-video vibes */}
      {!hasVideo && vibeThumbnail && (
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={vibeThumbnail}
            alt={translatedTitle}
            fill
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="object-cover transition-opacity duration-500"
            sizes="(max-width: 768px) 100vw, 100vw"
          />
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent pointer-events-none" style={{ zIndex: 1 }} />
        </div>
      )}

      <div className="flex flex-col items-start gap-5 relative z-10">
        {/* Soft visual anchor - not a badge */}
        <div className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300',
          (hasVideo || vibeThumbnail)
            ? 'bg-white/20 backdrop-blur-sm group-hover:bg-white/30'
            : 'bg-gradient-to-br from-ocean-50 to-ocean-100/50 group-hover:from-ocean-100 group-hover:to-ocean-200/50'
        )}>
          <span className={cn(
            'text-2xl font-medium transition-opacity',
            (hasVideo || vibeThumbnail)
              ? 'text-white opacity-90 group-hover:opacity-100'
              : 'text-ocean-700 opacity-70 group-hover:opacity-100'
          )}>
            {translatedTitle.charAt(0)}
          </span>
        </div>

        {/* Title - clearly dominant */}
        <h3 className={cn(
          'text-xl font-bold transition-colors leading-tight',
          (hasVideo || vibeThumbnail)
            ? 'text-white drop-shadow-lg'
            : 'text-glass-900 group-hover:text-ocean-700'
        )}>
          {translatedTitle}
        </h3>

        {/* Description - secondary, editorial tone */}
        {(() => {
          const descriptionKey = `items.${translationKey}.description`
          const translatedDescription = t(descriptionKey as any)
          return translatedDescription ? (
            <p className={cn(
              'text-sm leading-relaxed font-light',
              (hasVideo || vibeThumbnail)
                ? 'text-white/90 drop-shadow-md'
                : 'text-glass-600'
            )}>
              {translatedDescription}
            </p>
          ) : null
        })()}
      </div>
    </Link>
  )
}

