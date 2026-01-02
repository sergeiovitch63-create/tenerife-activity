'use client'

import { useEffect, useRef, useState } from 'react'
import { shouldAutoplayVideo } from '@/lib/mediaPolicy'

interface UseAutoplayVideoOnViewOptions {
  /**
   * Maximum number of videos that can play simultaneously
   * @default 2
   */
  maxPlaying?: number
  /**
   * Intersection threshold (0-1) for when video should start playing
   * @default 0.4
   */
  threshold?: number
  /**
   * Whether to reset video to start when it goes out of view
   * @default false
   */
  resetOnExit?: boolean
}

/**
 * Global manager for video playback to limit concurrent videos
 */
class VideoPlaybackManager {
  private playingVideos = new Set<HTMLVideoElement>()
  private maxPlaying: number

  constructor(maxPlaying: number = 2) {
    this.maxPlaying = maxPlaying
  }

  canPlay(video: HTMLVideoElement): boolean {
    // If we're under the limit, allow playback
    if (this.playingVideos.size < this.maxPlaying) {
      return true
    }

    // If this video is already playing, allow it to continue
    if (this.playingVideos.has(video)) {
      return true
    }

    // Otherwise, pause the least visible video
    return false
  }

  requestPlay(video: HTMLVideoElement): boolean {
    if (this.playingVideos.has(video)) {
      return true
    }

    if (this.playingVideos.size >= this.maxPlaying) {
      // Pause the first video in the set (FIFO)
      const firstVideo = Array.from(this.playingVideos)[0]
      if (firstVideo) {
        firstVideo.pause()
        this.playingVideos.delete(firstVideo)
      }
    }

    this.playingVideos.add(video)
    return true
  }

  pause(video: HTMLVideoElement) {
    this.playingVideos.delete(video)
  }

  reset() {
    this.playingVideos.forEach((video) => {
      video.pause()
    })
    this.playingVideos.clear()
  }
}

// Global instance
let playbackManager: VideoPlaybackManager | null = null

function getPlaybackManager(maxPlaying: number): VideoPlaybackManager {
  if (!playbackManager) {
    playbackManager = new VideoPlaybackManager(maxPlaying)
  }
  return playbackManager
}

/**
 * Hook to autoplay video when element enters viewport
 * Respects prefers-reduced-motion, save-data, and slow connections
 * Limits concurrent video playback
 */
export function useAutoplayVideoOnView(
  videoRef: React.RefObject<HTMLVideoElement>,
  containerRef: React.RefObject<HTMLElement>,
  options: UseAutoplayVideoOnViewOptions = {}
) {
  const { maxPlaying = 2, threshold = 0.4, resetOnExit = false } = options
  const [isVisible, setIsVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const managerRef = useRef<VideoPlaybackManager | null>(null)

  useEffect(() => {
    // Initialize manager
    managerRef.current = getPlaybackManager(maxPlaying)

    // Check if videos should be enabled
    if (!shouldAutoplayVideo()) {
      return
    }

    const video = videoRef.current
    const container = containerRef.current

    if (!video || !container) return

    // Create IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting && entry.intersectionRatio >= threshold

          if (isIntersecting && !isVisible) {
            // Video should play
            setIsVisible(true)
            const manager = managerRef.current
            if (manager && manager.requestPlay(video)) {
              video.play().catch((error) => {
                // Silently handle autoplay failures
                console.debug('[VIDEO_AUTOPLAY] Failed to play:', error)
              })
            }
          } else if (!isIntersecting && isVisible) {
            // Video should pause
            setIsVisible(false)
            const manager = managerRef.current
            if (manager) {
              manager.pause(video)
            }
            video.pause()
            if (resetOnExit) {
              video.currentTime = 0
            }
          }
        })
      },
      {
        threshold: [threshold],
        rootMargin: '0px',
      }
    )

    observerRef.current.observe(container)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      if (video && managerRef.current) {
        managerRef.current.pause(video)
      }
    }
  }, [videoRef, containerRef, threshold, maxPlaying, resetOnExit, isVisible])

  return { isVisible }
}


