/**
 * Atlantico API configuration
 * 
 * This module handles environment variables for the Atlantico Excursiones API.
 * All variables are server-side only and should never be exposed to the browser.
 * 
 * Configuration is read at runtime via functions to avoid throwing errors at import time.
 */

export interface AtlanticoConfig {
  baseUrl: string
  timeoutMs: number
  revalidateSeconds: number
  token?: string
  isValid: boolean
  error?: string
}

/**
 * Get complete Atlantico API configuration.
 * Returns a config object with validation status.
 * 
 * In development, returns invalid config with error message instead of throwing.
 * In production, throws only when route is actually called.
 */
export function getAtlanticoConfig(): AtlanticoConfig {
  const timeoutMs = getAtlanticoTimeoutMs()
  const revalidateSeconds = getAtlanticoRevalidateSeconds()
  const token = process.env.ATLANTICO_TOKEN

  // Get base URL from env or use default
  let baseUrl = process.env.ATLANTICO_BASE_URL?.trim()
  
  // CRITICAL: Reject IP:port addresses - they cause ECONNREFUSED errors
  // Use official domains instead
  if (baseUrl) {
    const ipPortPattern = /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/
    if (ipPortPattern.test(baseUrl)) {
      console.warn('[ATLANTICO_CONFIG] Rejected IP address in ATLANTICO_BASE_URL:', baseUrl)
      console.warn('[ATLANTICO_CONFIG] Using official domain instead')
      baseUrl = undefined // Force fallback to official domain
    }
  }
  
  // If no valid baseUrl, use ATLANTICO_ENV or default to production
  if (!baseUrl) {
    const env = process.env.ATLANTICO_ENV?.toLowerCase().trim()
    if (env === 'test') {
      baseUrl = 'https://testapi.atlanticoexcursiones.com'
    } else {
      baseUrl = 'https://api.atlanticoexcursiones.com'
    }
  }

  // Validate base URL
  if (!baseUrl || baseUrl.trim() === '') {
    const error = 'ATLANTICO_BASE_URL environment variable is required. ' +
      'Please set it in your .env.local or deployment environment variables. ' +
      'See docs/env.md for setup instructions.'

    // In development, return invalid config instead of throwing
    if (process.env.NODE_ENV === 'development') {
      return {
        baseUrl: '',
        timeoutMs,
        revalidateSeconds,
        token,
        isValid: false,
        error,
      }
    }

    // In production, throw when actually called
    throw new Error(`Atlantico API configuration error: ${error}`)
  }

  return {
    baseUrl: baseUrl.trim(),
    timeoutMs,
    revalidateSeconds,
    token,
    isValid: true,
  }
}

/**
 * Get the base URL for Atlantico API requests.
 * 
 * @throws Error if ATLANTICO_BASE_URL is not configured
 */
export function getAtlanticoBaseUrl(): string {
  const config = getAtlanticoConfig()
  if (!config.isValid) {
    throw new Error(config.error || 'Atlantico API configuration is invalid')
  }
  return config.baseUrl
}

/**
 * Get the API token/authentication key for Atlantico API (if required).
 * This may be optional depending on Atlantico's authentication method.
 */
export function getAtlanticoToken(): string | undefined {
  return process.env.ATLANTICO_TOKEN
}

/**
 * Get the request timeout in milliseconds.
 * Default: 10 seconds (10000ms)
 */
export function getAtlanticoTimeoutMs(): number {
  const timeout = process.env.ATLANTICO_TIMEOUT_MS
  if (timeout) {
    const parsed = parseInt(timeout, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return 10000 // 10 seconds default
}

/**
 * Get the cache revalidation time in seconds.
 * Default: 300 seconds (5 minutes)
 */
export function getAtlanticoRevalidateSeconds(): number {
  const revalidate = process.env.ATLANTICO_REVALIDATE_SECONDS
  if (revalidate) {
    const parsed = parseInt(revalidate, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return 300 // 5 minutes default
}

/**
 * Validate that required configuration is present.
 * Call this server-side before making API requests.
 * 
 * @throws Error if configuration is invalid
 */
export function validateAtlanticoConfig(): void {
  const config = getAtlanticoConfig()
  if (!config.isValid) {
    throw new Error(config.error || 'Atlantico API configuration is invalid')
  }
}
