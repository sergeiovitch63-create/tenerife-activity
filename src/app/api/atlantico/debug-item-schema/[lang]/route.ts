/**
 * GET /api/atlantico/debug-item-schema/[lang]
 * 
 * Exploration endpoint to identify the structure of catalog items and locate classification fields.
 * 
 * Returns:
 * - detectedItemsPath: Path to the items array (e.g., "events", "tours", "items")
 * - detectedClassificationListPath: Path to classifications array if found
 * - sampleClassifications: Sample of classifications (code, name)
 * - items: First 30 items with their classification-related fields
 * - allKeys: All top-level keys found in items
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

interface ItemSchema {
  index: number
  code: string | null
  id: string | null
  title: string | null
  name: string | null
  possibleClassificationFields: Record<string, unknown>
  allKeys: string[]
}

interface DebugItemSchemaResponse {
  detectedItemsPath: string | null
  detectedClassificationListPath: string | null
  sampleClassifications: Array<{ code: string | null; name: string | null }>
  items: ItemSchema[]
  summary: {
    totalItemsFound: number
    itemsAnalyzed: number
    classificationFieldsFound: string[]
  }
}

/**
 * Check if a key matches classification-related patterns
 */
function isClassificationKey(key: string): boolean {
  const pattern = /class|clas|category|cat|type|group|family|theme|segment/i
  return pattern.test(key)
}

/**
 * Extract classification-related fields from an object
 */
function extractClassificationFields(obj: any): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  
  if (!obj || typeof obj !== 'object') {
    return fields
  }
  
  for (const [key, value] of Object.entries(obj)) {
    if (isClassificationKey(key)) {
      fields[key] = value
    }
  }
  
  return fields
}

/**
 * Get all top-level keys from an object (limited to 80 chars each)
 */
function getAllKeys(obj: any): string[] {
  if (!obj || typeof obj !== 'object') {
    return []
  }
  
  return Object.keys(obj).map((key) => {
    const truncated = key.length > 80 ? key.substring(0, 80) + '...' : key
    return truncated
  })
}

/**
 * Find the items array in the catalog response
 */
function findItemsArray(data: any): { path: string; items: unknown[] } | null {
  // Common paths to check
  const paths = ['items', 'events', 'tours', 'activities', 'groups', 'data']
  
  for (const path of paths) {
    if (data[path] && Array.isArray(data[path])) {
      const items = data[path] as unknown[]
      // Prefer arrays with ~262 items (expected catalog size)
      if (items.length > 50 && items.length < 500) {
        return { path, items }
      }
    }
  }
  
  // If data itself is an array
  if (Array.isArray(data) && data.length > 50 && data.length < 500) {
    return { path: 'root', items: data }
  }
  
  // Fallback: return first array found
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      const items = value as unknown[]
      if (items.length > 0) {
        return { path: key, items }
      }
    }
  }
  
  return null
}

/**
 * Find classifications array in the catalog response
 */
function findClassificationsArray(data: any): { path: string; items: unknown[] } | null {
  const paths = ['classifications', 'classificationList', 'categories', 'types']
  
  for (const path of paths) {
    if (data[path] && Array.isArray(data[path])) {
      return { path, items: data[path] as unknown[] }
    }
  }
  
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
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

    // Fetch raw catalog
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const catalogUrl = `${baseUrl}/api/atlantico/catalog?lang=${lang}&page=-1`
    
    const response = await fetch(catalogUrl, {
      next: { revalidate: 60 },
    })
    
    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch catalog',
          message: `HTTP ${response.status}`,
        },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    // Find items array
    const itemsResult = findItemsArray(data)
    if (!itemsResult) {
      return NextResponse.json(
        {
          error: 'Could not find items array in catalog response',
          availableKeys: Object.keys(data),
        },
        { status: 400 }
      )
    }
    
    const { path: itemsPath, items } = itemsResult
    
    // Find classifications array
    const classificationsResult = findClassificationsArray(data)
    const classificationsPath = classificationsResult?.path || null
    const classifications = classificationsResult?.items || []
    
    // Extract sample classifications
    const sampleClassifications = classifications.slice(0, 10).map((item: any) => ({
      code: item.code || item.id || item.classificationCode || null,
      name: item.name || item.title || item.classificationName || null,
    }))
    
    // Analyze first 30 items
    const analyzedItems: ItemSchema[] = []
    const classificationFieldsSet = new Set<string>()
    
    for (let i = 0; i < Math.min(30, items.length); i++) {
      const item = items[i]
      
      if (!item || typeof item !== 'object') {
        continue
      }
      
      // Extract classification fields
      const classificationFields = extractClassificationFields(item)
      
      // Track all classification fields found
      for (const key of Object.keys(classificationFields)) {
        classificationFieldsSet.add(key)
      }
      
      // Extract basic fields
      const code = (item as any).code || (item as any).id || (item as any).eventCode || null
      const id = (item as any).id || (item as any).code || null
      const title = (item as any).title || (item as any).name || null
      const name = (item as any).name || (item as any).title || null
      
      analyzedItems.push({
        index: i,
        code: typeof code === 'string' ? code : null,
        id: typeof id === 'string' ? id : null,
        title: typeof title === 'string' ? title : null,
        name: typeof name === 'string' ? name : null,
        possibleClassificationFields: classificationFields,
        allKeys: getAllKeys(item),
      })
    }
    
    const responseData: DebugItemSchemaResponse = {
      detectedItemsPath: itemsPath,
      detectedClassificationListPath: classificationsPath,
      sampleClassifications,
      items: analyzedItems,
      summary: {
        totalItemsFound: items.length,
        itemsAnalyzed: analyzedItems.length,
        classificationFieldsFound: Array.from(classificationFieldsSet).sort(),
      },
    }
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('[DebugItemSchema] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze item schema',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

























