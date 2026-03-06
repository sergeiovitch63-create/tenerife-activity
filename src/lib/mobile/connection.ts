/**
 * Mobile connection detection and optimization
 * Detects connection speed and adapts content quality accordingly
 */

export type ConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'

export interface ConnectionInfo {
  effectiveType: ConnectionType
  downlink: number
  rtt: number
  saveData: boolean
}

/**
 * Get current connection information
 * Returns null if Network Information API is not available
 */
export function getConnectionInfo(): ConnectionInfo | null {
  if (typeof window === 'undefined') return null
  
  // @ts-ignore - Network Information API is not in all TypeScript definitions
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection

  if (!connection) return null

  return {
    effectiveType: (connection.effectiveType || 'unknown') as ConnectionType,
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
    saveData: connection.saveData || false,
  }
}

/**
 * Check if connection is slow (2G or 3G)
 */
export function isSlowConnection(): boolean {
  const info = getConnectionInfo()
  if (!info) return false
  
  return info.effectiveType === 'slow-2g' || 
         info.effectiveType === '2g' || 
         info.effectiveType === '3g' ||
         info.saveData === true
}

/**
 * Check if videos should be disabled based on connection
 */
export function shouldDisableVideosForConnection(): boolean {
  return isSlowConnection()
}

/**
 * Get optimal image quality based on connection
 * Returns quality percentage (0-100)
 */
export function getOptimalImageQuality(): number {
  const info = getConnectionInfo()
  if (!info) return 85 // Default quality
  
  if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') {
    return 60 // Low quality for slow connections
  }
  
  if (info.effectiveType === '3g' || info.saveData) {
    return 75 // Medium quality
  }
  
  return 85 // High quality for 4G+
}

