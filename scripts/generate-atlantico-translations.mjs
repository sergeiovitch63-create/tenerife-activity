#!/usr/bin/env node
/**
 * Generate Atlantico translations using Claude (Sonnet).
 *
 * - Reads all groups from data/atlantico_catalog_core.json
 * - Fetches groupDetails in ENG via internal API
 * - Translates name / description / willDo ("what you do") into fr, es, de, ru, pl, it
 * - Outputs data/atlantico-translations.json
 *
 * ENV required:
 * - BASE_URL            (e.g. https://www.tenerife-activity.com or http://localhost:3000)
 * - ANTHROPIC_API_KEY   (Claude API key)
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fetch from 'node-fetch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in environment.')
  process.exit(1)
}

// Target languages (IETF-ish codes for your JSON; we’ll tell Claude explicitly)
const TARGET_LANGS = ['fr', 'es', 'de', 'ru', 'pl', 'it']

// Claude model – adjust to the exact deployed ID if needed
const MODEL = 'claude-3.7-sonnet-20250219'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function readCatalog() {
  const catalogPath = path.join(__dirname, '..', 'data', 'atlantico_catalog_core.json')
  const raw = await fs.readFile(catalogPath, 'utf8')
  const json = JSON.parse(raw)
  const codes = json.items
    .map((item) => String(item.code || item.id || '').trim())
    .filter((c) => c && c !== '-1')

  return Array.from(new Set(codes))
}

async function fetchGroupDetails(code) {
  const url = `${BASE_URL}/api/atlantico/group-details/${encodeURIComponent(code)}/ENG`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    console.warn(`Failed to fetch groupDetails for code=${code}: ${res.status} ${res.statusText}`)
    return null
  }
  try {
    return await res.json()
  } catch {
    console.warn(`Invalid JSON for groupDetails code=${code}`)
    return null
  }
}

/**
 * Call Claude to translate a set of fields for one group into one target language.
 * `fields` = { name, description, whatYouDo } in English.
 */
async function claudeTranslateFields(fields, targetLang) {
  const systemPrompt = `
You are a professional marketing translator.
You receive tourism activity texts in English and must translate them into the target language, preserving meaning, tone, and sales impact.
Return ONLY a compact JSON object with the same keys as the input (name, description, whatYouDo), no commentary.
`

  const userContent = {
    targetLang,
    fields,
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Translate the following activity texts from English into the target language indicated in "targetLang".\n' +
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
    (Array.isArray(data?.content) && typeof data.content[0]?.text === 'string'
      ? data.content[0].text
      : '') || ''

  if (!textBlock) {
    throw new Error('Claude response missing text content')
  }

  let parsed
  try {
    parsed = JSON.parse(textBlock)
  } catch (e) {
    throw new Error(`Failed to parse Claude JSON: ${e.message}\nRaw: ${textBlock.slice(0, 500)}`)
  }

  return {
    name: parsed.name || '',
    description: parsed.description || '',
    whatYouDo: parsed.whatYouDo || '',
  }
}

async function main() {
  console.log('Reading catalog...')
  const codes = await readCatalog()
  console.log(`Found ${codes.length} group codes`)

  const result = {} // { [code]: { [lang]: { name, description, whatYouDo } } }

  for (const code of codes) {
    console.log(`Processing group code=${code}...`)
    const details = await fetchGroupDetails(code)
    await sleep(150)

    if (!details) continue

    const name = (details.name || details.Name || '').toString()
    const description = (details.desc || details.description || '').toString()
    const whatYouDo = (details.willDo || '').toString()

    const baseFields = { name, description, whatYouDo }
    if (!result[code]) result[code] = {}

    for (const lang of TARGET_LANGS) {
      console.log(`  Translating to ${lang}...`)
      try {
        const translated = await claudeTranslateFields(baseFields, lang)
        result[code][lang] = translated
      } catch (err) {
        console.error(`  Claude error for code=${code}, lang=${lang}:`, err.message)
      }

      // small pause between Claude calls to be gentle with the API
      await sleep(800)
    }
  }

  const outPath = path.join(__dirname, '..', 'data', 'atlantico-translations.json')
  await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf8')
  console.log(`Done. Wrote translations to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

