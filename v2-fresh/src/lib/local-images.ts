/**
 * Local image lookups — backed by a build-time-generated manifest.
 *
 * The manifest is produced by `scripts/build-image-manifest.mjs` (wired
 * via `prebuild` in package.json) and committed to the repo. At runtime
 * we do a pure object lookup — NO fs access — which is critical because
 * @vercel/nft cannot statically resolve `fs.readdirSync(process.cwd() + …)`
 * and, when it fails, bundles the whole traced directory into every
 * serverless function. With a 439 MB `public/images/` tree, that used to
 * push the route bundle past Vercel's 300 MB function-size limit.
 *
 * Images themselves continue to be served by Next.js's static asset
 * pipeline (CDN), exactly as before.
 *
 * Priority order for card covers:
 *   1) /public/images/tours-list/{code}/(cover.*|first file)
 *   2) first frame of /public/images/pictures/tours-vip/{code}/…
 *
 * For the detail-page gallery we only use the tours-vip set.
 */

import manifest from './local-images-manifest.json' assert { type: 'json' }

type Manifest = {
  generatedAt: string
  groupImages: Record<string, string[]>
  covers: Record<string, string>
}

const MANIFEST = manifest as Manifest

/**
 * Returns the VIP gallery (multiple images) for the detail page.
 * Does NOT include the tours-list cover.
 */
export function getLocalGroupImages(groupCode: string): string[] {
  if (!groupCode) return []
  return MANIFEST.groupImages[groupCode] ?? []
}

/** Dedicated card cover for a group, if any. */
export function getLocalCover(groupCode: string): string | null {
  if (!groupCode) return null
  return MANIFEST.covers[groupCode] ?? null
}

/** Batch variant used by listings. */
export function getLocalCovers(codes: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of codes) {
    const v = MANIFEST.covers[c]
    if (v) out[c] = v
  }
  return out
}
