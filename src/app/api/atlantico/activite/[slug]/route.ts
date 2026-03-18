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
const EXCLUDED_CODES = ['222', '551']

/** Group IDs to inject for specific vibe slugs (e.g. when not in classification list) */
const EXTRA_GROUP_IDS_BY_SLUG: Record<string, string[]> = {
  'diving-fishing': ['518', '519'],
  'vip-tours': ['303', '403', '479', '480', '508', '509', '510', '511', '513', '515', '516'],
}

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
        `${origin}/api/atlantico/classifications?lang=ENG`,
        { next: { revalidate: REVALIDATE } as const }
      )
      if (classRes.ok) {
        const classData = await classRes.json()
        if (classData.ok && Array.isArray(classData.classifications)) {
          const normalizedSearch = classificationName
            .trim()
            .toLowerCase()
            .replace(/\s+&\s+/g, ' and ')
            .replace(/\s+/g, ' ')
          const found = classData.classifications.find((c: { name?: string; id?: string | number; code?: string }) => {
            const name = String(c.name || '')
              .trim()
              .toLowerCase()
              .replace(/\s+&\s+/g, ' and ')
              .replace(/\s+/g, ' ')
            return name === normalizedSearch
          })
          if (found) {
            // groupsList expects id (per backoffice: "classification code = Id de la Classification")
            classificationId = found.id ?? found.code ?? null
          }
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
      // Fallback: Atlantico may return empty for some locales (ESP/FRA); retry with ENG
      if (tours.length === 0 && validatedLang !== 'ENG') {
        const fallbackRes = await fetch(
          `${origin}/api/atlantico/groups?lang=ENG&page=-1&classificationId=${encodeURIComponent(String(classificationId))}`,
          fetchOpts
        )
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json()
          if (fallbackData.ok && Array.isArray(fallbackData.groups)) {
            tours = fallbackData.groups
          }
        }
      }
    }

    let hiddenGroupIds: string[] = []
    if (visRes?.ok) {
      const vis = await visRes.json()
      hiddenGroupIds = vis.hiddenGroupIds || []
    }

    const allExcluded = [...new Set([...EXCLUDED_CODES, ...hiddenGroupIds])]
    tours = tours.filter((t) => !allExcluded.includes(String(t.code ?? t.id ?? '').trim()))

    // Inject extra groups for specific slugs (e.g. diving-fishing: 518, 519)
    const extraIds = EXTRA_GROUP_IDS_BY_SLUG[slug]
    if (extraIds?.length) {
      const existingCodes = new Set(tours.map((t) => String(t.code ?? t.id ?? '').trim()))
      for (const groupId of extraIds) {
        if (existingCodes.has(groupId)) continue
        try {
          const groupRes = await fetch(
            `${origin}/api/atlantico/group/${encodeURIComponent(groupId)}/${encodeURIComponent(validatedLang)}`,
            fetchOpts
          )
          if (!groupRes.ok) continue
          const g: Record<string, unknown> = await groupRes.json()
          const code = String(g?.Code ?? g?.code ?? g?.id ?? groupId).trim()
          if (allExcluded.includes(code)) continue
          const rawId = g?.id
          const id: string | number = typeof rawId === 'string' || typeof rawId === 'number' ? rawId : groupId
          tours.push({
            id,
            code: code || groupId,
            name: String(g?.name ?? g?.Name ?? g?.title ?? ''),
            desc: typeof g?.desc === 'string' ? g.desc : String(g?.description ?? g?.Desc ?? ''),
            image: typeof g?.image === 'string' ? g.image : undefined,
            price: typeof g?.priceA === 'number' ? g.priceA : typeof (g as any)?.price === 'number' ? (g as any).price : undefined,
            duration: typeof g?.duration === 'string' ? g.duration : undefined,
            ids: Array.isArray(g?.ids) ? g.ids : undefined,
          })
          existingCodes.add(code)
        } catch {
          // skip on fetch error
        }
      }
    }

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
