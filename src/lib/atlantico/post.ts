/**
 * Atlantico API POST client
 * 
 * Handles POST requests to Atlantico API with form-urlencoded data
 */

import { getAtlanticoConfig, type AtlanticoConfig } from './config'

export interface AtlanticoPostOptions {
  timeoutMs?: number
  retries?: number
}

/**
 * Fetch with timeout, retry, and proper error handling for POST requests
 */
async function fetchWithRetryPost(
  url: string,
  config: AtlanticoConfig,
  body: string,
  options: AtlanticoPostOptions = {}
): Promise<Response> {
  const { timeoutMs = config.timeoutMs, retries = 2 } = options
  const token = config.token

  const headers: HeadersInit = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const fetchOptions: RequestInit = {
          method: 'POST',
          signal: controller.signal,
          headers,
          body,
        }

        const response = await fetch(url, fetchOptions)

        clearTimeout(timeoutId)

        return response
      } catch (fetchError) {
        clearTimeout(timeoutId)

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`)
        }

        throw fetchError
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on last attempt
      if (attempt < retries) {
        // Exponential backoff: wait 2^attempt * 100ms
        const delay = Math.pow(2, attempt) * 100
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * Make a POST request to Atlantico API with form-urlencoded data
 * 
 * @param endpoint - API endpoint path (e.g., '/payment/')
 * @param data - Form data as key-value pairs
 * @param options - Optional request options
 * @returns Promise with Response object
 */
export async function atlanticoPost(
  endpoint: string,
  data: Record<string, string | number>,
  options?: AtlanticoPostOptions
): Promise<Response> {
  const config = getAtlanticoConfig()

  if (!config.isValid) {
    throw new Error(config.error || 'Atlantico API configuration is invalid')
  }

  // Build form-urlencoded body
  const formData = new URLSearchParams()
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      formData.append(key, String(value))
    }
  }

  // Build full URL
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${config.baseUrl}${normalizedEndpoint}`

  if (process.env.NODE_ENV === 'development') {
    console.log('[ATLANTICO_POST] Request:', {
      endpoint: normalizedEndpoint,
      dataKeys: Object.keys(data),
      dataCount: Object.keys(data).length,
    })
  }

  return fetchWithRetryPost(url, config, formData.toString(), options)
}

