/**
 * Atlántico API Client Wrapper
 * 
 * Server-side wrapper functions for Atlántico API endpoints
 * Used by cart revalidation and checkout
 */

import { atlanticoGet } from './client'
import { parseLoadPricesResponse } from './prices'
import { mapLocaleToAtlanticoLangUpper, mapLocaleToAtlanticoLang } from './lang'

/**
 * Get tour group details
 */
export async function groupDetails(code: string, language: string): Promise<any> {
  const normalizedLang = mapLocaleToAtlanticoLangUpper(language)
  return atlanticoGet(`/groupDetails/${code}/${normalizedLang}`)
}

/**
 * Get event details
 */
export async function eventDetails(code: string, language: string): Promise<any> {
  const normalizedLang = mapLocaleToAtlanticoLangUpper(language)
  return atlanticoGet(`/eventDetails/${code}/${normalizedLang}`)
}

/**
 * Load prices for an event on a specific date
 * Returns parsed adult/child/infant prices
 */
export async function loadPrices(
  eventCode: string,
  date: string, // YYYY-MM-DD
  office?: string
): Promise<{
  adult: number | null
  child: number | null
  infant: number | null
  raw?: any
}> {
  // Build endpoint: /loadPrices/{eventCode}/{date}
  // Add office as query param if provided
  const params = office ? { office } : undefined
  const endpoint = `/loadPrices/${eventCode}/${date}`
  
  const raw = await atlanticoGet(endpoint, params)
  const parsed = parseLoadPricesResponse(raw)
  
  return {
    ...parsed,
    raw: process.env.NODE_ENV === 'development' ? raw : undefined,
  }
}

/**
 * Load limits/availability for an event
 * Returns sessions by date if available
 */
export async function loadLimits(
  eventCode: string,
  language: string,
  date?: string // YYYY-MM-DD or YYYY-MM-01 (month start)
): Promise<any> {
  const normalizedLang = mapLocaleToAtlanticoLang(language) // loadLimits uses lowercase
  
  // If date not provided, use first day of current month
  let targetDate = date
  if (!targetDate) {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    targetDate = `${year}-${month}-01`
  }
  
  // Ensure date is in YYYY-MM-01 format (first day of month)
  const dateMatch = targetDate.match(/^(\d{4}-\d{2})/)
  if (dateMatch) {
    targetDate = `${dateMatch[1]}-01`
  }
  
  return atlanticoGet(`/loadLimits/${eventCode}/${normalizedLang}/${targetDate}`)
}

