'use client'

/**
 * Client-side image component with error fallback
 * Uses SafeImage to prevent /_next/image 400 errors
 * No more "Photo coming soon" - SafeImage handles fallback automatically
 */

import { SafeImage } from '@/components/SafeImage'

interface ClientImageProps {
  src: string | null
  alt: string
  className?: string
  fullHeight?: boolean // If true, image fills 100% height (for VIP cards)
}

export function ClientImage({ src, alt, className = '', fullHeight = false }: ClientImageProps) {
  // SafeImage handles validation and fallback automatically
  // Always render - no conditional placeholder needed
  return (
    <div className={`relative w-full ${fullHeight ? 'h-full' : 'aspect-[4/3]'} ${className}`}>
      <SafeImage
        src={src || undefined}
        alt={alt}
        fill
        sizes={fullHeight ? '33vw' : '25vw'}
        className="object-cover object-center"
      />
    </div>
  )
}





