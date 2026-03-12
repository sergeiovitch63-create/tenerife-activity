'use client'

import { useRef, useState, useEffect } from 'react'

const VIBE_VIDEO_MAP: Record<string, string> = {
  'vip-tours': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Vip-Tours.mp4',
  'theme-parks': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Vibe-Theme-Parks.mp4',
  'tickets-attractions': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Tickets-Attractions.mp4',
  'bus-excursions': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Bus-Excursions.mp4',
  'boat-trips-cruises': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Boat-Trips-Cruises.mp4',
  'shows-entertainment': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Shows-Entertainment.mp4',
  'water-sports': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Water-Sports.mp4',
  'cable-car-observatory': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Cable-Car-Observatory.mp4',
  'diving-fishing': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Diving-Fishing.mp4',
  'adventure-nature': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Adventure-Nature.mp4',
  'gastronomy-tastings': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Gastronomy-Tastings.mp4',
  'car-rental': '/videos/car-rental.mp4',
  'bike-rental': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Bike-Rental.mp4',
  'transfers-transport': 'https://pub-9b5481c9681440ba850c2f985db0680e.r2.dev/Transfers-Transport.mp4',
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











