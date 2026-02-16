/**
 * POST /api/atlantico/download-image
 * 
 * Downloads an image from Atlantico API and saves it locally.
 * Returns the local public URL.
 * 
 * Body: { filename: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { downloadAtlanticoImage, getLocalImageUrl, imageExistsLocally } from '@/lib/atlantico/download-image'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename } = body

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing filename',
          message: 'filename is required in request body',
        },
        { status: 400 }
      )
    }

    // Check if already exists
    const exists = await imageExistsLocally(filename)
    if (exists) {
      return NextResponse.json({
        success: true,
        filename,
        url: getLocalImageUrl(filename),
        cached: true,
      })
    }

    // Download image
    const localUrl = await downloadAtlanticoImage(filename)

    if (!localUrl) {
      return NextResponse.json(
        {
          error: 'Failed to download image',
          filename,
          message: 'Could not download image from Atlantico API',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      filename,
      url: localUrl,
      cached: false,
    })
  } catch (error) {
    console.error('[DOWNLOAD_IMAGE_API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/atlantico/download-image?filename=<filename>
 * 
 * Same as POST but with filename as query parameter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const filename = searchParams.get('filename')

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing filename',
          message: 'filename query parameter is required',
        },
        { status: 400 }
      )
    }

    // Check if already exists
    const exists = await imageExistsLocally(filename)
    if (exists) {
      return NextResponse.json({
        success: true,
        filename,
        url: getLocalImageUrl(filename),
        cached: true,
      })
    }

    // Download image
    const localUrl = await downloadAtlanticoImage(filename)

    if (!localUrl) {
      return NextResponse.json(
        {
          error: 'Failed to download image',
          filename,
          message: 'Could not download image from Atlantico API',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      filename,
      url: localUrl,
      cached: false,
    })
  } catch (error) {
    console.error('[DOWNLOAD_IMAGE_API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

