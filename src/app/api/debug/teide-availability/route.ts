/**
 * DEBUG: Test availability for Teide de Noche VIP
 * Tests all possible event codes to find which one returns dates
 */

import { NextResponse } from 'next/server'
import { fetchAtlantico } from '@/lib/atlantico/fetch'
import { getAtlanticoConfig } from '@/lib/atlantico/config'

// All possible codes to test
const CANDIDATE_CODES = [
  'TFS_515',
  '515',
  '1832',
  'TFS515',
  'TFS-515',
  '515_TFS',
  // Add more if needed
]

export async function GET() {
  const results: any[] = []
  const config = getAtlanticoConfig()
  
  if (!config.isValid) {
    return NextResponse.json({ error: 'Config invalid' }, { status: 500 })
  }

  // Get current month
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const targetDate = `${currentMonth}-01`

  // Test each candidate code
  for (const code of CANDIDATE_CODES) {
    try {
      // Test in ES (like Atlántico)
      const response = await fetchAtlantico(
        `/loadLimits/${code}/ES/${targetDate}`,
        { revalidate: 0 }
      )

      if (response.ok) {
        const data = await response.json()
        const dates = extractDates(data)
        
        results.push({
          code,
          lang: 'ES',
          month: currentMonth,
          status: 'ok',
          hasData: !!data,
          nbDates: dates.length,
          dates: dates.slice(0, 10),
          rawSample: JSON.stringify(data).substring(0, 200),
        })
      } else {
        results.push({
          code,
          lang: 'ES',
          month: currentMonth,
          status: 'error',
          httpStatus: response.status,
          error: response.statusText,
        })
      }
    } catch (err) {
      results.push({
        code,
        lang: 'ES',
        month: currentMonth,
        status: 'exception',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  // Find the best result (one with dates)
  const bestResult = results.find(r => r.nbDates > 0) || results[0]

  return NextResponse.json({
    tested: CANDIDATE_CODES,
    currentMonth,
    results,
    bestMatch: bestResult,
  })
}

function extractDates(data: any): string[] {
  const dates: string[] = []
  const seen = new Set<string>()

  // Try various formats
  if (Array.isArray(data.dates)) {
    for (const item of data.dates) {
      if (typeof item === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item)) {
        if (!seen.has(item)) {
          dates.push(item)
          seen.add(item)
        }
      }
    }
  }

  if (data.sessionsByDate && typeof data.sessionsByDate === 'object') {
    for (const dateStr of Object.keys(data.sessionsByDate)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !seen.has(dateStr)) {
        dates.push(dateStr)
        seen.add(dateStr)
      }
    }
  }

  return dates.sort()
}













