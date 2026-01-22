/**
 * GET /api/atlantico/debug-classifications/[lang]
 * 
 * DEV endpoint to analyze Atlantico classifications and suggest vibe mappings.
 * 
 * Returns:
 * - totalItems: Total number of items in catalog
 * - uniqueClassifications: Number of unique classifications
 * - byClassification: Array of classification analysis
 * - byVibeSuggested: Count of items per suggested vibe
 * - mappingSnippet: Ready-to-paste code for ATLANTICO_CLASS_TO_VIBE
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getAtlanticoConfig } from '@/lib/atlantico/config'
import { fetchAtlantico } from '@/lib/atlantico/fetch'
import { suggestVibeFromText, VIBE_ID_TO_SLUG } from '@/lib/vibes/suggestVibe'

interface ClassificationInfo {
  classificationCode: string
  classificationName: string
  count: number
  suggestedVibeId: string | null
  suggestedVibeSlug: string | null
  examples: Array<{ code: string; title: string; slug: string }>
}

interface DebugClassificationsResponse {
  totalItems: number
  uniqueClassifications: number
  byClassification: ClassificationInfo[]
  byVibeSuggested: Record<string, number>
  mappingSnippet: string
}

/**
 * Fetch classifications list from Atlantico
 */
async function fetchClassifications(lang: string): Promise<Array<{ code?: string; name?: string; [key: string]: unknown }>> {
  try {
    const config = getAtlanticoConfig()
    if (!config.isValid) {
      return []
    }

    const response = await fetchAtlantico(
      `/clasificationList/${lang}`,
      { revalidate: config.revalidateSeconds }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('[DebugClassifications] Error fetching classifications:', error)
    return []
  }
}

/**
 * Fetch RAW catalog items (using the same endpoint as smoke tests)
 * This gives us access to the original structure before normalization
 */
async function fetchRawCatalogItems(lang: string): Promise<{
  items: unknown[]
  classifications: unknown[]
}> {
  try {
    // Use RAW catalog endpoint (same as /api/atlantico/catalog?lang=ENG&page=-1)
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const catalogUrl = `${baseUrl}/api/atlantico/catalog?lang=${lang}&page=-1`
    
    const response = await fetch(catalogUrl, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    })
    
    if (!response.ok) {
      return { items: [], classifications: [] }
    }
    
    const data = await response.json()
    
    // Extract items array (could be in groups, items, events, etc.)
    let items: unknown[] = []
    if (Array.isArray(data.groups)) {
      items = data.groups
    } else if (Array.isArray(data.items)) {
      items = data.items
    } else if (Array.isArray(data.events)) {
      items = data.events
    } else if (Array.isArray(data)) {
      items = data
    }
    
    // Extract classifications array
    const classifications = Array.isArray(data.classifications) ? data.classifications : []
    
    return { items, classifications }
  } catch (error) {
    console.error('[DebugClassifications] Error fetching raw catalog:', error)
    return { items: [], classifications: [] }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  // Simple access check (can be removed if needed)
  // In production, you might want to add authentication here

  try {
    const { lang } = await params

    // Validate lang
    if (!lang || typeof lang !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'lang is required',
        },
        { status: 400 }
      )
    }

    // Fetch classifications and RAW catalog items in parallel
    const [classifications, rawCatalog] = await Promise.all([
      fetchClassifications(lang),
      fetchRawCatalogItems(lang),
    ])
    
    const catalogItems = rawCatalog.items
    const rawClassifications = rawCatalog.classifications
    
    // Use raw classifications if available (they might have more info)
    const allClassifications = rawClassifications.length > 0 ? rawClassifications : classifications

    // Build classification map: code -> { name, items }
    const classificationMap = new Map<
      string,
      { name: string; items: Array<Record<string, any>> }
    >()

    // Process catalog items and group by classification
    // Try multiple possible field names for classification
    const classificationFieldPatterns = [
      'classification',
      'classificationCode',
      'classCode',
      'class',
      'category',
      'categoryCode',
      'type',
      'typeCode',
      'group',
      'groupId',
      'family',
      'theme',
      'segment',
    ]
    
    for (const item of catalogItems) {
      if (!item || typeof item !== 'object') {
        continue
      }
      
      // Try to find classification code in the item
      let classificationCode: string | null = null
      
      for (const field of classificationFieldPatterns) {
        const value = (item as any)[field]
        if (value && typeof value === 'string' && value.trim().length > 0) {
          classificationCode = value.trim()
          break
        }
        // Also try nested in _raw if it exists
        if ((item as any)._raw) {
          const rawValue = (item as any)._raw[field]
          if (rawValue && typeof rawValue === 'string' && rawValue.trim().length > 0) {
            classificationCode = rawValue.trim()
            break
          }
        }
      }
      
      if (!classificationCode) {
        continue
      }

      const normalizedCode = classificationCode.toUpperCase()
      const existing = classificationMap.get(normalizedCode)

      if (existing) {
        existing.items.push(item as Record<string, any>)
      } else {
        // Find classification name from classifications list
        const classification = allClassifications.find(
          (c: any) => {
            const cCode = (c.code || c.id || c.classificationCode || '').toString().trim().toUpperCase()
            return cCode === normalizedCode
          }
        ) as Record<string, any> | undefined
        const name = (classification?.name || classification?.title || 'Unknown') as string

        classificationMap.set(normalizedCode, {
          name: typeof name === 'string' ? name : 'Unknown',
          items: [item as Record<string, any>],
        })
      }
    }

    // Build response
    const byClassification: ClassificationInfo[] = []
    const byVibeSuggested: Record<string, number> = {}

    for (const [code, { name, items }] of classificationMap.entries()) {
      // Suggest vibe ID based on classification name and example items
      const exampleTexts = items.slice(0, 3).map((item) => {
        const itemObj = item as any
        const raw = itemObj._raw || itemObj
        return (raw.name || raw.title || itemObj.name || itemObj.title || '') as string
      })
      const searchText = `${name} ${exampleTexts.join(' ')}`
      
      const suggestedVibeId = suggestVibeFromText(searchText, code)
      const suggestedVibeSlug = suggestedVibeId
        ? VIBE_ID_TO_SLUG[suggestedVibeId] || null
        : null

      // Count by suggested vibe
      if (suggestedVibeId) {
        byVibeSuggested[suggestedVibeId] =
          (byVibeSuggested[suggestedVibeId] || 0) + items.length
      }

      // Get 3 examples
      const examples = items.slice(0, 3).map((item) => {
        const itemObj = item as any
        const raw = itemObj._raw || itemObj
        const code = raw.code || raw.id || raw.eventCode || itemObj.code || itemObj.id || 'unknown'
        const title = (raw.name || raw.title || itemObj.name || itemObj.title || 'Untitled') as string
        return {
          code: typeof code === 'string' ? code : String(code),
          title: typeof title === 'string' ? title : 'Untitled',
          slug: typeof code === 'string' ? code : String(code),
        }
      })

      byClassification.push({
        classificationCode: code,
        classificationName: name,
        count: items.length,
        suggestedVibeId,
        suggestedVibeSlug,
        examples,
      })
    }

    // Sort by count (descending)
    byClassification.sort((a, b) => b.count - a.count)

    // Generate mapping snippet
    const mappingEntries = byClassification
      .filter((c) => c.suggestedVibeId)
      .map((c) => `  "${c.classificationCode}": "${c.suggestedVibeId}"`)
      .join(',\n')

    const mappingSnippet = mappingEntries
      ? `export const ATLANTICO_CLASS_TO_VIBE: Record<string, string> = {\n${mappingEntries}\n}`
      : '// No mappings generated (no suggested vibes found)'

    const response: DebugClassificationsResponse = {
      totalItems: catalogItems.length,
      uniqueClassifications: classificationMap.size,
      byClassification,
      byVibeSuggested,
      mappingSnippet,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[DebugClassifications] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze classifications',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

