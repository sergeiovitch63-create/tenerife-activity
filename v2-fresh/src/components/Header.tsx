'use client'

import { useEffect, useState } from 'react'
import { Search, ShoppingBag, Heart, Menu, X, ChevronDown } from 'lucide-react'
import Logo from './Logo'
import LocaleLink from './LocaleLink'
import LocaleSwitcher from './LocaleSwitcher'
import { useCart } from '@/lib/cart'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import type { AtlanticoClassification } from '@/lib/atlantico/types'
import { themeFor } from '@/lib/category-theme'
import { cleanText } from '@/lib/atlantico/normalize'

export default function Header({ categories = [] }: { categories?: AtlanticoClassification[] }) {
  const { count, setOpenDrawer } = useCart()
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [openCats, setOpenCats] = useState(false)
  const [openMobile, setOpenMobile] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all',
        scrolled ? 'bg-white/85 backdrop-blur-xl border-b border-ink-100' : 'bg-white',
      )}
    >
      <div className="container-x flex h-16 items-center gap-4">
        <Logo />

        <nav className="hidden md:flex items-center gap-1 ml-6 text-sm font-medium text-ink-700">
          {categories.length > 0 && (
            <div
              onMouseEnter={() => setOpenCats(true)}
              onMouseLeave={() => setOpenCats(false)}
              className="relative"
            >
              <button className="px-3 py-2 rounded-lg hover:text-ink-900 hover:bg-ink-50 inline-flex items-center gap-1">
                {t.nav.categories} <ChevronDown className="w-4 h-4" />
              </button>
              {openCats && (
                <div className="absolute left-0 top-full pt-2 w-[640px]">
                  <div className="card p-4 grid grid-cols-2 gap-1">
                    {categories.map((c) => {
                      const theme = themeFor(c.id)
                      return (
                        <LocaleLink
                          key={c.id}
                          href={`/categorie/${c.code}`}
                          className="flex items-center gap-3 rounded-xl p-2 hover:bg-ink-50"
                        >
                          <span
                            className="flex-shrink-0 w-8 h-8 rounded-lg"
                            style={{
                              background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                            }}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink-900 truncate">
                              {c.name}
                            </span>
                            <span className="block text-xs text-ink-500 line-clamp-1">
                              {cleanText(c.desc)}
                            </span>
                          </span>
                        </LocaleLink>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <LocaleLink className="px-3 py-2 rounded-lg hover:text-ink-900 hover:bg-ink-50" href="/activites">
            {t.nav.allActivities}
          </LocaleLink>
          <LocaleLink className="px-3 py-2 rounded-lg hover:text-ink-900 hover:bg-ink-50" href="/#teo">
            {t.nav.aiGuide}
          </LocaleLink>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <LocaleLink
            href="/activites"
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-700 hover:bg-ink-50"
          >
            <Search className="w-4 h-4" /> {t.nav.search}
          </LocaleLink>
          <LocaleSwitcher />
          <button className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-700 hover:bg-ink-50">
            <Heart className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOpenDrawer(true)}
            className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-ink-900 hover:bg-ink-50"
            aria-label={t.nav.cart}
          >
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-ember-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
          <button
            onClick={() => setOpenMobile((v) => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-ink-50"
            aria-label={t.nav.menu}
          >
            {openMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {openMobile && (
        <div className="md:hidden border-t border-ink-100 bg-white">
          <div className="container-x py-4 flex flex-col gap-1">
            <LocaleLink href="/activites" className="px-3 py-2 rounded-lg hover:bg-ink-50 text-sm font-medium">
              {t.nav.allActivities}
            </LocaleLink>
            {categories.slice(0, 10).map((c) => (
              <LocaleLink
                key={c.id}
                href={`/categorie/${c.code}`}
                className="px-3 py-2 rounded-lg hover:bg-ink-50 text-sm"
              >
                {c.name}
              </LocaleLink>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
