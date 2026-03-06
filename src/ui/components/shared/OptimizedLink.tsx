'use client'

import { Link as NextIntlLink } from '@/navigation'
import { useEffect, useRef } from 'react'
import { setupPrefetchOnInteraction } from '@/lib/mobile/prefetch'
import type { ComponentProps } from 'react'

interface OptimizedLinkProps extends ComponentProps<typeof NextIntlLink> {
  prefetchOnHover?: boolean
}

/**
 * Optimized Link component with intelligent prefetching
 * - Prefetches on touchstart (mobile) for instant navigation
 * - Prefetches on hover (desktop) with small delay
 * - Uses Next.js prefetch by default
 */
export function OptimizedLink({ 
  href, 
  prefetchOnHover = true,
  prefetch = true,
  ...props 
}: OptimizedLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!prefetchOnHover || !linkRef.current || typeof href !== 'string') return

    const cleanup = setupPrefetchOnInteraction(linkRef.current, href)
    return cleanup
  }, [href, prefetchOnHover])

  return (
    <NextIntlLink
      ref={linkRef}
      href={href}
      prefetch={prefetch}
      {...props}
    />
  )
}

