/**
 * POST /api/admin/translate-all
 *
 * Runs the same logic as scripts/translate-all.mjs, but on the server.
 * This endpoint is meant to be called from the production server (Hetzner),
 * so that calls to the external Atlantico API originate from a whitelisted IP.
 *
 * It writes the full translation payload to src/data/atlantico-translations-full.json.
 *
 * Security note:
 * - Optionally protect with an admin token header: X-Admin-Token = process.env.ADMIN_TRANSLATE_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'

const ATLANTICO_API_BASE_URL =
  process.env.ATLANTICO_API_BASE_URL || 'https://api.atlanticoexcursiones.com'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const TARGET_LANGS = ['fr', 'es', 'de', 'ru', 'pl', 'it'] as const
const MODEL = 'claude-haiku-4-5-20251001'

const SLEEP_MS = Number.isFinite(Number(process.env.SLEEP_MS))
  ? Number(process.env.SLEEP_MS)
  : 800

type TargetLang = (typeof TARGET_LANGS)[number]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeCode(v: unknown): string {
  const s = String(v ?? '').trim()
  return s && s !== '-1' ? s : ''
}

function safeString(v: unknown): string {
  if (v == null) return ''
  return String(v)
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? `: ${body.slice(0, 300)}` : ''}`)
  }
  return (await res.json()) as unknown
}

async function readCatalogCodesFromFile(): Promise<string[]> {
  const catalogPath = path.join(process.cwd(), 'data', 'atlantico_catalog_core.json')
  const raw = await fs.readFile(catalogPath, 'utf8')
  const json = JSON.parse(raw) as { items?: unknown[] } | unknown[]
  const items = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : []
  const codes = items
    .map((it: any) => normalizeCode(it?.code ?? it?.Code ?? it?.id ?? it?.Id))
    .filter(Boolean)
  return Array.from(new Set(codes))
}

async function fetchGroupDetailsENG(code: string) {
  const url = `${ATLANTICO_API_BASE_URL}/groupDetails/${encodeURIComponent(code)}/ENG`
  try {
    return await fetchJson(url)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('HTTP 500') || msg.includes('HTTP 404')) {
      const fallbackUrl = `${ATLANTICO_API_BASE_URL}/group/${encodeURIComponent(code)}/ENG`
      console.warn(
        `  [translate-all] groupDetails ENG failed for code=${code} (${msg}). Trying fallback /group/:`,
        fallbackUrl
      )
      return await fetchJson(fallbackUrl)
    }
    throw e
  }
}

function extractEventIdsFromGroupDetails(details: any): string[] {
  const idsRaw = details?.ids ?? details?.Ids ?? details?.eventIds ?? details?.events
  if (typeof idsRaw === 'string') {
    return idsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (Array.isArray(idsRaw)) {
    return idsRaw
      .map((e) => String((e as any)?.id ?? (e as any)?.eventId ?? (e as any)?.t_id ?? '').trim())
      .filter(Boolean)
  }
  return []
}

async function fetchEventDetailsENG(eventId: string) {
  return await fetchJson(
    `${ATLANTICO_API_BASE_URL}/eventDetails/${encodeURIComponent(eventId)}/ENG`
  )
}

async function claudeTranslateJson(params: {
  targetLang: TargetLang
  payload: unknown
  schemaHint?: string
}) {
  const { targetLang, payload, schemaHint } = params

  if (!ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY in environment.')
  }

  const systemPrompt = `
You are a professional marketing translator.
You receive tourism activity texts in English and must translate them into the target language, preserving meaning, tone, and sales impact.
Return ONLY valid JSON (no markdown, no commentary).
Keep the same JSON shape as the input.
${schemaHint ? `\nNotes:\n${schemaHint}\n` : ''}
`.trim()

  const userContent = { targetLang, payload }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Translate the following JSON from English into the language indicated in "targetLang".\n' +
                'Return ONLY valid JSON, no markdown, no explanations.\n\n' +
                JSON.stringify(userContent, null, 2),
            },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Claude error ${res.status} ${res.statusText}: ${body}`)
  }

  const data = (await res.json()) as any
  const textBlock =
    (Array.isArray(data?.content) && typeof data.content[0]?.text === 'string'
      ? data.content[0].text
      : '') || ''

  if (!textBlock) throw new Error('Claude response missing text content')

  const cleaned = textBlock
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch (e: any) {
    throw new Error(`Failed to parse Claude JSON: ${e.message}\nRaw: ${textBlock.slice(0, 800)}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Optional simple auth
    const adminToken = process.env.ADMIN_TRANSLATE_TOKEN
    if (adminToken) {
      const provided = request.headers.get('x-admin-token')
      if (provided !== adminToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const startFromParam = searchParams.get('startFrom')

    console.log('[translate-all API] Starting full translation run...')

    let codes = await readCatalogCodesFromFile()
    console.log(`[translate-all API] Found ${codes.length} group codes`)

    const startFrom = normalizeCode(startFromParam)
    if (startFrom) {
      const idx = codes.findIndex((c) => c === startFrom)
      if (idx >= 0) codes = codes.slice(idx)
      console.log(`[translate-all API] START_FROM=${startFrom} → processing ${codes.length} codes`)
    }

    const limit = Number.isFinite(Number(limitParam)) ? Number(limitParam) : null
    if (limit && limit > 0) {
      codes = codes.slice(0, limit)
      console.log(`[translate-all API] LIMIT=${limit} → processing ${codes.length} codes`)
    }

    const out: Record<string, Record<TargetLang, any>> = {}

    for (const code of codes) {
      console.log(`[translate-all API] Processing group code=${code}...`)

      let detailsENG: any
      try {
        detailsENG = await fetchGroupDetailsENG(code)
      } catch (e: any) {
        console.error(
          `[translate-all API] Failed to fetch group-details ENG for code=${code}:`,
          e?.message || e
        )
        continue
      }

      const baseGroupDetails = {
        name: safeString(detailsENG?.name ?? detailsENG?.Name),
        desc: safeString(detailsENG?.desc ?? detailsENG?.description ?? detailsENG?.Desc),
        willDo: safeString(detailsENG?.willDo ?? detailsENG?.WillDo),
        faq: safeString(detailsENG?.faq ?? detailsENG?.Faq),
        canDesc: safeString(
          detailsENG?.canDesc ??
            detailsENG?.canTitle ??
            detailsENG?.cancellationPolicy ??
            detailsENG?.cancellation_policy ??
            detailsENG?.cancellation ??
            ''
        ),
        childAge: safeString(detailsENG?.childAge ?? detailsENG?.ChildAge),
        infantAge: safeString(detailsENG?.infantAge ?? detailsENG?.InfantAge),
      }

      const eventIds = extractEventIdsFromGroupDetails(detailsENG)
      const eventOptionsENG: Array<{ eventId: string; name: string; desc: string }> = []
      if (eventIds.length > 0) {
        console.log(
          `[translate-all API]   Fetching ${eventIds.length} event options (ENG) for code=${code}...`
        )
        for (const eventId of eventIds) {
          try {
            const ed: any = await fetchEventDetailsENG(eventId)
            eventOptionsENG.push({
              eventId: String(eventId),
              name: safeString(ed?.name ?? ed?.Name),
              desc: safeString(ed?.desc ?? ed?.Desc ?? ed?.description),
            })
            await sleep(50)
          } catch (e: any) {
            console.warn(
              `[translate-all API]   Failed to fetch event-details for eventId=${eventId}:`,
              e?.message || e
            )
          }
        }
      }

      if (!out[code]) out[code] = {} as Record<TargetLang, any>

      for (const lang of TARGET_LANGS) {
        console.log(`[translate-all API]   Translating code=${code} to ${lang}...`)
        try {
          const [groupDetailsTranslated, eventOptionsTranslated] = await Promise.all([
            claudeTranslateJson({
              targetLang: lang,
              payload: baseGroupDetails,
              schemaHint:
                'Translate the values. Keep keys exactly: name, desc, willDo, faq, canDesc, childAge, infantAge.',
            }),
            claudeTranslateJson({
              targetLang: lang,
              payload: eventOptionsENG,
              schemaHint:
                'Input is an array of options. Keep the array length and order. Keep keys exactly: eventId, name, desc.',
            }),
          ])

          ;(out[code] as any)[lang] = {
            groupDetails: {
              name: safeString((groupDetailsTranslated as any)?.name),
              desc: safeString((groupDetailsTranslated as any)?.desc),
              willDo: safeString((groupDetailsTranslated as any)?.willDo),
              faq: safeString((groupDetailsTranslated as any)?.faq),
              canDesc: safeString((groupDetailsTranslated as any)?.canDesc),
              childAge: safeString((groupDetailsTranslated as any)?.childAge),
              infantAge: safeString((groupDetailsTranslated as any)?.infantAge),
            },
            eventOptions: Array.isArray(eventOptionsTranslated)
              ? (eventOptionsTranslated as any[]).map((o) => ({
                  eventId: safeString((o as any)?.eventId),
                  name: safeString((o as any)?.name),
                  desc: safeString((o as any)?.desc),
                }))
              : [],
          }
        } catch (e: any) {
          console.error(
            `[translate-all API]   Claude error for code=${code}, lang=${lang}:`,
            e?.message || e
          )
        }

        await sleep(SLEEP_MS)
      }
    }

    const outPath = path.join(
      process.cwd(),
      'src',
      'data',
      'atlantico-translations-full.json'
    )
    await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')
    console.log(
      `[translate-all API] Done. Wrote translations to ${outPath} (codes=${Object.keys(out).length})`
    )

    return NextResponse.json({
      ok: true,
      codes: Object.keys(out),
      targetLangs: TARGET_LANGS,
      output: outPath,
    })
  } catch (error: any) {
    console.error('[translate-all API] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'translate-all failed',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

