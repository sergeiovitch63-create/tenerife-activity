/**
 * Audit group-details pages across locales.
 *
 * Usage:
 *   node scripts/audit-group-details.js
 *
 * Optional env:
 *   BASE_URL=http://localhost:3000
 *   OUT_CSV=data/group-details-audit.csv
 *   CONCURRENCY=8
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const OUT_CSV = process.env.OUT_CSV || 'data/group-details-audit.csv'
const CONCURRENCY = Number(process.env.CONCURRENCY || 8)

const LOCALES = ['en', 'fr', 'de', 'es', 'it']
const CODES = [
  3, 11, 12, 13, 14, 16, 22, 23, 26, 27, 28, 31, 32, 33, 34, 35, 36, 41, 42, 43,
  46, 50, 53, 54, 55, 58, 66, 67, 69, 70, 72, 74, 78, 90, 92, 97, 98, 101, 102, 103, 111,
  113, 115, 116, 127, 131, 134, 137, 139, 140, 155, 165, 166, 167, 168, 169, 175, 180,
  186, 189, 200, 208, 210, 213, 214, 215, 216, 230, 234, 240, 245, 264, 270, 273, 281,
  283, 284, 301, 303, 306, 308, 310, 314, 319, 321, 322, 323, 326, 327, 328, 330, 340,
  346, 347, 359, 362, 366, 374, 381, 382, 390, 402, 403, 416, 417, 427, 432, 435, 438,
  439, 440, 452, 453, 456, 457, 459, 463, 464, 469, 472, 475, 476, 477, 478, 479, 480,
  481, 492, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 520, 521,
  522, 533, 549, 550, 552, 553,
]

function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripTags(html) {
  return decodeEntities(String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function extractTitle(html) {
  const m = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? stripTags(m[1]) : ''
}

function hasImageInHtml(html) {
  // "naturalWidth" cannot be computed in plain fetch/HTML audit.
  // We use presence of a non-empty <img ... src="..."> as proxy.
  const imgTags = String(html).match(/<img\b[^>]*>/gi) || []
  for (const tag of imgTags) {
    const m = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)
    if (m && m[1] && !m[1].startsWith('data:')) return true
  }
  return false
}

function hasDescriptionParagraph(html) {
  const pMatches = String(html).match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || []
  for (const p of pMatches) {
    if (stripTags(p).length > 20) return true
  }
  return false
}

function hasPricesTable(html) {
  return /<th\b/i.test(String(html))
}

function isLegacyTourTitle(title, code, locale) {
  const escCode = String(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escLoc = String(locale).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^\\s*Tour\\s*[–-]\\s*${escCode}\\s*[–-]\\s*${escLoc}\\s*$`, 'i')
  return re.test(String(title || ''))
}

async function fetchHtml(code, locale) {
  const url = `${BASE_URL}/${locale}/activite/group-details?code=${encodeURIComponent(String(code))}`
  const res = await fetch(url, { redirect: 'follow' })
  const html = await res.text()
  return { url, status: res.status, ok: res.ok, html }
}

async function runTask(code, locale) {
  const issues = []
  let title = ''
  let hasImage = false
  let hasDesc = false
  let hasPrices = false

  try {
    const { status, ok, html } = await fetchHtml(code, locale)
    if (!ok) {
      issues.push(`http_${status}`)
      return {
        code,
        locale,
        title: '',
        has_image: false,
        has_desc: false,
        has_prices: false,
        issues: issues.join('|'),
      }
    }

    title = extractTitle(html)
    hasImage = hasImageInHtml(html)
    hasDesc = hasDescriptionParagraph(html)
    hasPrices = hasPricesTable(html)

    if (!hasImage) issues.push('missing_image')
    if (!hasDesc) issues.push('missing_description')
    if (!hasPrices) issues.push('missing_prices_table')
    if (isLegacyTourTitle(title, code, locale)) issues.push('legacy_title_format')
    if (/No image/i.test(html)) issues.push('contains_no_image')
    if (locale !== 'fr' && /À partir de/i.test(html)) issues.push('contains_french_starting_from')
    if (locale !== 'es' && /(años|niños)/i.test(html)) issues.push('contains_spanish_age_words')
  } catch (e) {
    issues.push(`fetch_error:${e instanceof Error ? e.message : 'unknown'}`)
  }

  return {
    code,
    locale,
    title,
    has_image: hasImage,
    has_desc: hasDesc,
    has_prices: hasPrices,
    issues: issues.join('|'),
  }
}

async function runWithConcurrency(tasks, limit, worker) {
  const results = new Array(tasks.length)
  let idx = 0

  async function runner() {
    while (true) {
      const i = idx++
      if (i >= tasks.length) return
      const task = tasks[i]
      results[i] = await worker(task)
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => runner())
  await Promise.all(workers)
  return results
}

async function writeCsv(rows) {
  const fs = await import('node:fs/promises')
  const header = ['code', 'locale', 'title', 'has_image', 'has_desc', 'has_prices', 'issues']
  const lines = [header.join(',')]

  for (const r of rows) {
    lines.push([
      csvEscape(r.code),
      csvEscape(r.locale),
      csvEscape(r.title),
      csvEscape(r.has_image),
      csvEscape(r.has_desc),
      csvEscape(r.has_prices),
      csvEscape(r.issues),
    ].join(','))
  }

  await fs.writeFile(OUT_CSV, `${lines.join('\n')}\n`, 'utf8')
}

function printSummary(rows) {
  const total = rows.length
  const withIssues = rows.filter((r) => r.issues && r.issues.length > 0)
  const byIssue = new Map()

  for (const r of withIssues) {
    const parts = r.issues.split('|').filter(Boolean)
    for (const p of parts) {
      byIssue.set(p, (byIssue.get(p) || 0) + 1)
    }
  }

  console.log('\n══════════════════════════════════════════')
  console.log('Group Details Audit Summary')
  console.log('══════════════════════════════════════════')
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Locales: ${LOCALES.join(', ')}`)
  console.log(`Codes: ${CODES.length}`)
  console.log(`Pages audited: ${total}`)
  console.log(`Rows with issues: ${withIssues.length}`)
  console.log(`CSV: ${OUT_CSV}`)
  console.log('')

  if (byIssue.size === 0) {
    console.log('✅ No issues detected.')
    return
  }

  const sorted = [...byIssue.entries()].sort((a, b) => b[1] - a[1])
  console.log('Issues breakdown:')
  for (const [issue, count] of sorted) {
    console.log(`- ${issue}: ${count}`)
  }
}

async function main() {
  const tasks = []
  for (const code of CODES) {
    for (const locale of LOCALES) {
      tasks.push({ code, locale })
    }
  }

  console.log(`\n🔎 Auditing ${tasks.length} pages with concurrency=${CONCURRENCY}...\n`)
  const rows = await runWithConcurrency(tasks, CONCURRENCY, ({ code, locale }) => runTask(code, locale))
  await writeCsv(rows)
  printSummary(rows)
}

main().catch((e) => {
  console.error('❌ Audit failed:', e)
  process.exit(1)
})

