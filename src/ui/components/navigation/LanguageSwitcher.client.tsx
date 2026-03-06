'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/navigation'
import { useSearchParams } from 'next/navigation'
import { LOCALES } from '@/i18n/locales'
import { type Locale } from '@/i18n/request'
import { cn } from '@/ui/lib/cn'

export function LanguageSwitcher({
  className,
  isHeroVisible = false,
}: {
  className?: string
  isHeroVisible?: boolean
}) {
  const currentLocaleCode = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleLocaleChange = (newLocale: string) => {
    // Preserve search params (e.g., ?code=508) when changing language
    const currentParams = new URLSearchParams(searchParams.toString())
    const queryString = currentParams.toString()
    const newPath = queryString ? `${pathname}?${queryString}` : pathname
    
    // Use next-intl router which automatically handles locale prefixes
    router.replace(newPath, { locale: newLocale as Locale })
  }

  return (
    <div className={cn('flex items-center gap-1 flex-nowrap', className)}>
      {LOCALES.map((localeInfo) => {
        const isActive = currentLocaleCode === localeInfo.code
        return (
          <button
            key={localeInfo.code}
            onClick={() => handleLocaleChange(localeInfo.code)}
            className={cn(
              'px-2 py-1 text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap',
              isHeroVisible
                ? // White background: dark text
                  isActive
                    ? 'text-slate-900 border-b-2 border-slate-900'
                    : 'text-slate-700 hover:text-slate-900'
                : // Transparent background: original colors
                  isActive
                    ? 'text-ocean-700 border-b-2 border-ocean-700'
                    : 'text-glass-700 hover:text-ocean-600'
            )}
          >
            {localeInfo.label}
          </button>
        )
      })}
    </div>
  )
}
