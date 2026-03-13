/**
 * Server-side: fetch group names for cart items.
 * Used by cart page to pre-render names on first paint.
 */

import { getGroupDetails } from '@/lib/atlantico'
import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'

const CONCURRENCY = 4

type GroupNameKey = string // `${t_group}:${lang}`

async function fetchName(tGroup: string, lang: string): Promise<string | null> {
  try {
    const details = await getGroupDetails(tGroup, lang)
    const name = (details.name ?? details.Name) as string | undefined
    return name ? decodeTextFromApi(name) : null
  } catch {
    return null
  }
}

/**
 * Fetch group names for unique (t_group, language) pairs.
 * Returns map keyed by `${t_group}:${lang}`.
 */
export async function fetchGroupNamesForCart(
  items: Array<{ t_group: string; language: string }>
): Promise<Record<GroupNameKey, string>> {
  const seen = new Set<string>()
  const toFetch: Array<{ t_group: string; lang: string; key: GroupNameKey }> = []
  for (const { t_group, language } of items) {
    const key = `${t_group}:${language}` as GroupNameKey
    if (seen.has(key)) continue
    seen.add(key)
    toFetch.push({ t_group, lang: language, key })
  }
  if (toFetch.length === 0) return {}

  const results: Record<GroupNameKey, string> = {}
  const queue = [...toFetch]
  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) break
      const name = await fetchName(item.t_group, item.lang)
      if (name) results[item.key] = name
    }
  }
  const workers = Array(Math.min(CONCURRENCY, toFetch.length))
    .fill(null)
    .map(() => worker())
  await Promise.all(workers)
  return results
}
