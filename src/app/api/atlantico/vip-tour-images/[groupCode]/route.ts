/**
 * API Route to get local images for a VIP Tour group
 */

import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const IMAGES_BASE_DIR = path.join(process.cwd(), 'public', 'images', 'events')

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupCode: string }> }
) {
  try {
    const { groupCode } = await params
    
    if (!groupCode) {
      return NextResponse.json({ images: [] }, { status: 400 })
    }

    const groupDir = path.join(IMAGES_BASE_DIR, groupCode)
    
    try {
      const files = await fs.readdir(groupDir)
      const imageFiles = files
        .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
        .sort()
      
      const images = imageFiles.map(file => `/images/events/${groupCode}/${file}`)
      
      return NextResponse.json({ images })
    } catch {
      // Directory doesn't exist or can't be read
      return NextResponse.json({ images: [] })
    }
  } catch (error) {
    console.error('[VIP_TOUR_IMAGES] Error:', error)
    return NextResponse.json(
      { images: [], error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



