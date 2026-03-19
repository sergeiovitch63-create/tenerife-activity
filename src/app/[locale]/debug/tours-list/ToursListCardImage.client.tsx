'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

// Include '' for "cover" (no ext) and ' .png' for "cover .png" (Windows naming)
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '', ' .png']
const KNOWN_MISSING_IMAGE_CODES = new Set<string>()

interface ToursListCardImageProps {
  code: string
  alt: string
  className?: string
}

export function ToursListCardImage({ code, alt, className }: ToursListCardImageProps) {
  const t = useTranslations('common')
  const basePath = `/images/tours-list/${code}/cover`
  const [srcIndex, setSrcIndex] = useState(0)
  const [failed, setFailed] = useState(false)
  const shouldForceFallback = KNOWN_MISSING_IMAGE_CODES.has(String(code).trim())

  const handleError = useCallback(() => {
    if (srcIndex < EXTENSIONS.length - 1) {
      setSrcIndex((i) => i + 1)
    } else {
      setFailed(true)
    }
  }, [srcIndex])

  if (failed || shouldForceFallback) {
    return (
      <div className={`w-full h-full bg-glass-100 flex items-center justify-center ${className || ''}`}>
        <div className="flex flex-col items-center justify-center gap-1 text-gray-500">
          <span className="text-lg" aria-hidden="true">🏝️</span>
          <span className="text-xs">{t('noImage')}</span>
        </div>
      </div>
    )
  }

  const src = `${basePath}${EXTENSIONS[srcIndex]}`

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  )
}
