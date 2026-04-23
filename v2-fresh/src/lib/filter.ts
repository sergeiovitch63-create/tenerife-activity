import type { AtlanticoGroup } from './atlantico/types'

export function applyFilters(
  list: AtlanticoGroup[],
  params: { q?: string; max?: string; sort?: string },
): AtlanticoGroup[] {
  let res = [...list]
  if (params.q) {
    const needle = params.q.toLowerCase()
    res = res.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        (a.desc ?? '').toLowerCase().includes(needle),
    )
  }
  if (params.max) {
    const m = parseInt(params.max, 10)
    if (!Number.isNaN(m)) {
      res = res.filter((a) => {
        const p = a.price ? parseFloat(a.price) : 0
        return p <= m
      })
    }
  }
  switch (params.sort) {
    case 'price-asc':
      res.sort((a, b) => (parseFloat(a.price ?? '0') || 0) - (parseFloat(b.price ?? '0') || 0))
      break
    case 'price-desc':
      res.sort((a, b) => (parseFloat(b.price ?? '0') || 0) - (parseFloat(a.price ?? '0') || 0))
      break
    case 'rating':
      res.sort((a, b) => (Number(b.recom ?? 0) || 0) - (Number(a.recom ?? 0) || 0))
      break
    default:
      // keep API order (recommended)
      break
  }
  return res
}
