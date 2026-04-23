'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ArrowDownUp, X } from 'lucide-react'
import { useI18n } from '@/i18n/context'

export default function FilterBar({
  total,
  categoryName,
}: {
  total: number
  categoryName?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { t } = useI18n()

  const sort = params.get('sort') ?? 'recommanded'
  const max = params.get('max') ?? ''

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`${pathname}?${p.toString()}`)
  }
  const clear = () => router.push(pathname)

  return (
    <div className="flex flex-wrap items-center gap-2 py-4">
      <span className="text-sm text-ink-600 mr-2">
        <strong className="text-ink-900">{total}</strong>{' '}
        {total > 1 ? t.listing.foundPlural : t.listing.found}
        {categoryName ? ` · ${categoryName}` : ''}
      </span>
      <span className="ml-auto flex flex-wrap gap-2">
        <label className="flex items-center gap-2 border border-ink-200 rounded-full px-3 py-1.5 text-sm bg-white">
          <span className="text-ink-500 text-xs">{t.listing.maxPrice}</span>
          <select value={max} onChange={(e) => setParam('max', e.target.value)} className="bg-transparent outline-none">
            <option value="">{t.listing.all}</option>
            <option value="50">50 €</option>
            <option value="100">100 €</option>
            <option value="200">200 €</option>
            <option value="500">500 €</option>
          </select>
        </label>

        <label className="flex items-center gap-2 border border-ink-200 rounded-full px-3 py-1.5 text-sm bg-white">
          <ArrowDownUp className="w-4 h-4 text-ink-500" />
          <select value={sort} onChange={(e) => setParam('sort', e.target.value)} className="bg-transparent outline-none">
            <option value="recommanded">{t.listing.sort.recommanded}</option>
            <option value="price-asc">{t.listing.sort.priceAsc}</option>
            <option value="price-desc">{t.listing.sort.priceDesc}</option>
            <option value="rating">{t.listing.sort.rating}</option>
          </select>
        </label>

        {(max || sort !== 'recommanded') && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1 border border-ink-200 rounded-full px-3 py-1.5 text-sm text-ink-600 hover:text-ink-900 hover:border-ink-300 bg-white"
          >
            <X className="w-3.5 h-3.5" /> {t.listing.clearFilters}
          </button>
        )}
      </span>
    </div>
  )
}
