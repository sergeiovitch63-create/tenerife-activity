/**
 * Media policy helpers for performance optimization
 * Centralizes rules for video autoplay, image loading, and network conditions
 */

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check if user has Save-Data enabled
 */
export function hasSaveData(): boolean {
  if (typeof window === 'undefined' || !('connection' in navigator)) return false
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  return connection?.saveData === true
}

/**
 * Check if connection is slow (2g or 3g)
 */
export function isSlowConnection(): boolean {
  if (typeof window === 'undefined' || !('connection' in navigator)) return false
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  if (!connection?.effectiveType) return false
  const effectiveType = connection.effectiveType
  return effectiveType === '2g' || effectiveType === 'slow-2g' || effectiveType === '3g'
}

/**
 * Check if videos should be disabled (slow connection or save-data)
 */
export function shouldDisableVideos(): boolean {
  return hasSaveData() || isSlowConnection()
}

/**
 * Check if videos should autoplay (respects reduced motion and network conditions)
 */
export function shouldAutoplayVideo(): boolean {
  return !prefersReducedMotion() && !shouldDisableVideos()
}

/**
 * Get effective connection type
 */
export function getConnectionType(): string | null {
  if (typeof window === 'undefined' || !('connection' in navigator)) return null
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  return connection?.effectiveType || null
}

