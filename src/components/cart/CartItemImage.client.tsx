'use client'

import { useState, useCallback } from 'react'

const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '', ' .png']

interface CartItemImageProps {
  code: string
  alt: string
  className?: string
}

export function CartItemImage({ code, alt, className }: CartItemImageProps) {
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
      <div
        className={`flex items-center justify-center bg-glass-100 text-glass-400 text-sm ${className || ''}`}
      >
        —
      </div>
    )
  }

  return (
    <img
      src={`${basePath}${EXTENSIONS[srcIndex]}`}
      alt={alt}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  )
}
