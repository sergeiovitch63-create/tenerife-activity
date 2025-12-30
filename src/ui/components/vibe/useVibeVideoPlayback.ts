'use client'

import { useEffect, useRef } from 'react'
import { shouldAutoplayVideo, shouldDisableVideos } from '@/lib/mediaPolicy'

interface VideoEntry {
  video: HTMLVideoElement
  container: HTMLElement
  id: string
  intersectionRatio: number
  lastIntersectionEntry: IntersectionObserverEntry | null
}

/**
 * Global VideoPlaybackManager for vibe videos
 * - Uses a single IntersectionObserver for all videos
 * - Plays only the video closest to viewport center with highest visibility
 * - Throttles switching to prevent constant restarts
 * - Safe promise handling for play() calls
 */
class VideoPlaybackManager {
  private videos = new Map<string, VideoEntry>()
  private observer: IntersectionObserver | null = null
  private activeVideoId: string | null = null
  private lastSwitchTime = 0
  private readonly THROTTLE_MS = 300
  private readonly VISIBILITY_WEIGHT = 0.7
  private readonly CENTER_DISTANCE_WEIGHT = 0.3

  private getViewportCenter(): number {
    return window.innerHeight / 2
  }

  private getDistanceToCenter(element: HTMLElement): number {
    const rect = element.getBoundingClientRect()
    const elementCenter = rect.top + rect.height / 2
    const viewportCenter = this.getViewportCenter()
    return Math.abs(elementCenter - viewportCenter)
  }

  private normalizeCenterDistance(distance: number): number {
    // Normalize distance: closer to center = higher score
    // Use viewport height as normalization factor
    const maxDistance = window.innerHeight
    return Math.max(0, 1 - distance / maxDistance)
  }

  private calculateScore(entry: IntersectionObserverEntry, container: HTMLElement): number {
    const visibilityRatio = entry.intersectionRatio
    const centerDistance = this.getDistanceToCenter(container)
    const normalizedDistance = this.normalizeCenterDistance(centerDistance)

    const score =
      visibilityRatio * this.VISIBILITY_WEIGHT + normalizedDistance * this.CENTER_DISTANCE_WEIGHT

    return score
  }


  private async safePlay(video: HTMLVideoElement): Promise<void> {
    try {
      // Ensure muted for autoplay policy
      video.muted = true
      await video.play()
    } catch (error) {
      // Silently handle autoplay failures (no console spam)
      // Video will remain paused, showing first frame
    }
  }

  private async safePause(video: HTMLVideoElement): Promise<void> {
    try {
      video.pause()
    } catch (error) {
      // Silently handle pause failures
    }
  }

  private handleIntersection = (entries: IntersectionObserverEntry[]) => {
    // Update intersection state for all entries
    for (const entry of entries) {
      for (const [, videoEntry] of this.videos) {
        if (videoEntry.container === entry.target) {
          videoEntry.intersectionRatio = entry.intersectionRatio
          videoEntry.lastIntersectionEntry = entry
          break
        }
      }
    }

    const now = Date.now()
    if (now - this.lastSwitchTime < this.THROTTLE_MS) {
      return
    }

    // Evaluate all videos using their latest intersection state
    let bestEntry: VideoEntry | null = null
    let bestScore = -1

    for (const [, videoEntry] of this.videos) {
      if (videoEntry.lastIntersectionEntry && videoEntry.intersectionRatio > 0) {
        const score = this.calculateScore(
          videoEntry.lastIntersectionEntry,
          videoEntry.container
        )
        if (score > bestScore) {
          bestScore = score
          bestEntry = videoEntry
        }
      }
    }

    if (!bestEntry) {
      return
    }

    // If same video is already active, do nothing
    if (this.activeVideoId === bestEntry.id) {
      return
    }

    // Pause all videos
    for (const [, entry] of this.videos) {
      if (entry.id !== bestEntry.id) {
        this.safePause(entry.video)
      }
    }

    // Play the best video
    this.activeVideoId = bestEntry.id
    this.lastSwitchTime = now
    this.safePlay(bestEntry.video)
  }

  register(id: string, video: HTMLVideoElement, container: HTMLElement): () => void {
    // Check if videos should be disabled
    if (shouldDisableVideos()) {
      // Don't register video, just return no-op cleanup
      return () => {}
    }

    // Initialize video properties
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'none' // Changed to 'none' for better performance

    // Create observer if it doesn't exist
    if (!this.observer) {
      this.observer = new IntersectionObserver(this.handleIntersection, {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
        rootMargin: '0px',
      })
    }

    // Only proceed if autoplay is allowed
    if (!shouldAutoplayVideo()) {
      // Return no-op cleanup - video will show poster only
      return () => {}
    }

    // Store video entry with initial intersection state
    this.videos.set(id, {
      video,
      container,
      id,
      intersectionRatio: 0,
      lastIntersectionEntry: null,
    })

    // Observe the container
    // Note: IntersectionObserver will fire immediately when element is first observed,
    // allowing the handler to determine the best video to play
    this.observer.observe(container)

    // Return cleanup function
    return () => {
      this.videos.delete(id)
      if (this.observer) {
        this.observer.unobserve(container)
      }

      // If this was the active video, find a new one
      if (this.activeVideoId === id) {
        this.activeVideoId = null
        const remainingVideos = Array.from(this.videos.values())
        if (remainingVideos.length > 0) {
          const nextVideo = remainingVideos[0]
          this.activeVideoId = nextVideo.id
          this.safePlay(nextVideo.video)
        }
      }

      // Clean up observer if no videos left
      if (this.videos.size === 0 && this.observer) {
        this.observer.disconnect()
        this.observer = null
      }
    }
  }
}

// Singleton instance
const manager = new VideoPlaybackManager()

/**
 * Hook to manage vibe video playback
 * - Registers video with global manager
 * - Automatically handles play/pause based on visibility
 * - Returns container ref to attach to wrapper element
 */
export function useVibeVideoPlayback(videoId: string, videoRef: React.RefObject<HTMLVideoElement>) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!videoRef.current || !containerRef.current) {
      return
    }

    const cleanup = manager.register(videoId, videoRef.current, containerRef.current)

    return cleanup
  }, [videoId, videoRef])

  return containerRef
}

