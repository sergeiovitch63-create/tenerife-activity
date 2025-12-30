'use client'

import { useRef, useState } from 'react'
import { cn } from '@/ui/lib/cn'
import type { Activity } from '@/core/entities/activity'
import { Link } from '@/navigation'

interface ActivityCardProps {
  activity: Activity
  href: string
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ActivityCard({ activity, href }: ActivityCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [hasVideoError, setHasVideoError] = useState(false)
  const hasVideo = activity.media.type === 'video'

  return (
    <Link
      href={href}
      className={cn(
        'group block relative overflow-hidden rounded-lg transition-all duration-300',
        'hover:shadow-xl hover:-translate-y-1',
        'focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2',
        hasVideo ? 'aspect-[4/3]' : 'min-h-[300px]'
      )}
    >
      {/* Video/Image Background */}
      {hasVideo && (
        <div className="absolute inset-0 w-full h-full">
          {/* Fallback gradient background (shows before video is ready) */}
          <div
            className="absolute inset-0 w-full h-full bg-gradient-to-br from-ocean-600 via-ocean-500 to-ocean-400"
            style={{ zIndex: 0 }}
          />

          {/* Video element */}
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            controls={false}
            disablePictureInPicture
            poster={activity.media.poster || undefined}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500"
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
              zIndex: 1,
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
            onError={(e) => {
              // Video error - gracefully degrade
              setHasVideoError(true)
            }}
          >
            <source src={activity.media.src} type="video/mp4" />
          </video>

          {/* Fallback gradient if video fails */}
          {hasVideoError && (
            <div
              className="absolute inset-0 w-full h-full bg-gradient-to-br from-ocean-600 via-ocean-500 to-ocean-400"
              style={{ zIndex: 0 }}
            />
          )}

          {/* Dark gradient overlay for text readability */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none"
            style={{ zIndex: 2 }}
          />
        </div>
      )}

      {!hasVideo && activity.media.type === 'image' && (
        <div className="absolute inset-0 w-full h-full">
          <img
            src={activity.media.src}
            alt={activity.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 1 }}
          />
          {/* Dark gradient overlay for text readability */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none"
            style={{ zIndex: 2 }}
          />
        </div>
      )}

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
        <div className="space-y-3">
          {/* Title */}
          <h3 className="text-2xl font-bold leading-tight text-white drop-shadow-lg transition-colors">
            {activity.title}
          </h3>

          {/* Location and Duration */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {activity.location && (
              <span className="flex items-center gap-1.5 text-white/90 drop-shadow-md">
                <span>📍</span>
                <span>{activity.location}</span>
              </span>
            )}
            {activity.duration && (
              <span className="flex items-center gap-1.5 text-white/90 drop-shadow-md">
                <span>⏱</span>
                <span>{activity.duration}</span>
              </span>
            )}
          </div>

          {/* Price */}
          <div className="pt-2">
            <div className="text-xs font-medium mb-1 text-white/80">
              From
            </div>
            <div className="text-3xl font-bold text-white drop-shadow-lg">
              {formatPrice(activity.priceFrom)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

