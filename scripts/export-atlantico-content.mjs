#!/usr/bin/env node
/**
 * Export Atlantico tour content for translation.
 * Run with dev server: npm run dev (in another terminal)
 * Then: node scripts/export-atlantico-content.mjs
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000'

const VIBE_SLUGS = [
  'adventure-nature', 'theme-parks', 'tickets-attractions', 'bus-excursions',
  'boat-trips-cruises', 'shows-entertainment', 'water-sports', 'cable-car-observatory',
  'diving-fishing', 'vip-tours', 'gastronomy-tastings', 'car-rental', 'bike-rental',
  'transfers-private-transport', 'transfers-transport'
]

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

function stripHtml(html) {
  if (!html || typeof html !== 'string') return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function main() {
  const content = { tours: [], groupDetails: [], texts: new Set() }

  for (const slug of VIBE_SLUGS) {
    try {
      const data = await fetchJson(`${BASE}/api/atlantico/activite/${slug}?lang=ENG`)
      if (!data?.ok || !Array.isArray(data.tours)) continue
      for (const t of data.tours) {
        const code = String(t.code ?? t.id ?? '').trim()
        if (!code) continue
        if (t.name) content.texts.add(t.name.trim())
        if (t.desc) content.texts.add(stripHtml(t.desc))
        content.tours.push({ code, name: t.name, desc: t.desc })
      }
    } catch (e) {
      console.warn(`[${slug}]`, e.message)
    }
  }

  const seen = new Set()
  for (const t of content.tours) {
    const code = t.code
    if (seen.has(code)) continue
    seen.add(code)
    try {
      const gd = await fetchJson(`${BASE}/api/atlantico/group-details/${code}/ENG`)
      if (gd) {
        const add = (v) => { if (v && typeof v === 'string') content.texts.add(stripHtml(v)) }
        add(gd.name); add(gd.desc); add(gd.willDo); add(gd.faq)
        add(gd.canDesc); add(gd.canTitle); add(gd.route); add(gd.itinerary)
        content.groupDetails.push({ code, ...gd })
      }
    } catch (e) {
      console.warn(`[group ${code}]`, e.message)
    }
  }

  const texts = [...content.texts].filter(Boolean).sort()
  const out = { texts, toursCount: content.tours.length, groupDetailsCount: content.groupDetails.length }
  const fs = await import('fs')
  fs.writeFileSync('data/atlantico-content-export.json', JSON.stringify(out, null, 2))
  console.log('Exported', texts.length, 'unique texts,', content.tours.length, 'tours')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
