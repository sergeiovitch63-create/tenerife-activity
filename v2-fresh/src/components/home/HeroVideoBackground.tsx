'use client'
/**
 * HeroVideoBackground — client-side video backdrop for the home hero.
 *
 * Lazily renders an <video> behind its children with:
 *   - autoplay + muted + loop + playsInline (iOS-safe)
 *   - prefers-reduced-motion: skip video entirely, keep the fallback
 *     gradient the parent <section> already provides
 *   - Save-Data / slow-connection: skip video (navigator.connection)
 *
 * The component intentionally has NO poster prop — we rely on the parent
 * <section>'s bg-hero-gradient (behind the video layer) as the loading
 * and fallback state. This avoids shipping a placeholder image that
 * history has shown tends to rot (v1 had a text file at hero-poster.jpg).
 *
 * A dark gradient overlay sits on top of the video layer for legibility
 * of white text regardless of the video's luminance at any given frame.
 */
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  src: string
  className?: string
  children: React.ReactNode
}

function shouldLoadVideo(): boolean {
  if (typeof window === 'undefined') return false

  // Respect reduced-motion preference.
  const mm = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  if (mm?.matches) return false

  // Respect Save-Data / slow connection where exposed (Chromium).
  type NetInfoLike = { saveData?: boolean; effectiveType?: string }
  const nav = window.navigator as Navigator & { connection?: NetInfoLike }
  const c = nav.connection
  if (c?.saveData) return false
  if (c?.effectiveType && /^(slow-2g|2g)$/.test(c.effectiveType)) return false

  return true
}

export function HeroVideoBackground({ src, className, children }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [mount, setMount] = useState(false)

  useEffect(() => {
    if (shouldLoadVideo()) setMount(true)
  }, [])

  useEffect(() => {
    const v = ref.current
    if (!v || !mount) return
    v.setAttribute('webkit-playsinline', 'true')
  }, [mount])

  return (
    <div className={cn('relative w-full overflow-hidden', className)}>
      {/* Video layer — sits behind content, on top of parent gradient */}
      {mount && (
        <video
          ref={ref}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          className="absolute inset-0 w-full h-full object-cover object-[center_28%] md:object-center pointer-events-none"
          onCanPlay={() => {
            const v = ref.current
            if (!v) return
            v.muted = true
            v.play().catch(() => {
              /* autoplay policy — silent fallback */
            })
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}

      {/* Dark overlay for white-text legibility over any video frame */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Content slot */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
