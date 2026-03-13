'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

// Include '' for "cover" (no ext) and ' .png' for "cover .png" (Windows naming)
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '', ' .png']

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

  const handleError = useCallback(() => {
    if (srcIndex < EXTENSIONS.length - 1) {
      setSrcIndex((i) => i + 1)
    } else {
      setFailed(true)
    }
  }, [srcIndex])

  if (failed) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-glass-400 text-sm bg-glass-100 ${className || ''}`}>
        {t('noImage')}
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
