#!/usr/bin/env node
/**
 * Extract all group details from the site and save as JSON.
 *
 * Prerequisites: dev server running (e.g. pnpm dev).
 *
 * Usage:
 *   node scripts/extract-all-group-details.mjs
 *   BASE_URL=https://your-site.com node scripts/extract-all-group-details.mjs
 *
 * Output: data/all-group-details.json (array of ~220 group objects)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const OUT_PATH = path.join(__dirname, '..', 'data', 'all-group-details.json')
const LANG = process.env.LANG || 'ENG'
const TIMEOUT_MS = 120000

async function main() {
  const url = `${BASE_URL}/api/atlantico/export-group-details?lang=${encodeURIComponent(LANG)}`
  console.log('Fetching:', url)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res
  try {
    res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
  } catch (e) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') {
      console.error('Request timed out after', TIMEOUT_MS / 1000, 's')
    } else {
      console.error('Request failed:', e.message)
    }
    process.exit(1)
  }
  clearTimeout(timeoutId)

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('HTTP', res.status, text.slice(0, 500))
    process.exit(1)
  }

  const data = await res.json()
  if (!Array.isArray(data)) {
    console.error('Response is not an array:', typeof data)
    process.exit(1)
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2), 'utf8')
  console.log('Wrote', data.length, 'groups to', OUT_PATH)
}

main()




