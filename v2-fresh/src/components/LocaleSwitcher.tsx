'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Globe, Check } from 'lucide-react'
import { locales, localeLabels, type Locale } from '@/lib/locale'
import { useI18n } from '@/i18n/context'

export default function LocaleSwitcher() {
  const { locale } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const swap = (next: Locale) => {
    if (next === locale) {
      setOpen(false)
      return
    }
    document.cookie = `locale=${next};path=/;max-age=31536000`
    const segments = pathname.split('/').filter(Boolean)
    if (segments[0] && (locales as readonly string[]).includes(segments[0])) {
      segments[0] = next
    } else {
      segments.unshift(next)
    }
    router.push('/' + segments.join('/'))
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-700 hover:bg-ink-50"
      >
        <Globe className="w-4 h-4" />
        <span className="uppercase">{locale}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 card p-1 z-50">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => swap(loc)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-ink-50"
            >
              <span>{localeLabels[loc].flag}</span>
              <span className="flex-1 text-left">{localeLabels[loc].native}</span>
              {loc === locale && <Check className="w-4 h-4 text-brand-turquoise-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
