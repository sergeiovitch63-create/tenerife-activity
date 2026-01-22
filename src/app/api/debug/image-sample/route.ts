/**
 * GET /api/debug/image-sample
 * 
 * DEV-only endpoint that shows image extraction for 5 sample tours.
 * Helps debug image mapping issues.
 */

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { join } from 'path'
import { readJsonFile } from '@/lib/cache/jsonFile'
import { extractAtlanticoImage } from '@/lib/atlantico/quality'
import type { CoreCatalog, FullCatalog } from '@/lib/atlantico/catalog-types'

const CORE_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_catalog_core.json')
const FULL_CACHE_FILE = join(process.cwd(), 'data', 'atlantico_full_catalog.json') // Legacy

export async function GET(request: NextRequest) {
  // DEV only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    // Try core cache first, fallback to legacy
    let catalog = await readJsonFile<CoreCatalog>(CORE_CACHE_FILE)
    if (!catalog) {
      const legacyCatalog = await readJsonFile<FullCatalog>(FULL_CACHE_FILE)
      if (legacyCatalog) {
        catalog = legacyCatalog as any as CoreCatalog
      }
    }

    if (!catalog || !catalog.items || catalog.items.length === 0) {
      return NextResponse.json({
        error: 'No catalog data',
        message: 'Catalog cache not found or empty. Run refresh first.',
      })
    }

    // Get first 5 tours
    const sampleTours = catalog.items.slice(0, 5)

    const samples = sampleTours.map((tour) => {
      // Extract raw data candidates
      const raw = tour.raw || {}
      const groupDetails = raw.groupDetails || {}
      const groupList = raw.groupList || {}

      // Get all possible image candidates from raw
      const rawImageCandidates = {
        image: groupDetails.image || groupList.image || raw.image || null,
        img: groupDetails.img || groupList.img || raw.img || null,
        images0: Array.isArray(groupDetails.images) ? groupDetails.images[0] : null,
        gallery0: Array.isArray(groupDetails.gallery) ? groupDetails.gallery[0] : null,
        photo: groupDetails.photo || groupList.photo || raw.photo || null,
        picture: groupDetails.picture || raw.picture || null,
      }

      // Extract normalized image using extractAtlanticoImage (same logic as normalizeTour)
      let imageFromNormalize: string | null = null
      if (tour.raw) {
        if (tour.raw.groupDetails) {
          imageFromNormalize = extractAtlanticoImage(tour.raw.groupDetails)
        }
        if (!imageFromNormalize && tour.raw.groupList) {
          imageFromNormalize = extractAtlanticoImage(tour.raw.groupList)
        }
        if (!imageFromNormalize) {
          imageFromNormalize = extractAtlanticoImage(tour.raw)
        }
      }
      
      // Check if first event has image
      let eventImage: string | null = null
      if (tour.events && tour.events.length > 0 && tour.events[0].raw) {
        eventImage = extractAtlanticoImage(tour.events[0].raw)
      }

      return {
        id: tour.id,
        title: tour.title,
        tourImage: tour.image, // Final tour.image (should match imageFromNormalize after normalization)
        imageFromNormalize, // What extractAtlanticoImage() would find from raw
        eventImage, // First event image if available
        rawImageCandidates,
        hasImage: !!tour.image, // Final answer: does tour.image exist?
        imageMatches: tour.image === imageFromNormalize, // Check if normalization was applied correctly
      }
    })

    return NextResponse.json({
      total: catalog.items.length,
      sampled: samples.length,
      samples,
      note: 'tourImage is the final tour.image (used by UI). imageFromNormalize shows what extractAtlanticoImage() found. imageMatches indicates if normalization was applied correctly.',
    })
  } catch (error) {
    console.error('[IMAGE_SAMPLE] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate image sample',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

