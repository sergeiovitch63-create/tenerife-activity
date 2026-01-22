/**
 * Accordion Component - Atlántico Style
 * Controlled component: accepts isOpen and onToggle props
 */

'use client'

import { ReactNode } from 'react'

interface AccordionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
  id?: string
}

export function Accordion({ title, isOpen, onToggle, children, id }: AccordionProps) {
  return (
    <div id={id} className="border-b border-glass-200 py-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left py-2 hover:text-ocean-600 transition-colors"
      >
        <h3 className="text-lg font-semibold text-glass-900">{title}</h3>
        <span
          className={`text-glass-500 text-xl transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="mt-4 text-glass-700 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}


