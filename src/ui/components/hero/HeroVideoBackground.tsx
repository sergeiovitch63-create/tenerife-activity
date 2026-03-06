'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/ui/lib/cn'

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

  // iOS fallback safety: force playback after mount
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    // Set webkit-playsinline for older iOS versions
    video.setAttribute('webkit-playsinline', 'true')
    
    // Ensure muted and force play
    video.muted = true
    video.play().catch(() => {
      // Silently handle autoplay failures
    })
  }, [])

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
      {/* Video Background */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{ 
          zIndex: -1,
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          controls={false}
          disablePictureInPicture
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -1,
            opacity: 1,
            display: 'block',
            pointerEvents: 'none',
          }}
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
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

