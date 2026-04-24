'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { X, ShoppingBag, Trash2, ArrowRight } from 'lucide-react'
import LocaleLink from './LocaleLink'
import { useCart } from '@/lib/cart'
import { useI18n } from '@/i18n/context'
import { formatPrice } from '@/lib/utils'

export default function CartDrawer() {
  const { openDrawer, setOpenDrawer, items, subtotal, remove } = useCart()
  const { t, locale } = useI18n()

  return (
    <AnimatePresence>
      {openDrawer && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenDrawer(false)}
            className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] bg-white flex flex-col shadow-card"
          >
            <div className="flex items-center justify-between p-5 border-b border-ink-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <h2 className="font-display font-bold">{t.cart.title}</h2>
                <span className="chip">{items.length}</span>
              </div>
              <button
                onClick={() => setOpenDrawer(false)}
                className="p-2 rounded-lg hover:bg-ink-50"
                aria-label={t.nav.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-8 text-center text-ink-500">
                  <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-ink-50 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-ink-400" />
                  </div>
                  <p className="text-sm">{t.cart.empty}</p>
                  <p className="text-xs mt-1 text-ink-400">{t.cart.emptyHint}</p>
                  <LocaleLink
                    href="/activites"
                    onClick={() => setOpenDrawer(false)}
                    className="mt-6 inline-flex btn-primary"
                  >
                    {t.cart.explore}
                  </LocaleLink>
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {items.map((it) => {
                    const total = it.unitAdult * it.adults + it.unitChild * it.children + it.unitInfant * (it.infants ?? 0)
                    return (
                      <li key={it.itemId} className="p-4 flex gap-3">
                        {it.activityImage && (
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                            <Image src={it.activityImage} alt="" fill sizes="80px" className="object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <LocaleLink
                            href={`/activite/${it.groupCode}`}
                            onClick={() => setOpenDrawer(false)}
                            className="text-sm font-semibold line-clamp-2 hover:underline"
                          >
                            {it.activityTitle}
                          </LocaleLink>
                          <p className="text-xs text-ink-500 mt-0.5">{it.optionTitle}</p>
                          <p className="text-xs text-ink-500">
                            {it.date} · {it.adults} {t.activity.adults.toLowerCase()}
                            {it.children > 0 ? ` · ${it.children} ${t.activity.children.toLowerCase()}` : ''}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold">{formatPrice(total, locale)}</span>
                            <button
                              onClick={() => remove(it.itemId)}
                              className="text-xs text-ink-500 hover:text-ember-600 inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {t.cart.remove}
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-ink-100 p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">{t.cart.subtotal}</span>
                  <span className="font-bold text-lg">{formatPrice(subtotal, locale)}</span>
                </div>
                <LocaleLink
                  href="/checkout"
                  onClick={() => setOpenDrawer(false)}
                  className="btn-ember w-full justify-center text-base py-3.5"
                >
                  {t.cart.checkout} <ArrowRight className="w-4 h-4" />
                </LocaleLink>
                <LocaleLink
                  href="/panier"
                  onClick={() => setOpenDrawer(false)}
                  className="btn-ghost w-full justify-center text-sm"
                >
                  {t.cart.viewFull}
                </LocaleLink>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
