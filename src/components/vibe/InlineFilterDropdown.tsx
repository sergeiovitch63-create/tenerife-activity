'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/ui/lib/cn'

interface FilterOption {
  value: string
  label: string
}

interface InlineFilterDropdownProps {
  label: string
  value: string
  options: FilterOption[]
  selectedValue: string
  onChange: (value: string) => void
  customContent?: React.ReactNode
}

export function InlineFilterDropdown({
  label,
  value,
  options,
  selectedValue,
  onChange,
  customContent,
}: InlineFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const hasActiveFilter = selectedValue !== 'all' && selectedValue !== ''

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'px-3 py-1.5 border border-glass-300 rounded-lg bg-white text-sm font-medium transition-all',
          'focus:outline-none focus:ring-2 focus:ring-ocean-500',
          hasActiveFilter
            ? 'text-ocean-600 border-ocean-600 bg-ocean-50'
            : 'text-glass-700 hover:border-ocean-300 hover:bg-glass-50'
        )}
      >
        {value}
        <span className="ml-1.5">▼</span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 z-50 bg-white rounded-lg shadow-lg border border-glass-200 min-w-[200px]"
        >
          {customContent ? (
            customContent
          ) : (
            <div className="p-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg transition-colors text-sm',
                    selectedValue === option.value
                      ? 'bg-ocean-50 text-ocean-900 font-medium'
                      : 'text-glass-700 hover:bg-glass-50'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

