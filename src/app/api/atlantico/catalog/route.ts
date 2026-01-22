import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'

/**
 * GET /api/atlantico/catalog
 * 
 * Fetches the catalog/list of activities from Atlantico API.
 * 
 * Query parameters:
 * - lang: Language code (default: 'ENG', must be 3 letters)
 * - page: Page number (default: -1, must be integer)
 * - classificationCode: Optional classification code to filter groups (max 40 chars, alphanumeric + _-)
 * 
 * Returns (always HTTP 200):
 * {
 *   classifications: [...], // From /clasificationList/{lang} (empty array on error)
 *   groups: [...],           // From /groupsList/{lang}/{page}/{classificationCode?} (empty array on error)
 *   warnings?: string[]       // Present if any endpoint failed or params were invalid
 * }
 */

interface ValidatedParams {
  lang: string
  page: string
  classificationCode?: string
  warnings: string[]
}

/**
 * Validate and normalize query parameters
 */
function validateParams(searchParams: URLSearchParams): ValidatedParams {
  const warnings: string[] = []

  // Validate lang: 3 letters, default "ENG"
  let lang = searchParams.get('lang') || 'ENG'
  if (!/^[A-Za-z]{3}$/.test(lang)) {
    warnings.push(`Invalid lang parameter "${lang}", using default "ENG"`)
    lang = 'ENG'
  }
  lang = lang.toUpperCase()

  // Validate page: integer, default -1
  let page = searchParams.get('page') || '-1'
  const pageNum = parseInt(page, 10)
  if (isNaN(pageNum)) {
    warnings.push(`Invalid page parameter "${page}", using default "-1"`)
    page = '-1'
  } else {
    page = pageNum.toString()
  }

  // Validate classificationCode: optional, alphanumeric + _-, max 40 chars
  let classificationCode: string | undefined = searchParams.get('classificationCode') || undefined
  if (classificationCode) {
    const trimmed = classificationCode.trim()
    if (trimmed.length === 0) {
      classificationCode = undefined
    } else if (!/^[A-Za-z0-9_-]{1,40}$/.test(trimmed)) {
      warnings.push(`Invalid classificationCode parameter "${classificationCode}", ignoring`)
      classificationCode = undefined
    } else {
      classificationCode = trimmed
    }
  }

  return { lang, page, classificationCode, warnings }
}

/**
 * Fetch data from an endpoint with error handling and logging
 */
async function fetchWithFallback(
  endpoint: string,
  endpointName: string,
  revalidateSeconds: number
): Promise<{ data: unknown[]; warning: string | null }> {
  try {
    const response = await fetchAtlantico(endpoint, {
      revalidate: revalidateSeconds,
    })

    // Check if response is OK
    if (!response.ok) {
      // Try to read error body
      let errorBody = ''
      try {
        const text = await response.text()
        errorBody = text.substring(0, 300)
      } catch {
        errorBody = '[Could not read error body]'
      }

      const warning = `${endpointName} failed: HTTP ${response.status} ${response.statusText}`
      console.error(
        `[Atlantico Catalog] ${warning}`,
        `\n  Endpoint: ${endpoint}`,
        `\n  Status: ${response.status}`,
        `\n  Body snippet: ${errorBody}`
      )

      return { data: [], warning }
    }

    // Parse JSON response
    try {
      const data = await response.json()
      // Ensure it's an array (or convert if needed)
      const arrayData = Array.isArray(data) ? data : []
      return { data: arrayData, warning: null }
    } catch (jsonError) {
      const warning = `${endpointName} failed: Invalid JSON response`
      console.error(
        `[Atlantico Catalog] ${warning}`,
        `\n  Endpoint: ${endpoint}`,
        `\n  Error: ${jsonError instanceof Error ? jsonError.message : 'Unknown JSON parse error'}`
      )
      return { data: [], warning }
    }
  } catch (error) {
    // Network errors, timeouts, etc.
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const warning = `${endpointName} failed: ${errorMessage}`

    // Try to extract status if available
    let statusInfo = ''
    if (error instanceof Error && 'status' in error) {
      statusInfo = `\n  Status: ${(error as any).status}`
    }

    console.error(
      `[Atlantico Catalog] ${warning}`,
      `\n  Endpoint: ${endpoint}${statusInfo}`,
      `\n  Error: ${errorMessage}`
    )

    return { data: [], warning }
  }
}

export async function GET(request: NextRequest) {
  // Always return 200 with structured response
  const classifications: unknown[] = []
  const groups: unknown[] = []
  const warnings: string[] = []

  // Check configuration
  const config = getAtlanticoConfig()
  if (!config.isValid) {
    warnings.push(`Configuration error: ${config.error || 'Atlantico API configuration is invalid'}`)
    return NextResponse.json({
      classifications,
      groups,
      warnings,
    })
  }

  // Validate query parameters
  const validatedParams = validateParams(request.nextUrl.searchParams)
  warnings.push(...validatedParams.warnings)

  const { lang, page, classificationCode } = validatedParams

  // Fetch classifications list
  const classificationsEndpoint = `/clasificationList/${lang}`
  const classificationsResult = await fetchWithFallback(
    classificationsEndpoint,
    'clasificationList',
    config.revalidateSeconds
  )
  if (classificationsResult.warning) {
    warnings.push(classificationsResult.warning)
  }
  // Always assign data (empty array on error, actual data on success)
  classifications.push(...classificationsResult.data)

  // Fetch groups list
  const groupsEndpoint = classificationCode
    ? `/groupsList/${lang}/${page}/${classificationCode}`
    : `/groupsList/${lang}/${page}`

  const groupsResult = await fetchWithFallback(
    groupsEndpoint,
    'groupsList',
    config.revalidateSeconds
  )
  if (groupsResult.warning) {
    warnings.push(groupsResult.warning)
  }
  // Always assign data (empty array on error, actual data on success)
  groups.push(...groupsResult.data)

  // Build response (always 200)
  const response: {
    classifications: unknown[]
    groups: unknown[]
    warnings?: string[]
  } = {
    classifications,
    groups,
  }

  // Only include warnings if present
  if (warnings.length > 0) {
    response.warnings = warnings
  }

  return NextResponse.json(response)
}

/**
 * How to test:
 * 
 * 1. Catalog simple (default params):
 *    curl "http://localhost:3000/api/atlantico/catalog"
 * 
 * 2. Catalog avec page invalide (devrait utiliser -1 et ajouter warning):
 *    curl "http://localhost:3000/api/atlantico/catalog?lang=ENG&page=abc"
 * 
 * 3. Catalog avec classificationCode invalide (devrait ignorer et ajouter warning):
 *    curl "http://localhost:3000/api/atlantico/catalog?lang=ESP&page=1&classificationCode=invalid@code#123"
 * 
 * Expected responses (all HTTP 200):
 * - Success: { classifications: [...], groups: [...] }
 * - Partial failure: { classifications: [...], groups: [], warnings: ["groupsList failed: ..."] }
 * - Full failure: { classifications: [], groups: [], warnings: ["clasificationList failed: ...", "groupsList failed: ..."] }
 * - Invalid params: { classifications: [...], groups: [...], warnings: ["Invalid lang parameter ..."] }
 */

