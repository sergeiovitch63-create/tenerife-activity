/**
 * Atlantico API fetch utilities
 * 
 * Provides helper functions for making API requests with timeout, retry, and error handling.
 */

import { getAtlanticoConfig, type AtlanticoConfig } from './config'

interface FetchOptions {
  timeoutMs?: number
  retries?: number
  revalidate?: number
  cache?: RequestCache
}

/**
 * Check if error is retryable (ECONNRESET, ETIMEDOUT, 502/503/504)
 */
function isRetryableError(error: unknown, response?: Response): boolean {
  // Check HTTP status codes
  if (response) {
    const status = response.status
    if (status === 502 || status === 503 || status === 504) {
      return true
    }
  }

  // Check error messages/codes
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const code = (error as any).code?.toLowerCase()
    
    // ECONNRESET
    if (message.includes('econnreset') || code === 'econnreset' || message.includes('connection reset')) {
      return true
    }
    
    // ETIMEDOUT
    if (message.includes('etimedout') || code === 'etimedout' || message.includes('timeout')) {
      return true
    }
    
    // Fetch failed (network errors)
    if (message.includes('fetch failed') || message.includes('networkerror')) {
      return true
    }
  }

  return false
}

/**
 * Fetch with timeout, retry, and proper error handling
 * - Timeout: 10s (AbortController)
 * - Retry: 3 times with backoff (300ms, 800ms, 1500ms) ONLY on retryable errors
 */
async function fetchWithRetry(
  url: string,
  config: AtlanticoConfig,
  options: FetchOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 10000 // Default 10s
  const maxRetries = 3
  const backoffDelays = [300, 800, 1500] // ms
  const token = config.token

  const headers: HeadersInit = {
    // loadPrices endpoints return plain text; JSON endpoints still work with */*
    Accept: '*/*',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let lastError: Error | null = null
  let lastResponse: Response | undefined = undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const fetchOptions: RequestInit = {
          signal: controller.signal,
          headers,
        }

        // Next.js caching:
        // - Pricing calls must be dynamic: use cache: 'no-store'
        // - Otherwise allow next.revalidate based caching
        const effectiveCache: RequestCache | undefined =
          options.cache ?? (options.revalidate === 0 ? 'no-store' : undefined)

        if (effectiveCache) {
          fetchOptions.cache = effectiveCache
        }

        if (options.revalidate !== undefined && effectiveCache !== 'no-store') {
          ;(fetchOptions as any).next = { revalidate: options.revalidate }
        }

        const response = await fetch(url, fetchOptions)
        lastResponse = response

        clearTimeout(timeoutId)

        if (!response.ok) {
          // Check if status is retryable
          if (isRetryableError(new Error(`HTTP ${response.status}`), response)) {
            throw new Error(`Atlantico API error: ${response.status} ${response.statusText}`)
          }
          // Non-retryable error, throw immediately
          throw new Error(
            `Atlantico API error: ${response.status} ${response.statusText}`
          )
        }

        return response
      } catch (fetchError) {
        clearTimeout(timeoutId)

        const error = fetchError instanceof Error ? fetchError : new Error(String(fetchError))
        
        // Handle AbortError (timeout)
        if (error.name === 'AbortError') {
          const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`)
          if (attempt < maxRetries && isRetryableError(timeoutError)) {
            lastError = timeoutError
            // Will retry below
          } else {
            throw timeoutError
          }
        } else {
          // Check if error is retryable
          if (attempt < maxRetries && isRetryableError(error, lastResponse)) {
            lastError = error
            // Will retry below
          } else {
            throw error
          }
        }
      }
    } catch (error) {
      // This catch handles errors thrown from the inner try-catch
      const caughtError = error instanceof Error ? error : new Error(String(error))
      lastError = caughtError

      // Don't retry on last attempt or if error is not retryable
      if (attempt < maxRetries && isRetryableError(caughtError, lastResponse)) {
        // Use specific backoff delays
        const delay = backoffDelays[attempt] || 1500
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * Make a GET request to Atlantico API with automatic retry and timeout
 */
export async function fetchAtlantico(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const config = getAtlanticoConfig()

  if (!config.isValid) {
    throw new Error(
      config.error || 'Atlantico API configuration is invalid'
    )
  }

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${config.baseUrl}${normalizedEndpoint}`

  return fetchWithRetry(url, config, {
    ...options,
    revalidate: options.revalidate ?? config.revalidateSeconds,
  })
}

