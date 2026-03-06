/**
 * GET /api/atlantico/local-group-images/[code]
 * Returns image paths from public/images/pictures/tours-vip/{code}/
 * No scan needed - reads folder at runtime.
 */

import { NextResponse } from 'next/server'
import { getLocalGroupImages } from '@/lib/atlantico/get-local-group-images.server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const images = getLocalGroupImages(code ?? '')
  return NextResponse.json({ images }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
