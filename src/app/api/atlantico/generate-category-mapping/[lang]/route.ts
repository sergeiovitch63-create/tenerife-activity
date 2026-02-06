/**
 * GET /api/atlantico/generate-category-mapping/[lang]
 * 
 * Analyzes all distinct category codes in the catalog and generates
 * a complete mapping to vibe IDs (1-14).
 * 
 * Returns:
 * - categories: All distinct categories with their details
 * - mapping: Generated TypeScript code ready to paste
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { suggestVibeFromText, VIBE_ID_TO_SLUG } from '@/lib/vibes/suggestVibe'

interface CategoryInfo {
  categoryCode: string
  categoryName: string
  count: number
  suggestedVibeId: string | null
  suggestedVibeSlug: string | null
  sampleTitles: string[]
}

interface GenerateMappingResponse {
  totalItems: number
  uniqueCategories: number
  categories: CategoryInfo[]
  mapping: string
}

/**
 * Fetch RAW catalog items
 */
async function fetchRawCatalogItems(lang: string): Promise<unknown[]> {
  try {
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const catalogUrl = `${baseUrl}/api/atlantico/catalog?lang=${lang}&page=-1`
    
    const response = await fetch(catalogUrl, {
      next: { revalidate: 60 },
    })
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    
    // Extract items array
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
    
    return items
  } catch (error) {
    console.error('[GenerateCategoryMapping] Error fetching catalog:', error)
    return []
  }
}

/**
 * Fetch classifications to get category names
 */
async function fetchClassifications(lang: string): Promise<Array<{ code?: string; name?: string; [key: string]: unknown }>> {
  try {
    const { getAtlanticoConfig } = await import('@/lib/atlantico/config')
    const { fetchAtlantico } = await import('@/lib/atlantico/fetch')
    
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
    return []
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params

    if (!lang || typeof lang !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          message: 'lang is required',
        },
        { status: 400 }
      )
    }

    // Fetch catalog items and classifications
    const [catalogItems, classifications] = await Promise.all([
      fetchRawCatalogItems(lang),
      fetchClassifications(lang),
    ])

    // Build category map: categoryCode -> { name, items, titles }
    const categoryMap = new Map<
      string,
      {
        name: string
        items: unknown[]
        titles: string[]
      }
    >()

    // Process all items and group by category
    for (const item of catalogItems) {
      if (!item || typeof item !== 'object') {
        continue
      }

      const itemObj = item as any
      
      // Extract category code (try multiple fields)
      const categoryCode =
        itemObj.category ||
        itemObj.categoryCode ||
        itemObj._raw?.category ||
        itemObj._raw?.categoryCode ||
        null

      if (!categoryCode) {
        continue
      }

      const normalizedCode = String(categoryCode).trim()
      
      // Extract title
      const title = (itemObj.name || itemObj.title || itemObj._raw?.name || itemObj._raw?.title || '') as string
      const cleanTitle = typeof title === 'string' ? title.trim() : ''

      const existing = categoryMap.get(normalizedCode)

      if (existing) {
        existing.items.push(item)
        if (cleanTitle && existing.titles.length < 10) {
          existing.titles.push(cleanTitle)
        }
      } else {
        // Find category name from classifications
        const classification = classifications.find(
          (c: any) => {
            const cCode = String(c.code || c.id || c.categoryCode || '').trim()
            return cCode === normalizedCode
          }
        )
        const name = (classification?.name || classification?.title || `Category ${normalizedCode}`) as string

        categoryMap.set(normalizedCode, {
          name: typeof name === 'string' ? name : `Category ${normalizedCode}`,
          items: [item],
          titles: cleanTitle ? [cleanTitle] : [],
        })
      }
    }

    // Build category info with vibe suggestions
    const categories: CategoryInfo[] = []

    for (const [code, { name, items, titles }] of categoryMap.entries()) {
      // Suggest vibe ID based on category name and sample titles
      const searchText = `${name} ${titles.slice(0, 5).join(' ')}`
      const suggestedVibeId = suggestVibeFromText(searchText, code)
      const suggestedVibeSlug = suggestedVibeId
        ? VIBE_ID_TO_SLUG[suggestedVibeId] || null
        : null

      categories.push({
        categoryCode: code,
        categoryName: name,
        count: items.length,
        suggestedVibeId,
        suggestedVibeSlug,
        sampleTitles: titles.slice(0, 5),
      })
    }

    // Sort by count (descending)
    categories.sort((a, b) => b.count - a.count)

    // Generate TypeScript mapping code
    const mappingEntries = categories
      .filter((c) => c.suggestedVibeId) // Only include categories with suggested vibes
      .map((c) => `  "${c.categoryCode}": "${c.suggestedVibeId}"`)
      .join(',\n')

    const mapping = `export const ATLANTICO_CATEGORY_TO_VIBE: Record<string, string> = {\n${mappingEntries}\n}`

    const response: GenerateMappingResponse = {
      totalItems: catalogItems.length,
      uniqueCategories: categoryMap.size,
      categories,
      mapping,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[GenerateCategoryMapping] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate category mapping',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

















