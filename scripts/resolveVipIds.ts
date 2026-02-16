/**
 * Dev-only script to resolve missing Atlantico IDs for VIP tours
 * 
 * Usage: npx tsx scripts/resolveVipIds.ts
 * 
 * This script:
 * 1. Fetches /api/catalog/full?lang=ENG
 * 2. Searches for each VIP mapping entry using:
 *    - Exact slug match (if atlanticoSlug provided)
 *    - Fuzzy title match using searchKeywords
 * 3. Prints a console table with results
 * 
 * IMPORTANT: Dev-only, does NOT run in production
 */

import { VIP_TOURS_MAPPING } from '../src/content/vibes/vip-tours.mapping'

interface CatalogItem {
  id: string
  slug?: string
  title?: string
  displayTitle?: string
}

interface CatalogResponse {
  items?: CatalogItem[]
}

interface ResolvedMapping {
  internalSlug: string
  foundId: string | null
  foundSlug: string | null
  title: string | null
  matchMethod: 'exact_slug' | 'fuzzy_title' | 'not_found'
}

/**
 * Check if all keywords appear in the title (case-insensitive)
 */
function matchesKeywords(title: string, keywords: string[]): boolean {
  const lowerTitle = title.toLowerCase()
  return keywords.every(keyword => lowerTitle.includes(keyword.toLowerCase()))
}

/**
 * Main resolution function
 */
async function resolveVipIds(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('This script should only run in development mode')
    process.exit(1)
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || 'http://localhost:3000'
  const catalogUrl = `${baseUrl}/api/catalog/full?lang=ENG&mode=sellable&merged=1&thin=smart&includeRaw=0`

  console.log('🔍 Fetching catalog from:', catalogUrl)
  console.log('')

  try {
    const response = await fetch(catalogUrl)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const catalog: CatalogResponse = await response.json()
    const items = catalog.items || []

    console.log(`✅ Found ${items.length} items in catalog`)
    console.log('')

    const resolved: ResolvedMapping[] = []

    // For each VIP mapping, try to find matching tour
    for (const mapping of VIP_TOURS_MAPPING) {
      let found: CatalogItem | null = null
      let matchMethod: 'exact_slug' | 'fuzzy_title' | 'not_found' = 'not_found'

      // Method 1: Exact slug match (if atlanticoSlug provided)
      if (mapping.atlanticoSlug) {
        found = items.find(item => 
          item.slug?.toLowerCase() === mapping.atlanticoSlug?.toLowerCase()
        ) || null
        
        if (found) {
          matchMethod = 'exact_slug'
        }
      }

      // Method 2: Fuzzy title match using searchKeywords
      if (!found) {
        for (const item of items) {
          const title = item.displayTitle || item.title || ''
          if (title && matchesKeywords(title, mapping.searchKeywords)) {
            // Additional check: title should contain "vip" (case-insensitive)
            if (title.toLowerCase().includes('vip')) {
              found = item
              matchMethod = 'fuzzy_title'
              break
            }
          }
        }
      }

      resolved.push({
        internalSlug: mapping.internalSlug,
        foundId: found?.id || null,
        foundSlug: found?.slug || null,
        title: found ? (found.displayTitle || found.title || null) : null,
        matchMethod,
      })
    }

    // Print results table
    console.log('📊 Resolution Results:')
    console.log('')
    console.log('┌─────────────────────────────────────┬──────────┬──────────────────────────┬─────────────────────────────────────────────┬──────────────┐')
    console.log('│ Internal Slug                       │ Found ID │ Found Slug               │ Title                                       │ Match Method │')
    console.log('├─────────────────────────────────────┼──────────┼──────────────────────────┼─────────────────────────────────────────────┼──────────────┤')
    
    for (const result of resolved) {
      const slug = result.internalSlug.padEnd(37)
      const id = (result.foundId || 'NOT_FOUND').padEnd(8)
      const foundSlug = (result.foundSlug || 'NOT_FOUND').padEnd(24)
      const title = (result.title || 'NOT_FOUND').substring(0, 43).padEnd(43)
      const method = result.matchMethod.padEnd(12)
      
      console.log(`│ ${slug} │ ${id} │ ${foundSlug} │ ${title} │ ${method} │`)
    }
    
    console.log('└─────────────────────────────────────┴──────────┴──────────────────────────┴─────────────────────────────────────────────┴──────────────┘')
    console.log('')

    // Summary
    const foundCount = resolved.filter(r => r.foundId !== null).length
    const notFoundCount = resolved.length - foundCount
    
    console.log(`📈 Summary:`)
    console.log(`   ✅ Found: ${foundCount}/${resolved.length}`)
    console.log(`   ❌ Not found: ${notFoundCount}/${resolved.length}`)
    console.log('')

    // Show IDs to update in mapping file
    const toUpdate = resolved.filter(r => r.foundId && r.foundId !== 'NOT_FOUND')
    if (toUpdate.length > 0) {
      console.log('💡 IDs to update in vip-tours.mapping.ts:')
      console.log('')
      for (const result of toUpdate) {
        console.log(`   ${result.internalSlug}:`)
        console.log(`     atlanticoId: '${result.foundId}',`)
        if (result.foundSlug) {
          console.log(`     atlanticoSlug: '${result.foundSlug}',`)
        }
        console.log('')
      }
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  resolveVipIds()
    .then(() => {
      console.log('✅ Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

export { resolveVipIds }




















