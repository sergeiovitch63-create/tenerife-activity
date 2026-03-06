/**
 * GET /api/atlantico/export-group-details?lang=ENG
 *
 * Returns ALL group details as a flat JSON array for export.
 * Fetches backoffice data then normalizes to one object per group with:
 * name, price, duration, category/type, code, description, image, eventIds,
 * and any other relevant fields (difficulty, meetingPoint, languages, etc.).
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

interface Classification {
  id?: string | number
  code?: string
  name?: string
  [key: string]: unknown
}

interface Group {
  id?: string | number
  Code?: string
  code?: string
  name?: string
  price?: number | string
  duration?: string | number
  [key: string]: unknown
}

interface GroupDetails {
  Code?: string
  code?: string
  name?: string
  Name?: string
  price?: number | string
  duration?: string | number
  desc?: string
  description?: string
  image?: string
  ids?: string | string[] | number[]
  category?: string
  classification?: string
  meetingPoint?: string
  meetingPoints?: unknown
  difficulty?: string
  childAge?: string
  infantAge?: string
  groupSize?: string
  languages?: string
  departureLocation?: string
  route?: string
  willDo?: string
  faq?: string
  [key: string]: unknown
}

function parseIds(ids: string | string[] | number[] | undefined): string[] {
  if (ids == null) return []
  if (Array.isArray(ids)) return ids.map(String).filter(Boolean)
  const s = String(ids).trim()
  if (!s) return []
  return s.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean)
}

function toNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const n = parseFloat(String(v))
  return Number.isNaN(n) ? null : n
}

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') || 'ENG'
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    'http://localhost:3000'

  try {
    const res = await fetch(
      `${origin}/api/atlantico/backoffice?lang=${encodeURIComponent(lang)}&fresh=1`,
      { cache: 'no-store' }
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: 'Backoffice fetch failed', status: res.status, body: text.slice(0, 300) },
        { status: 502 }
      )
    }

    const data = (await res.json()) as {
      ok?: boolean
      classifications?: Classification[]
      groupsByClassification?: Record<string, Group[]>
      groupDetailsByGroupId?: Record<string, GroupDetails>
    }

    if (!data.ok || !data.classifications || !data.groupsByClassification || !data.groupDetailsByGroupId) {
      return NextResponse.json(
        { error: 'Invalid backoffice response', ok: data.ok },
        { status: 502 }
      )
    }

    const classifications = data.classifications
    const groupsByClassification = data.groupsByClassification
    const groupDetailsByGroupId = data.groupDetailsByGroupId

    const classificationById = new Map<string, { name: string; code: string }>()
    for (const c of classifications) {
      const id = c.id != null ? String(c.id) : null
      if (id && c.name) {
        classificationById.set(id, {
          name: String(c.name),
          code: String(c.code ?? c.id ?? ''),
        })
      }
    }

    const seen = new Set<string>()
    const out: Array<{
      code: string
      name: string
      price: number | null
      duration: string | null
      category: string | null
      categoryCode: string | null
      description: string | null
      image: string | null
      eventIds: string[]
      difficulty: string | null
      meetingPoint: string | null
      departureLocation: string | null
      groupSize: string | null
      languages: string | null
      childAge: string | null
      infantAge: string | null
      [key: string]: unknown
    }> = []

    for (const [classificationId, groups] of Object.entries(groupsByClassification)) {
      const cat = classificationById.get(classificationId) || {
        name: classificationId,
        code: classificationId,
      }

      for (const group of groups || []) {
        const code = String(group.Code ?? group.code ?? group.id ?? '').trim()
        if (!code || seen.has(code)) continue
        seen.add(code)

        const details: GroupDetails | undefined =
          groupDetailsByGroupId[code] ??
          groupDetailsByGroupId[String(group.id ?? '')] ??
          groupDetailsByGroupId[String(group.Code ?? '')] ??
          groupDetailsByGroupId[String(group.code ?? '')]

        const name =
          details?.name ?? details?.Name ?? group.name ?? code
        const price = toNum(details?.price ?? group.price)
        const duration =
          details?.duration != null
            ? String(details.duration)
            : group.duration != null
              ? String(group.duration)
              : null
        const description =
          details?.desc ?? details?.description ?? (group as { desc?: string }).desc ?? null
        const image = details?.image ?? (group as { image?: string }).image
        const eventIds = parseIds(details?.ids)

        out.push({
          code,
          name: String(name),
          price,
          duration,
          category: cat.name,
          categoryCode: cat.code,
          description: description ? String(description) : null,
          image: image ? String(image) : null,
          eventIds,
          difficulty: details?.difficulty ? String(details.difficulty) : null,
          meetingPoint:
            details?.meetingPoint != null ? String(details.meetingPoint) : null,
          departureLocation:
            details?.departureLocation != null
              ? String(details.departureLocation)
              : details?.meetingPoint != null
                ? String(details.meetingPoint)
                : null,
          groupSize: details?.groupSize != null ? String(details.groupSize) : null,
          languages: details?.languages != null ? String(details.languages) : null,
          childAge: details?.childAge != null ? String(details.childAge) : null,
          infantAge: details?.infantAge != null ? String(details.infantAge) : null,
        })
      }
    }

    return NextResponse.json(out, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: 'Export failed', message },
      { status: 500 }
    )
  }
}




