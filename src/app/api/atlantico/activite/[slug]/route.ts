/**
 * GET /api/atlantico/activite/[slug]
 *
 * Consolidated API: classifications + groups + visibility in one call.
 * Used by /activite/[slug] for fast loading.
 *
 * Query: ?lang=ENG
 * Returns: { ok, tours, hiddenGroupIds, error? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClassificationIdForVibe, getClassificationNameForVibe } from '@/lib/vibes/vibe-classification-mapping'
import { vibeRepository } from '@/config/repositories'

type Tour = {
  id: string | number
  code: string
  name: string
  desc?: string
  image?: string
  price?: number
  duration?: string
  ids?: (string | number)[]
}

const REVALIDATE = 60
const EXCLUDED_CODES = ['222', '551', '492', '476', '514']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const lang = request.nextUrl.searchParams.get('lang') || 'ENG'
  const validatedLang = /^[A-Za-z]{3}$/.test(lang) ? lang.toUpperCase() : 'ENG'

  const vibe = await vibeRepository.findBySlug(slug)
  if (!vibe) {
    return NextResponse.json({ ok: false, tours: [], error: 'Vibe not found' }, { status: 404 })
  }

  // Prefer direct classificationId mapping (from debug classifications)
  let classificationId: string | number | null = getClassificationIdForVibe(slug) ?? null

  // Fallback: resolve by classification name
  if (!classificationId) {
    const classificationName = getClassificationNameForVibe(slug)
    if (!classificationName) {
      return NextResponse.json(
        { ok: true, tours: [], hiddenGroupIds: [] },
        { headers: { 'Cache-Control': `public, s-maxage=${REVALIDATE}, stale-while-revalidate=120` } }
      )
    }

    const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
    const headersList = await import('next/headers').then((m) => m.headers)
    const hdrs = headersList()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const origin = envBase || `${protocol}://${host}`

    try {
      const classRes = await fetch(
        `${origin}/api/atlantico/classifications?lang=${encodeURIComponent(validatedLang)}`,
        { next: { revalidate: REVALIDATE } as const }
      )
      if (classRes.ok) {
        const classData = await classRes.json()
        if (classData.ok && Array.isArray(classData.classifications)) {
          const normalizedSearch = classificationName.trim().toLowerCase()
          const found = classData.classifications.find(
            (c: { name?: string }) =>
              String(c.name || '').trim().toLowerCase() === normalizedSearch
          )
          if (found) classificationId = found.id
        }
      }
    } catch {
      classificationId = null
    }
  }

  const envBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || ''
  const headersList = await import('next/headers').then((m) => m.headers)
  const hdrs = headersList()
  const host = hdrs.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = envBase || `${protocol}://${host}`

  const fetchOpts = { next: { revalidate: REVALIDATE } as const }

  try {
    const [groupsRes, visRes] = await Promise.all([
      classificationId
        ? fetch(
            `${origin}/api/atlantico/groups?lang=${encodeURIComponent(validatedLang)}&page=-1&classificationId=${encodeURIComponent(String(classificationId))}`,
            fetchOpts
          )
        : Promise.resolve(new Response('{}', { status: 200 })),
      fetch(`${origin}/api/backoffice/visibility`, fetchOpts).catch(() => null),
    ])

    let tours: Tour[] = []
    if (classificationId && groupsRes.ok) {
      const groupsData = await groupsRes.json()
      if (groupsData.ok && Array.isArray(groupsData.groups)) {
        tours = groupsData.groups
      }
    }

    let hiddenGroupIds: string[] = []
    if (visRes?.ok) {
      const vis = await visRes.json()
      hiddenGroupIds = vis.hiddenGroupIds || []
    }

    const allExcluded = [...new Set([...EXCLUDED_CODES, ...hiddenGroupIds])]
    tours = tours.filter((t) => !allExcluded.includes(String(t.code ?? t.id ?? '').trim()))

    return NextResponse.json(
      { ok: true, tours, hiddenGroupIds },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${REVALIDATE}, stale-while-revalidate=120`,
        },
      }
    )
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, tours: [], error },
      { status: 502 }
    )
  }
}
