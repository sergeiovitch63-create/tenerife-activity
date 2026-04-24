'use client'

import Logo from './Logo'
import LocaleLink from './LocaleLink'
import { useI18n } from '@/i18n/context'
import { ShieldCheck, Globe, Headset, Sparkles } from 'lucide-react'
import type { AtlanticoClassification } from '@/lib/atlantico/types'

export default function Footer({ categories = [] }: { categories?: AtlanticoClassification[] }) {
  const { t } = useI18n()
  return (
    <footer className="bg-ink-900 text-ink-200 mt-24">
      <div className="container-x py-16">
        <div className="grid lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-12">
          <div>
            <div className="text-white">
              <Logo />
            </div>
            <p className="text-sm text-ink-400 mt-4 max-w-xs">{t.footer.tagline}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
              <span className="flex items-center gap-2 text-ink-300">
                <ShieldCheck className="w-4 h-4 text-brand-turquoise-400" /> {t.footer.security}
              </span>
              <span className="flex items-center gap-2 text-ink-300">
                <Headset className="w-4 h-4 text-brand-turquoise-400" /> {t.footer.support}
              </span>
              <span className="flex items-center gap-2 text-ink-300">
                <Globe className="w-4 h-4 text-brand-turquoise-400" /> 6 {t.footer.languages}
              </span>
              <span className="flex items-center gap-2 text-ink-300">
                <Sparkles className="w-4 h-4 text-brand-turquoise-400" /> Teo {t.nav.aiGuide}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">{t.footer.explore}</h4>
            <ul className="space-y-2 text-sm">
              <li><LocaleLink href="/activites" className="hover:text-white">{t.nav.allActivities}</LocaleLink></li>
              <li><LocaleLink href="/#teo" className="hover:text-white">{t.nav.aiGuide}</LocaleLink></li>
              <li><LocaleLink href="/panier" className="hover:text-white">{t.nav.cart}</LocaleLink></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">{t.footer.categories}</h4>
            <ul className="space-y-2 text-sm">
              {categories.slice(0, 7).map((c) => (
                <li key={c.id}>
                  <LocaleLink href={`/categorie/${c.code}`} className="hover:text-white">
                    {c.name}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">{t.footer.trust}</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-white cursor-pointer">{t.footer.trustItems.freeCancel}</span></li>
              <li><span className="hover:text-white cursor-pointer">{t.footer.trustItems.bestPrice}</span></li>
              <li><span className="hover:text-white cursor-pointer">{t.footer.trustItems.terms}</span></li>
              <li><span className="hover:text-white cursor-pointer">{t.footer.trustItems.privacy}</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-ink-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-ink-500">
          <span>В© {new Date().getFullYear()} {t.footer.copyright}</span>
          <span className="flex items-center gap-3">
            <span>{t.footer.payments}</span>
            <span className="inline-flex items-center gap-1">
              <span className="px-2 py-1 rounded-md bg-ink-800 text-ink-200">Visa</span>
              <span className="px-2 py-1 rounded-md bg-ink-800 text-ink-200">MC</span>
              <span className="px-2 py-1 rounded-md bg-ink-800 text-ink-200">Amex</span>
              <span className="px-2 py-1 rounded-md bg-ink-800 text-ink-200">Apple Pay</span>
            </span>
          </span>
        </div>
      </div>
    </footer>
  )
}
