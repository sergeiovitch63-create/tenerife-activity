/**
 * Export all experiences into a flat JSON file for the Marco quiz.
 *
 * Usage (from project root):
 *   pnpm ts-node scripts/export-all-experiences-for-quiz.ts
 *
 * The script will generate:
 *   src/data/all-experiences-for-quiz.json
 */

import { writeFile } from 'fs/promises'
import { resolve } from 'path'
import { experienceRepository } from '../src/config/repositories'

async function main() {
  console.log('[export-all-experiences-for-quiz] Fetching experiences...')

  const experiences = await experienceRepository.findAll()

  const simplified = experiences.map((exp) => {
    const firstImage =
      (Array.isArray((exp as any).imageUrls) && (exp as any).imageUrls[0]) ||
      (exp as any).imageUrl ||
      null

    return {
      id: exp.id,
      slug: exp.slug,
      title: exp.title,
      shortDescription: exp.shortDescription ?? null,
      description: exp.description ?? null,
      price: (exp as any).price ?? null,
      currency: (exp as any).currency ?? 'EUR',
      location: (exp as any).location ?? null,
      duration: (exp as any).duration ?? null,
      vibeId: (exp as any).vibeId ?? null,
      imageUrl: firstImage,
    }
  })

  const outputPath = resolve(
    process.cwd(),
    'src',
    'data',
    'all-experiences-for-quiz.json',
  )

  await writeFile(outputPath, JSON.stringify(simplified, null, 2), 'utf8')

  console.log(
    `[export-all-experiences-for-quiz] Exported ${simplified.length} experiences to ${outputPath}`,
  )
}

main().catch((err) => {
  console.error('[export-all-experiences-for-quiz] Failed:', err)
  process.exit(1)
})

