'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/navigation'
import { LOCALES, getLocaleInfo } from '@/i18n/locales'
import { type Locale } from '@/i18n/request'
import { cn } from '@/ui/lib/cn'

interface LanguageDropdownProps {
  isHeroVisible?: boolean
  className?: string
}

export function LanguageDropdown({ isHeroVisible = false, className }: LanguageDropdownProps) {
  const currentLocaleCode = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const currentLocale = getLocaleInfo(currentLocaleCode || 'en')

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    // Delay to avoid immediate close when opening
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside)
    }, 100)

    return () => {
      window.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  const handleLocaleChange = (newLocale: string) => {
    // Use next-intl router which automatically handles locale prefixes
    // The pathname from @/navigation is already locale-aware
    // We just need to push the same path with the new locale
    router.replace(pathname, { locale: newLocale as Locale })
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          isHeroVisible
            ? // White background: dark text
              cn(
                'text-slate-900 hover:bg-slate-100',
                'focus:ring-slate-500',
                isOpen && 'bg-slate-100'
              )
            : // Transparent background: white text
              cn(
                'text-white hover:bg-white/10',
                'focus:ring-white/50',
                isOpen && 'bg-white/10'
              )
        )}
      >
        <span className="text-base leading-none">{currentLocale.flag}</span>
        <span className="text-sm font-medium">{currentLocale.code}</span>
        <svg
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="menu"
          className={cn(
            'absolute top-full right-0 mt-1 min-w-[140px] rounded-lg shadow-lg',
            'bg-white/95 backdrop-blur-sm border border-slate-200/50',
            'overflow-hidden z-50',
            'animate-[fadeInDropdown_200ms_ease-out_forwards]',
            'md:right-0'
          )}
          style={{
            maxWidth: 'min(calc(100vw - 2rem), 200px)',
            right: 0,
          }}
        >
          <div className="py-1">
            {LOCALES.map((localeInfo) => {
              const isActive = currentLocaleCode === localeInfo.code
              
              return (
                <button
                  key={localeInfo.code}
                  role="menuitem"
                  onClick={() => handleLocaleChange(localeInfo.code)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left',
                    'text-sm font-medium transition-colors',
                    'focus:outline-none focus:bg-slate-50',
                    isActive
                      ? 'bg-slate-50 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span className="text-base leading-none">{localeInfo.flag}</span>
                  <span className="flex-1">{localeInfo.label}</span>
                  {isActive && (
                    <svg
                      className="w-4 h-4 text-slate-500"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

