/**
 * Atlantico API Client
 * 
 * Robust client for Atlantico Excursiones API with:
 * - Environment-based base URL selection (test/prod)
 * - Text/JSON response handling
 * - Timeout and error handling
 * - Server-only logging
 */

/**
 * Get base URL based on ATLANTICO_ENV environment variable
 * - test: https://testapi.atlanticoexcursiones.com
 * - prod: https://api.atlanticoexcursiones.com
 * - default: prod
 */
export function getBaseUrl(): string {
  const env = process.env.ATLANTICO_ENV?.toLowerCase().trim()
  
  if (env === 'test') {
    return 'https://testapi.atlanticoexcursiones.com'
  }
  
  // Default to production
  return 'https://api.atlanticoexcursiones.com'
}

/**
 * Fetch text from Atlantico API with timeout and error handling
 * 
 * @param path - API path (e.g., '/eventDetails/123/ENG')
 * @param options - Optional fetch options
 * @returns Promise with response text
 */
export async function fetchText(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: string
    headers?: HeadersInit
    timeoutMs?: number
  } = {}
): Promise<string> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  const timeoutMs = options.timeoutMs ?? 10000 // 10s default
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const headers: HeadersInit = {
      'Accept': '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers,
    }
    
    // Add token if available
    const token = process.env.ATLANTICO_TOKEN
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      signal: controller.signal,
      cache: 'no-store', // Always fetch fresh data
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Atlantico API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText.substring(0, 200)}` : ''}`)
    }
    
    return await response.text()
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`)
      }
      throw error
    }
    
    throw new Error('Unknown error occurred')
  }
}

/**
 * Fetch JSON from Atlantico API
 * Attempts to parse response as JSON, falls back to text if needed
 */
export async function fetchJson<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: string
    headers?: HeadersInit
    timeoutMs?: number
  } = {}
): Promise<T> {
  const text = await fetchText(path, options)
  
  // Try to parse as JSON
  const trimmed = text.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed) as T
    } catch {
      // Fall through to return text as-is
    }
  }
  
  // If not JSON, try double-encoded JSON string
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const once = JSON.parse(trimmed)
      if (typeof once === 'string') {
        const tt = once.trim()
        if ((tt.startsWith('{') && tt.endsWith('}')) || (tt.startsWith('[') && tt.endsWith(']'))) {
          return JSON.parse(tt) as T
        }
      }
      return once as T
    } catch {
      // Fall through
    }
  }
  
  // Return as text wrapped in object if needed, or throw
  throw new Error('Response is not valid JSON')
}

/**
 * GET request helper (alias for fetchJson for compatibility)
 * Supports query parameters
 */
export async function atlanticoGet<T = any>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  let fullPath = path
  
  // Add query parameters if provided
  if (params) {
    const queryParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    }
    const queryString = queryParams.toString()
    if (queryString) {
      fullPath += `?${queryString}`
    }
  }
  
  return fetchJson<T>(fullPath)
}
