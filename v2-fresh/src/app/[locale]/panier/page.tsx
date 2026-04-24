'use client'

import Image from 'next/image'
import { ArrowRight, ShoppingBag, Trash2, Minus, Plus, Calendar, Sparkles } from 'lucide-react'
import LocaleLink from '@/components/LocaleLink'
import { useCart } from '@/lib/cart'
import { useI18n } from '@/i18n/context'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const { items, remove, update, subtotal } = useCart()
  const { t, locale } = useI18n()
  const total = subtotal

  return (
    <div className="container-x py-10">
      <nav className="text-xs text-ink-500 mb-3">
        <LocaleLink href="/" className="hover:text-ink-800">{t.activity.breadcrumbHome}</LocaleLink>
        <span className="mx-1.5">/</span>
        <span className="text-ink-700">{t.nav.cart}</span>
      </nav>

      <h1 className="h-display text-4xl md:text-5xl mb-8">{t.cart.title}</h1>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-ink-50 flex items-center justify-center">
            <ShoppingBag className="w-7 h-7 text-ink-400" />
          </div>
          <h2 className="text-xl font-display font-bold">{t.cart.empty}</h2>
          <p className="text-ink-500 mt-2">{t.cart.emptyHint}</p>
          <LocaleLink href="/activites" className="btn-primary mt-6 inline-flex">
            {t.cart.explore} <ArrowRight className="w-4 h-4" />
          </LocaleLink>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
          <ul className="space-y-4">
            {items.map((it) => {
              const lineTotal = it.unitAdult * it.adults + it.unitChild * it.children + it.unitInfant * (it.infants ?? 0)
              return (
                <li key={it.itemId} className="card p-4 md:p-5 flex gap-4">
                  {it.activityImage && (
                    <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-xl overflow-hidden flex-shrink-0">
                      <Image src={it.activityImage} alt="" fill sizes="(min-width: 768px) 144px, 112px" className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <LocaleLink href={`/activite/${it.groupCode}`} className="font-semibold hover:underline line-clamp-2 text-ink-900">
                          {it.activityTitle}
                        </LocaleLink>
                        <p className="text-xs text-ink-500 mt-0.5">{it.optionTitle}</p>
                      </div>
                      <button onClick={() => remove(it.itemId)} className="text-ink-500 hover:text-brand-gold-600 p-1" aria-label={t.cart.remove}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <label className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5">
                        <Calendar className="w-3.5 h-3.5 text-ink-400" />
                        <input
                          type="date"
                          value={it.date}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => update(it.itemId, { date: e.target.value })}
                          className="outline-none bg-transparent text-xs"
                        />
                      </label>
                      <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1">
                        <span className="text-xs text-ink-500">{t.activity.adults}</span>
                        <button onClick={() => update(it.itemId, { adults: Math.max(1, it.adults - 1) })} className="w-6 h-6 rounded-full border border-ink-200 inline-flex items-center justify-center hover:bg-ink-50">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold w-4 text-center">{it.adults}</span>
                        <button onClick={() => update(it.itemId, { adults: it.adults + 1 })} className="w-6 h-6 rounded-full border border-ink-200 inline-flex items-center justify-center hover:bg-ink-50">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      {it.unitChild > 0 && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1">
                          <span className="text-xs text-ink-500">{t.activity.children}</span>
                          <button onClick={() => update(it.itemId, { children: Math.max(0, it.children - 1) })} className="w-6 h-6 rounded-full border border-ink-200 inline-flex items-center justify-center hover:bg-ink-50">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold w-4 text-center">{it.children}</span>
                          <button onClick={() => update(it.itemId, { children: it.children + 1 })} className="w-6 h-6 rounded-full border border-ink-200 inline-flex items-center justify-center hover:bg-ink-50">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-ink-500">
                        {it.adults} Г— {formatPrice(it.unitAdult, locale)}
                        {it.children > 0 && ` + ${it.children} Г— ${formatPrice(it.unitChild, locale)}`}
                      </span>
                      <span className="text-lg font-display font-bold">{formatPrice(lineTotal, locale)}</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <aside className="card p-6 h-fit sticky top-20">
            <h3 className="font-display text-xl font-bold mb-4">{t.cart.summary}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between pt-1 font-bold text-lg">
                <span>{t.cart.total}</span><span>{formatPrice(total, locale)}</span>
              </div>
            </div>
            <LocaleLink href="/checkout" className="btn-gold w-full justify-center text-base py-3.5 mt-5">
              {t.cart.checkout} <ArrowRight className="w-4 h-4" />
            </LocaleLink>
            <div className="mt-4 rounded-xl border border-brand-turquoise-100 bg-brand-turquoise-50/60 p-3 text-xs text-brand-turquoise-900 flex gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-turquoise-600" />
              <span>{t.cart.guarantee}</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
