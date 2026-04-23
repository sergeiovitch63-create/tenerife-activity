/**
 * Personalization debug endpoint.
 *
 * GET /api/personalize-debug/[code]?locale=fr
 *
 * Fetches an Atlantico group + its events, runs the signal extractor and the
 * composer, and returns a JSON dump of:
 *   - the extracted signals (themes, setting, altitude, sensitivity flags)
 *   - every module score (including below-threshold with reason)
 *   - the final composition by slot (what the UI would actually render)
 *
 * Used for deterministic QA of the personalization system without having to
 * eyeball the UI. Not meant for production — leaves in dev only.
 */

import { NextResponse } from 'next/server'
import { getGroupDetails, getEventDetails } from '@/lib/atlantico/client'
import { parseIds } from '@/lib/atlantico/normalize'
import { isLocale, type Locale } from '@/lib/locale'
import { extractSignals } from '@/lib/personalize/signals'
import { composePage } from '@/lib/personalize/compose'
import { REGISTRY } from '@/lib/personalize/registry'
import type { ModuleScore } from '@/lib/personalize/types'

type Props = { params: { code: string } }

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: Props) {
  try {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 })
  }

  const url = new URL(req.url)
  const localeParam = url.searchParams.get('locale') ?? 'fr'
  const locale = (isLocale(localeParam) ? localeParam : 'fr') as Locale

  const group = await getGroupDetails(params.code, locale)
  if (!group) {
    return NextResponse.json({ error: `Group ${params.code} not found` }, { status: 404 })
  }

  const eventIds = parseIds(group.ids)
  const events = await Promise.all(eventIds.map((id) => getEventDetails(id, locale)))
  const validEvents = events.filter((e): e is NonNullable<typeof e> => !!e)

  // Signal extraction
  const signals = extractSignals(group, validEvents)

  // Collect raw scorer output (even rejections) for debugging
  type RawResult = {
    id: string
    defaultSlot: string
    rejected: boolean
    score: number | null
    slot: string | null
    reason: string | null
    propsKeys: string[]
  }
  const rawScores: RawResult[] = REGISTRY.map((mod) => {
    const result = mod.score(signals)
    if (!result) {
      return {
        id: mod.id,
        defaultSlot: mod.defaultSlot,
        rejected: true,
        score: null,
        slot: null,
        reason: null,
        propsKeys: [],
      }
    }
    return {
      id: mod.id,
      defaultSlot: mod.defaultSlot,
      rejected: false,
      score: result.score,
      slot: result.slot ?? mod.defaultSlot,
      reason: result.reason ?? null,
      propsKeys: result.props ? Object.keys(result.props) : [],
    }
  })

  // Final composition (threshold applied, slot-capped)
  const composed = composePage(signals, REGISTRY)
  const composition: Record<string, { id: string; score: number; reason: string | null }[]> = {}
  for (const [slot, modules] of Object.entries(composed.modulesBySlot)) {
    composition[slot] = modules.map((m: ModuleScore) => ({
      id: m.id,
      score: m.score,
      reason: m.reason ?? null,
    }))
  }

  // Flatten event schedule summary (days/times) for cross-checking scorer decisions
  const eventSchedule = validEvents.map((e) => ({
    code: e.code,
    name: e.name,
    days: e.days ?? [],
    times: e.times ?? [],
    icons: e.icons ?? [],
  }))

  const body = {
    code: params.code,
    locale,
    group: {
      name: group.name,
      code: group.code,
      category: group.category,
      duration: group.duration,
      childAge: group.childAge,
      infantAge: group.infantAge,
      pickup: group.pickup,
      price: group.price,
      latitud: group.latitud,
      longitud: group.longitud,
      // Reputation + inventory fields used by Sprint 5 scorers
      recom: group.recom,
      discount: group.discount,
      tadvisor: group.tadvisor,
      isNew: group.isNew,
      imagesCount: group.images?.length ?? 0,
      hasVideo: !!group.video,
    },
    eventSchedule,
    signals: {
      // Expose everything interesting except the raw _group / _events dumps
      code: signals.code,
      name: signals.name,
      category: signals.category,
      durationMinutes: signals.durationMinutes,
      priceTier: signals.priceTier,
      zone: signals.zone,
      altitude: signals.altitude,
      themes: [...signals.themes],
      intensity: signals.intensity,
      setting: signals.setting,
      keywords: [...signals.keywords],
      hasChildAge: signals.hasChildAge,
      minChildAge: signals.minChildAge,
      maxChildAge: signals.maxChildAge,
      hasInfantAge: signals.hasInfantAge,
      isFamilyFriendly: signals.isFamilyFriendly,
      weatherSensitive: signals.weatherSensitive,
      windSensitive: signals.windSensitive,
      waveSensitive: signals.waveSensitive,
      visibilitySensitive: signals.visibilitySensitive,
      altitudeSensitive: signals.altitudeSensitive,
      calimaSensitive: signals.calimaSensitive,
      hasVideo: signals.hasVideo,
      imageCount: signals.imageCount,
      hasDetailedRoute: signals.hasDetailedRoute,
      hasFaq: signals.hasFaq,
      hasMultipleEvents: signals.hasMultipleEvents,
    },
    scorers: rawScores,
    composition,
  }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'no-store' },
  })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    return NextResponse.json({ error: msg, stack }, { status: 500 })
  }
}
