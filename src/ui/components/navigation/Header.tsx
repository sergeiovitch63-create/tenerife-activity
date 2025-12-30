'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname, Link } from '@/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Container } from '@/ui/components/layout'
import { cn } from '@/ui/lib/cn'
import { LanguageDropdown } from './LanguageDropdown'
import { HeaderSearch } from '@/ui/components/search'

export function Header() {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('nav')
  const tHome = useTranslations('home')
  const tCommon = useTranslations('common')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isHeroVisible, setIsHeroVisible] = useState(true)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false)
        } else {
          setIsMobileMenuOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isSearchOpen])

  // Close mobile menu on outside click
  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-mobile-menu]') && !target.closest('[data-mobile-menu-button]')) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [isMobileMenuOpen])

  // Observe hero visibility for header background switch
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const heroElement = document.getElementById('hero')
    if (!heroElement) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsHeroVisible(entry.isIntersecting)
        })
      },
      {
        threshold: 0,
        rootMargin: '0px',
      }
    )

    observer.observe(heroElement)
    return () => observer.disconnect()
  }, [])

  const NavLink = ({
    href,
    children,
  }: {
    href: string
    children: React.ReactNode
  }) => {
    const isActive = pathname === href
    return (
      <Link
        href={href}
        className={cn(
          'text-base font-medium transition-colors',
          isHeroVisible
            ? // White background: dark text
              cn(
                isActive
                  ? 'text-slate-900 border-b-2 border-slate-900 pb-1'
                  : 'text-slate-700 hover:text-slate-900'
              )
            : // Transparent background: white text
              cn(
                'drop-shadow-sm',
                isActive
                  ? 'text-white border-b-2 border-white pb-1'
                  : 'text-white/90 hover:text-white'
              )
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        {children}
      </Link>
    )
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300',
        isHeroVisible
          ? 'bg-white/95 backdrop-blur-sm border-b border-slate-200/50'
          : 'bg-transparent'
      )}
      style={!isHeroVisible ? { backdropFilter: 'none' } : undefined}
    >
      <div className="w-full px-2 md:px-4">
        <div className="flex items-center justify-between h-[80px] md:h-[90px] flex-nowrap whitespace-nowrap">
          {/* Brand - Left Group */}
          <Link
            href="/"
            className="flex items-center flex-shrink-0"
          >
            <div className="h-[62px] md:h-[70px] lg:h-[78px] w-auto flex items-center flex-shrink-0 overflow-visible">
              <Image
                src="/logo.png"
                alt={tCommon('siteName')}
                width={280}
                height={112}
                className="h-full w-auto object-contain"
                style={{
                  background: 'transparent',
                  transform: 'scale(2.35)',
                  transformOrigin: 'left center',
                }}
                sizes="(max-width: 768px) 300px, (max-width: 1024px) 400px, 500px"
                priority
              />
            </div>
          </Link>

          {/* Right Group - Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/must-see">{t('mustSee')}</NavLink>
            <NavLink href="/get-inspired">{t('getInspired')}</NavLink>
            <NavLink href="/contact">{t('contact')}</NavLink>
            {/* Search Icon */}
            <button
              data-search-button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                'p-2 transition-colors',
                isHeroVisible
                  ? 'text-slate-900 hover:text-slate-700'
                  : 'text-white hover:text-ocean-200'
              )}
              aria-label={tCommon('search')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <LanguageDropdown isHeroVisible={isHeroVisible} />
          </nav>

          {/* Mobile: Search Icon, Language Switcher, and Menu Button */}
          <div className="md:hidden flex items-center gap-1.5 min-w-0">
            {/* Search Icon */}
            <button
              data-search-button
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                'p-2 transition-colors flex-shrink-0',
                isHeroVisible
                  ? 'text-slate-900 hover:text-slate-700'
                  : 'text-white hover:text-ocean-200'
              )}
              aria-label={tCommon('search')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {/* Language Dropdown - Mobile */}
            <LanguageDropdown isHeroVisible={isHeroVisible} />
            {/* Mobile Menu Button */}
            <button
              data-mobile-menu-button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                'p-2 transition-colors flex-shrink-0',
                isHeroVisible
                  ? 'text-slate-900 hover:text-slate-700'
                  : 'text-white hover:text-ocean-200'
              )}
              aria-label={t('toggleMenu')}
              aria-expanded={isMobileMenuOpen}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {isMobileMenuOpen && (
          <div
            data-mobile-menu
            className={cn(
              'md:hidden absolute top-[80px] left-0 right-0 shadow-lg',
              isHeroVisible
                ? 'bg-white/95 backdrop-blur-sm border-b border-slate-200/50'
                : 'bg-transparent'
            )}
            style={!isHeroVisible ? { backdropFilter: 'none' } : undefined}
          >
            <nav className="flex flex-col py-4">
              <Container size="lg" padding={true}>
                <div className="flex flex-col gap-4">
                  <NavLink href="/must-see">{t('mustSee')}</NavLink>
                  <NavLink href="/get-inspired">{t('getInspired')}</NavLink>
                  <NavLink href="/contact">{t('contact')}</NavLink>
                </div>
              </Container>
            </nav>
          </div>
        )}
      </div>
      
      {/* Search Modal */}
      <HeaderSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        placeholder={tHome('searchPlaceholder')}
      />
    </header>
  )
}
