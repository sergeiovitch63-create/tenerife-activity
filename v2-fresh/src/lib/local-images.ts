import 'server-only'
import fs from 'fs'
import path from 'path'

/**
 * Local image sources (priority order for CARDS):
 *  1) /public/images/tours-list/{code}/cover.png   → dedicated card cover
 *  2) /public/images/pictures/tours-vip/{code}/*   → first VIP screenshot (detail gallery)
 *
 * For the DETAIL PAGE GALLERY we only use tours-vip (a dedicated set of 3-5 screenshots).
 */

const VIP_SUBVARIANTS = ['groups-details', 'group-details']

function safeExists(p: string): boolean {
  try { return fs.existsSync(p) } catch { return false }
}

function readImages(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
      .sort()
  } catch {
    return []
  }
}

/**
 * Returns the VIP gallery (multiple images) for the detail page.
 * Does NOT include the tours-list cover.
 */
export function getLocalGroupImages(groupCode: string): string[] {
  if (!groupCode || !/^[\w-]+$/.test(groupCode)) return []
  const baseDir = path.join(
    process.cwd(), 'public', 'images', 'pictures', 'tours-vip', groupCode,
  )
  if (!safeExists(baseDir)) return []
  for (const sub of VIP_SUBVARIANTS) {
    const dir = path.join(baseDir, sub)
    if (!safeExists(dir)) continue
    const files = readImages(dir)
    if (files.length > 0) {
      return files.map((f) =>
        `/images/pictures/tours-vip/${groupCode}/${sub}/${encodeURIComponent(f)}`,
      )
    }
  }
  // Fallback: files directly under the group folder
  const files = readImages(baseDir)
  return files.map((f) => `/images/pictures/tours-vip/${groupCode}/${encodeURIComponent(f)}`)
}

/** Returns the dedicated card cover for a group, if any. */
function findListCover(groupCode: string): string | null {
  if (!groupCode || !/^[\w-]+$/.test(groupCode)) return null
  const dir = path.join(process.cwd(), 'public', 'images', 'tours-list', groupCode)
  if (!safeExists(dir)) return null
  const files = readImages(dir)
  if (files.length === 0) return null
  // Prefer exactly "cover.*" if present, otherwise the first file
  const preferred = files.find((f) => /^cover\.(png|jpe?g|webp)$/i.test(f)) ?? files[0]
  return `/images/tours-list/${groupCode}/${encodeURIComponent(preferred)}`
}

/**
 * Build a single map { code → coverUrl } once per process, merging both sources.
 * tours-list beats tours-vip (since tours-list images are hand-picked for cards).
 */
let _coversCache: Record<string, string> | null = null
function allCovers(): Record<string, string> {
  if (_coversCache) return _coversCache
  const out: Record<string, string> = {}

  // tours-vip — use first image as a fallback cover
  const vipDir = path.join(process.cwd(), 'public', 'images', 'pictures', 'tours-vip')
  if (safeExists(vipDir)) {
    try {
      for (const code of fs.readdirSync(vipDir)) {
        if (!/^[\w-]+$/.test(code)) continue
        const imgs = getLocalGroupImages(code)
        if (imgs.length > 0) out[code] = imgs[0]
      }
    } catch { /* ignore */ }
  }

  // tours-list — overrides vip when present (dedicated card cover)
  const listDir = path.join(process.cwd(), 'public', 'images', 'tours-list')
  if (safeExists(listDir)) {
    try {
      for (const code of fs.readdirSync(listDir)) {
        if (!/^[\w-]+$/.test(code)) continue
        const cover = findListCover(code)
        if (cover) out[code] = cover
      }
    } catch { /* ignore */ }
  }

  _coversCache = out
  return out
}

export function getLocalCover(groupCode: string): string | null {
  return allCovers()[groupCode] ?? null
}

export function getLocalCovers(codes: string[]): Record<string, string> {
  const all = allCovers()
  const out: Record<string, string> = {}
  for (const c of codes) if (all[c]) out[c] = all[c]
  return out
}
