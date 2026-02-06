'use client'

import { useRef, useState, useEffect } from 'react'

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

interface VibeVideoProps {
  slug: string
}

export function VibeVideo({ slug }: VibeVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [hasVideoError, setHasVideoError] = useState(false)

  const videoPath = VIBE_VIDEO_MAP[slug] || null

  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoPath) return

    video.muted = true
    video.loop = true
    video.playsInline = true
    video.setAttribute('webkit-playsinline', 'true')

    // Try to autoplay
    video.play().catch(() => {
      // Silently handle autoplay failures
    })
  }, [videoPath])

  if (!videoPath) return null

  return (
    <div className="relative w-full max-h-[420px] overflow-hidden rounded-xl">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        controls={false}
        disablePictureInPicture
        className="w-full h-full object-cover"
        onLoadedData={() => setIsVideoReady(true)}
        onCanPlay={() => setIsVideoReady(true)}
        onError={() => setHasVideoError(true)}
        style={{
          opacity: hasVideoError ? 0 : isVideoReady ? 1 : 0,
          transition: 'opacity 0.5s ease-out',
        }}
      >
        <source src={videoPath} type="video/mp4" />
      </video>
      {!isVideoReady && !hasVideoError && (
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-600 via-ocean-500 to-ocean-400" />
      )}
    </div>
  )
}



