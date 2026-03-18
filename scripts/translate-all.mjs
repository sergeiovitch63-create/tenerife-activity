#!/usr/bin/env node
/**
 * Translate ALL Atlantico content (group details + event options) using Anthropic.
 *
 * Steps:
 * 1) Fetch group codes from /api/atlantico/groups (fallback: /api/atlantico/catalog)
 * 2) For each code, fetch /api/atlantico/group-details/{code}/ENG and translate:
 *    - name, desc, willDo, faq, canDesc, childAge, infantAge
 * 3) For each code, fetch /api/atlantico/event-details for each eventId (from groupDetails.ids)
 *    and translate:
 *    - eventOptions[].name, eventOptions[].desc
 * 4) Save into data/atlantico-translations-full.json with structure:
 *    { [code]: { [lang]: { groupDetails: {...}, eventOptions: [...] } } }
 *
 * ENV required:
 * - BASE_URL            (e.g. https://www.tenerife-activity.com or http://localhost:3000)
 * - ANTHROPIC_API_KEY   (Anthropic API key)
 *
 * Optional ENV:
 * - LIMIT               (number of group codes to process, for testing)
 * - START_FROM          (code to start from; skips until this code encountered)
 * - SLEEP_MS            (pause between Anthropic calls; default 800ms)
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fetch from 'node-fetch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
// For translate-all, we want to hit Atlantico directly for group details,
// to avoid depending on local Next.js API routes (which may return 500 when ENG is forced).
const ATLANTICO_API_BASE_URL =
  process.env.ATLANTICO_API_BASE_URL || 'https://api.atlanticoexcursiones.com'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in environment.')
  process.exit(1)
}

const TARGET_LANGS = ['fr', 'es', 'de', 'ru', 'pl', 'it']
const MODEL = 'claude-haiku-4-5-20251001'

const SLEEP_MS = Number.isFinite(Number(process.env.SLEEP_MS)) ? Number(process.env.SLEEP_MS) : 800
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function normalizeCode(v) {
  const s = String(v ?? '').trim()
  return s && s !== '-1' ? s : ''
}

function safeString(v) {
  if (v == null) return ''
  return String(v)
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? `: ${body.slice(0, 300)}` : ''}`)
  }
  return await res.json()
}

async function readCatalogCodesFromFile() {
  const catalogPath = path.join(__dirname, '..', 'data', 'atlantico_catalog_core.json')
  const raw = await fs.readFile(catalogPath, 'utf8')
  const json = JSON.parse(raw)
  const items = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : []
  const codes = items.map((it) => normalizeCode(it?.code ?? it?.Code ?? it?.id ?? it?.Id)).filter(Boolean)
  return Array.from(new Set(codes))
}

async function fetchGroupCodes() {
  // Prefer local catalog file (most complete and stable)
  try {
    const codes = await readCatalogCodesFromFile()
    if (codes.length > 0) return codes
  } catch (e) {
    console.warn('Failed to read data/atlantico_catalog_core.json, falling back to API catalog.', e?.message || e)
  }

  // Fallback: /api/atlantico/catalog/ENG (preferred) then /api/atlantico/catalog
  try {
    const catalogEng = await fetchJson(`${BASE_URL}/api/atlantico/catalog/ENG`)
    const items = Array.isArray(catalogEng) ? catalogEng : Array.isArray(catalogEng?.items) ? catalogEng.items : []
    const codes = items.map((it) => normalizeCode(it?.code ?? it?.Code ?? it?.id ?? it?.Id)).filter(Boolean)
    if (codes.length > 0) return Array.from(new Set(codes))
  } catch (e) {
    console.warn('Failed to fetch /api/atlantico/catalog/ENG, falling back to /api/atlantico/catalog.', e?.message || e)
  }

  const catalog = await fetchJson(`${BASE_URL}/api/atlantico/catalog`)
  const items = Array.isArray(catalog) ? catalog : Array.isArray(catalog?.items) ? catalog.items : []
  const codes = items.map((it) => normalizeCode(it?.code ?? it?.Code ?? it?.id ?? it?.Id)).filter(Boolean)
  return Array.from(new Set(codes))
}

async function fetchGroupDetailsENG(code) {
  const url = `${ATLANTICO_API_BASE_URL}/groupDetails/${encodeURIComponent(code)}/ENG`
  try {
    return await fetchJson(url)
  } catch (e) {
    // Fallback: some Atlantico codes are only available via /group/{code}/ENG
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('HTTP 500') || msg.includes('HTTP 404')) {
      const fallbackUrl = `${ATLANTICO_API_BASE_URL}/group/${encodeURIComponent(code)}/ENG`
      console.warn(
        `  groupDetails ENG failed for code=${code} (${msg}). Trying fallback /group/:`,
        fallbackUrl
      )
      return await fetchJson(fallbackUrl)
    }
    throw e
  }
}

function extractEventIdsFromGroupDetails(details) {
  const idsRaw = details?.ids ?? details?.Ids ?? details?.eventIds ?? details?.events
  if (typeof idsRaw === 'string') {
    return idsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  // Sometimes API might return { events: [...] } with {id}
  if (Array.isArray(idsRaw)) {
    return idsRaw
      .map((e) => String(e?.id ?? e?.eventId ?? e?.t_id ?? '').trim())
      .filter(Boolean)
  }
  return []
}

async function fetchEventDetailsENG(eventId) {
  return await fetchJson(
    `${ATLANTICO_API_BASE_URL}/eventDetails/${encodeURIComponent(eventId)}/ENG`
  )
}

async function claudeTranslateJson({ targetLang, payload, schemaHint }) {
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
      max_tokens: 4000,
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

  const data = await res.json()
  const textBlock =
    (Array.isArray(data?.content) && typeof data.content[0]?.text === 'string' ? data.content[0].text : '') || ''

  if (!textBlock) throw new Error('Claude response missing text content')

  const cleaned = textBlock
    // Remove markdown code fences if Claude adds them
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`Failed to parse Claude JSON: ${e.message}\nRaw: ${textBlock.slice(0, 800)}`)
  }
}

async function main() {
  console.log(`BASE_URL=${BASE_URL}`)
  console.log('Fetching group codes...')
  let codes = await fetchGroupCodes()
  console.log(`Found ${codes.length} group codes`)

  const startFrom = normalizeCode(process.env.START_FROM)
  if (startFrom) {
    const idx = codes.findIndex((c) => c === startFrom)
    if (idx >= 0) codes = codes.slice(idx)
    console.log(`START_FROM=${startFrom} → processing ${codes.length} codes`)
  }

  const limit = Number.isFinite(Number(process.env.LIMIT)) ? Number(process.env.LIMIT) : null
  if (limit && limit > 0) {
    codes = codes.slice(0, limit)
    console.log(`LIMIT=${limit} → processing ${codes.length} codes`)
  }

  const out = {} // { [code]: { [lang]: { groupDetails, eventOptions } } }

  for (const code of codes) {
    console.log(`\nProcessing group code=${code}...`)

    let detailsENG
    try {
      detailsENG = await fetchGroupDetailsENG(code)
    } catch (e) {
      console.error(`  Failed to fetch group-details ENG for code=${code}:`, e?.message || e)
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
    const eventOptionsENG = []
    if (eventIds.length > 0) {
      console.log(`  Fetching ${eventIds.length} event options (ENG)...`)
      for (const eventId of eventIds) {
        try {
          const ed = await fetchEventDetailsENG(eventId)
          eventOptionsENG.push({
            eventId: String(eventId),
            name: safeString(ed?.name ?? ed?.Name),
            desc: safeString(ed?.desc ?? ed?.Desc ?? ed?.description),
          })
          await sleep(50)
        } catch (e) {
          console.warn(`  Failed to fetch event-details for eventId=${eventId}:`, e?.message || e)
        }
      }
    }

    if (!out[code]) out[code] = {}

    for (const lang of TARGET_LANGS) {
      console.log(`  Translating to ${lang}...`)
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

        out[code][lang] = {
          groupDetails: {
            name: safeString(groupDetailsTranslated?.name),
            desc: safeString(groupDetailsTranslated?.desc),
            willDo: safeString(groupDetailsTranslated?.willDo),
            faq: safeString(groupDetailsTranslated?.faq),
            canDesc: safeString(groupDetailsTranslated?.canDesc),
            childAge: safeString(groupDetailsTranslated?.childAge),
            infantAge: safeString(groupDetailsTranslated?.infantAge),
          },
          eventOptions: Array.isArray(eventOptionsTranslated)
            ? eventOptionsTranslated.map((o) => ({
                eventId: safeString(o?.eventId),
                name: safeString(o?.name),
                desc: safeString(o?.desc),
              }))
            : [],
        }
      } catch (e) {
        console.error(`  Claude error for code=${code}, lang=${lang}:`, e?.message || e)
      }

      await sleep(SLEEP_MS)
    }
  }

  const outPath = path.join(__dirname, '..', 'src', 'data', 'atlantico-translations-full.json')
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')
  console.log(`\nDone. Wrote translations to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

