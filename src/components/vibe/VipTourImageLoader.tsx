'use client'

/**
 * Client component to load VIP Tour images dynamically
 * Used in server components that need to display VIP Tour images
 */

import { useState, useEffect } from 'react'
import { getVipTourLocalImages, isVipTourGroup, getVipTourCoverImageSync } from '@/lib/atlantico/vip-tours-images'

interface VipTourImageLoaderProps {
  groupCode: string | number
  fallbackImage?: string | null
  children: (imageUrl: string | null) => React.ReactNode
}

export function VipTourImageLoader({ groupCode, fallbackImage, children }: VipTourImageLoaderProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(() => {
    // Initial: use sync version for immediate render
    if (isVipTourGroup(groupCode)) {
      return getVipTourCoverImageSync(groupCode)
    }
    return fallbackImage || null
  })

  useEffect(() => {
    if (!isVipTourGroup(groupCode)) {
      setImageUrl(fallbackImage || null)
      return
    }

    // Load actual available images
    getVipTourLocalImages(groupCode)
      .then(images => {
        if (images.length > 0) {
          setImageUrl(images[0]) // Use first available image
        } else {
          // Fallback to sync version if API returns empty
          const syncImage = getVipTourCoverImageSync(groupCode)
          setImageUrl(syncImage || fallbackImage || null)
        }
      })
      .catch(() => {
        // On error, use sync version or fallback
        const syncImage = getVipTourCoverImageSync(groupCode)
        setImageUrl(syncImage || fallbackImage || null)
      })
  }, [groupCode, fallbackImage])

  return <>{children(imageUrl)}</>
}



