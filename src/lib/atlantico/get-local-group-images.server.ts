/**
 * Server-only: Read hero images from public/images/pictures/tours-vip/{code}/
 * Supports:
 *   - {code}/group-details/  (preferred) - put all photos here, any filenames
 *   - {code}/               (fallback)  - group-details-1.jpg, etc.
 * No scan needed - images appear as soon as you drop them. No limit.
 */

import fs from 'fs'
import path from 'path'

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i
const BASE = 'images/pictures/tours-vip'

function listImagesInDir(dir: string, basePath: string): string[] {
  if (!fs.existsSync(dir)) return []
  try {
    const files = fs.readdirSync(dir)
      .filter((f) => IMAGE_EXT.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/(\d+)/)?.[1] ?? '0', 10)
        const numB = parseInt(b.match(/(\d+)/)?.[1] ?? '0', 10)
        if (numA !== numB) return numA - numB
        return a.localeCompare(b)
      })
    return files.map((f) => `${basePath}/${f}`)
  } catch {
    return []
  }
}

export function getLocalGroupImages(code: string): string[] {
  if (!code || typeof code !== 'string') return []
  const trimmed = code.trim()
  const baseDir = path.join(process.cwd(), 'public', BASE, trimmed)
  // Prefer group-details or groups-details subfolder
  const subDirs = ['group-details', 'groups-details']
  let urls: string[] = []
  for (const sub of subDirs) {
    const subDir = path.join(baseDir, sub)
    urls = listImagesInDir(subDir, `/${BASE}/${trimmed}/${sub}`)
    if (urls.length > 0) break
  }
  if (urls.length === 0) {
    urls = listImagesInDir(baseDir, `/${BASE}/${trimmed}`)
  }
  return urls
}
