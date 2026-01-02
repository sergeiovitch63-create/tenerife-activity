/**
 * Development utilities - centralized dev flags and safe logging
 */

export const isDev = process.env.NODE_ENV === 'development'

/**
 * Safe console log that only runs in development
 * Use sparingly - prefer error boundaries for production error handling
 */
export function devLog(...args: unknown[]): void {
  if (isDev) {
    console.log(...args)
  }
}

/**
 * Safe console warn that only runs in development
 */
export function devWarn(...args: unknown[]): void {
  if (isDev) {
    console.warn(...args)
  }
}

/**
 * Safe console error that only runs in development
 * Note: Error boundaries should handle production errors
 */
export function devError(...args: unknown[]): void {
  if (isDev) {
    console.error(...args)
  }
}


