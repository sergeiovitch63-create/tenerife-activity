'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

// Include '' for "cover" (no ext) and ' .png' for "cover .png" (Windows naming)
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '', ' .png']
const KNOWN_MISSING_IMAGE_CODES = new Set<string>()

/** How many grid cards load eagerly (above-the-fold); avoids native lazy-load bugs on some browsers. */
export const TOURS_LIST_IMAGE_PRIORITY_COUNT = 12

interface ToursListCardImageProps {
  code: string
  alt: string
  className?: string
  /**
   * When true: `loading="eager"` + higher fetch priority. Native `loading="lazy"` can fail to start
   * for images already in the viewport at first paint (IntersectionObserver / layout timing on
   * desktop Safari, some mobile Chrome builds).
   */
  priority?: boolean
}

export function ToursListCardImage({ code, alt, className, priority = false }: ToursListCardImageProps) {
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
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onError={handleError}
    />
  )
}
