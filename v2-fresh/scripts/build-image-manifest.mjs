#!/usr/bin/env node
/**
 * Build-time image manifest generator.
 *
 * Scans public/images/{pictures/tours-vip,tours-list}/* and writes a static
 * JSON manifest consumed by src/lib/local-images.ts.
 *
 * Why: Next.js's file tracer (@vercel/nft) cannot resolve dynamic
 * `fs.readdirSync(process.cwd() + ...)` calls, so it conservatively bundles
 * the ENTIRE traced directory into every serverless function. With a 439 MB
 * public/images tree, that blows past Vercel's 300 MB function-size limit.
 *
 * By replacing runtime fs with a static import of a JSON manifest, the
 * function bundle contains only the tiny manifest (~tens of KB) and the
 * images continue to be served by Next.js's static asset pipeline (CDN).
 *
 * Runs automatically via the `prebuild` npm lifecycle hook.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public', 'images')
const OUT = path.join(ROOT, 'src', 'lib', 'local-images-manifest.json')

const IMG_EXT = /\.(png|jpe?g|webp)$/i
const CODE_OK = /^[\w-]+$/
const VIP_SUBVARIANTS = ['groups-details', 'group-details']

function listImagesSorted(dir) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => IMG_EXT.test(f))
      .sort()
  } catch {
    return []
  }
}

function safeReaddir(dir) {
  try { return fs.readdirSync(dir) } catch { return [] }
}

/**
 * Build the VIP gallery map:
 *   { [groupCode]: ['/images/pictures/tours-vip/<code>/<sub>/<file>', …] }
 */
function buildVipMap() {
  const out = {}
  const vipRoot = path.join(PUBLIC, 'pictures', 'tours-vip')
  if (!fs.existsSync(vipRoot)) return out

  for (const code of safeReaddir(vipRoot)) {
    if (!CODE_OK.test(code)) continue
    const groupDir = path.join(vipRoot, code)
    if (!fs.statSync(groupDir).isDirectory()) continue

    // Subvariant takes priority, first hit wins.
    let picked = null
    for (const sub of VIP_SUBVARIANTS) {
      const subDir = path.join(groupDir, sub)
      if (!fs.existsSync(subDir)) continue
      const files = listImagesSorted(subDir)
      if (files.length > 0) {
        picked = files.map(
          (f) => `/images/pictures/tours-vip/${code}/${sub}/${encodeURIComponent(f)}`,
        )
        break
      }
    }

    if (!picked) {
      // Fallback: flat files directly under the group folder.
      const files = listImagesSorted(groupDir)
      if (files.length > 0) {
        picked = files.map(
          (f) => `/images/pictures/tours-vip/${code}/${encodeURIComponent(f)}`,
        )
      }
    }

    if (picked && picked.length > 0) out[code] = picked
  }
  return out
}

/**
 * Build the card-cover map:
 *   { [groupCode]: '/images/tours-list/<code>/<preferred>' }
 * Preferred = `cover.<ext>` if present, else the first sorted file.
 */
function buildListCovers() {
  const out = {}
  const listRoot = path.join(PUBLIC, 'tours-list')
  if (!fs.existsSync(listRoot)) return out

  for (const code of safeReaddir(listRoot)) {
    if (!CODE_OK.test(code)) continue
    const dir = path.join(listRoot, code)
    if (!fs.statSync(dir).isDirectory()) continue
    const files = listImagesSorted(dir)
    if (files.length === 0) continue
    const preferred =
      files.find((f) => /^cover\.(png|jpe?g|webp)$/i.test(f)) ?? files[0]
    out[code] = `/images/tours-list/${code}/${encodeURIComponent(preferred)}`
  }
  return out
}

function main() {
  const vip = buildVipMap()
  const listCovers = buildListCovers()

  // Merged cover map: tours-list wins over the first tours-vip frame.
  const covers = {}
  for (const [code, imgs] of Object.entries(vip)) {
    if (imgs.length > 0) covers[code] = imgs[0]
  }
  for (const [code, cover] of Object.entries(listCovers)) {
    covers[code] = cover
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    groupImages: vip,
    covers,
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n', 'utf8')

  const vipCount = Object.keys(vip).length
  const coverCount = Object.keys(covers).length
  console.log(
    `[image-manifest] wrote ${path.relative(ROOT, OUT)} — ` +
      `${vipCount} VIP galleries, ${coverCount} card covers`,
  )
}

main()
