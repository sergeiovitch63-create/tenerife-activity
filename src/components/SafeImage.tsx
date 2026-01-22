/**
 * SafeImage - Wrapper around next/image with automatic fallback handling
 * 
 * Prevents /_next/image 400 errors by:
 * - Validating src before passing to next/image
 * - Providing automatic fallback to /images/hero-poster.jpg
 * - Handling onError gracefully
 * - Ensuring sizes is set when fill is used
 */

'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src?: string | null
  fallbackSrc?: string
}

const DEFAULT_FALLBACK = '/images/hero-poster.jpg'

/**
 * Validate image src
 * Returns true if src is valid, false otherwise
 */
function isValidSrc(src: unknown): src is string {
  if (typeof src !== 'string') return false
  const trimmed = src.trim()
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return false
  // Must start with / (local) or http (external)
  return trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')
}

export function SafeImage({ src, fallbackSrc = DEFAULT_FALLBACK, fill, sizes, ...props }: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    // Validate initial src
    if (isValidSrc(src)) {
      return src
    }
    // Log fallback in DEV
    if (process.env.NODE_ENV === 'development' && src !== undefined && src !== null) {
      // eslint-disable-next-line no-console
      console.warn('[SAFE_IMAGE_FALLBACK]', {
        originalSrc: src,
        reason: typeof src !== 'string' ? 'not a string' : 'invalid format',
        fallback: fallbackSrc,
      })
    }
    return fallbackSrc
  })

  // Handle error - swap to fallback
  const handleError = () => {
    if (currentSrc !== fallbackSrc) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('[SAFE_IMAGE_FALLBACK]', {
          originalSrc: currentSrc,
          reason: 'onError triggered',
          fallback: fallbackSrc,
        })
      }
      setCurrentSrc(fallbackSrc)
    }
  }

  // Bypass Next/Image optimization for local images and API routes
  // This prevents /_next/image 400 errors when src is /images/... or /api/...
  const isLocal = typeof currentSrc === 'string' && currentSrc.startsWith('/images/')
  const isApi = typeof currentSrc === 'string' && currentSrc.startsWith('/api/')
  const unoptimized = isLocal || isApi

  // Ensure sizes is set when fill is used
  const finalSizes = fill && !sizes ? '100vw' : sizes

  // If fill is used, render with fill
  if (fill) {
    return (
      <Image
        {...props}
        src={currentSrc}
        fill
        sizes={finalSizes}
        unoptimized={unoptimized}
        onError={handleError}
        alt={props.alt || ''}
      />
    )
  }

  // Otherwise render with width/height
  return (
    <Image
      {...props}
      src={currentSrc}
      unoptimized={unoptimized}
      onError={handleError}
      alt={props.alt || ''}
    />
  )
}

