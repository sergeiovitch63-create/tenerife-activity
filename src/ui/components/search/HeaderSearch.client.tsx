'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/ui/lib/cn'
import { trackingProvider } from '@/config/tracking'

interface HeaderSearchProps {
  isOpen: boolean
  onClose: () => void
  placeholder?: string
}

export function HeaderSearch({ isOpen, onClose, placeholder }: HeaderSearchProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const t = useTranslations('common')
  const tHome = useTranslations('home')
  const tCommon = useTranslations('common')
  const displayPlaceholder = placeholder || tHome('searchPlaceholder')

  // Autofocus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-search-modal]')) return
      if (target.closest('[data-search-button]')) return
      onClose()
    }

    // Delay to avoid immediate close when opening
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside)
    }, 100)

    return () => {
      window.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus trap: keep focus within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const modal = modalRef.current
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    modal.addEventListener('keydown', handleTabKey)
    return () => modal.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const trimmedQuery = query.trim()
    trackingProvider.track({ type: 'search_performed', query: trimmedQuery })
    // router.push() from @/navigation automatically handles locale prefixes
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
    onClose()
    setQuery('')
  }

  if (!isOpen) return null

  return (
    <div
      data-search-modal
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 md:pt-24 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t('search')}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        <form onSubmit={handleSubmit} className="p-4 md:p-6">
          <div className="flex gap-3 md:gap-4">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={displayPlaceholder}
              className="flex-1 px-4 py-3 text-base border border-glass-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition-all"
              aria-label={tCommon('searchInput')}
              autoComplete="off"
            />
            <button
              ref={submitButtonRef}
              type="submit"
              className="px-5 md:px-6 py-3 bg-ocean-600 text-white font-medium rounded-lg hover:bg-ocean-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 whitespace-nowrap"
            >
              {t('search')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

