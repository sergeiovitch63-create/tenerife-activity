'use client'

import { cn } from '@/ui/lib/cn'
import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQProps {
  items: FAQItem[]
}

export function FAQ({ items }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index

        return (
          <div
            key={index}
            className="border border-glass-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-glass-50 transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-inset"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-glass-900">{item.question}</span>
              <span
                className={cn(
                  'text-glass-500 text-xl transition-transform duration-200 flex-shrink-0',
                  isOpen && 'rotate-180'
                )}
                aria-hidden="true"
              >
                ▼
              </span>
            </button>
            {isOpen && (
              <div className="px-6 py-4 bg-glass-50 border-t border-glass-200">
                <p className="text-sm text-glass-700 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}








