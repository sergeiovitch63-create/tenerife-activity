'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/ui/lib/cn'
import { shouldAutoplayVideo, shouldDisableVideos } from '@/lib/mediaPolicy'

interface HeroVideoBackgroundProps {
  src: string
  poster?: string
  className?: string
  overlayClassName?: string
  children: React.ReactNode
}

export function HeroVideoBackground({
  src,
  poster,
  className,
  overlayClassName = 'bg-black/35',
  children,
}: HeroVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldRenderVideo, setShouldRenderVideo] = useState(false)

  // Décide si la vidéo peut être chargée / lue en fonction de la connexion et des préférences utilisateur
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (shouldDisableVideos() || !shouldAutoplayVideo()) {
      setShouldRenderVideo(false)
      return
    }

    setShouldRenderVideo(true)
  }, [])

  // Configure la vidéo côté client (playsinline, etc.)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !shouldRenderVideo) return

    // Set webkit-playsinline for older iOS versions
    video.setAttribute('webkit-playsinline', 'true')
  }, [shouldRenderVideo])

  return (
    <div 
      className={cn(
        'relative w-full',
        'min-h-[88vh] md:min-h-[calc(100vh-80px+400px)]',
        'pt-[calc(env(safe-area-inset-top)+64px)] md:pt-20',
        className
      )} 
      style={{ 
        position: 'relative',
      }}
    >
      {/* Video ou poster en arrière-plan */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{ 
          zIndex: -1,
          overflow: 'hidden',
        }}
      >
        {shouldRenderVideo ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            controls={false}
            disablePictureInPicture
            poster={poster}
            className="absolute inset-0 w-full h-full object-cover object-[center_28%] md:object-center transition-opacity duration-500"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 28%',
              zIndex: -1,
              opacity: 1,
              display: 'block',
              pointerEvents: 'none',
            }}
            onCanPlay={() => {
              const video = videoRef.current
              if (!video) return
              video.muted = true
              video.play().catch(() => {
                // Silencieusement ignorer les erreurs d'autoplay
              })
            }}
          >
            <source src={src} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          poster && (
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-[center_28%] md:bg-center"
              style={{
                backgroundImage: `url(${poster})`,
              }}
            />
          )
        )}
      </div>
      
      {/* Premium Gradient Overlay */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          zIndex: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.35) 100%)',
          pointerEvents: 'none',
        }}
      />
      
      {/* Content */}
      <div 
        className="relative w-full" 
        style={{ 
          zIndex: 1,
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  )
}

