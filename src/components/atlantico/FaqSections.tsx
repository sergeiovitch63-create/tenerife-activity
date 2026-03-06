'use client'

import { decodeTextFromApi } from '@/lib/atlantico/htmlAssets'
import { parseFaqSections, type FaqSection } from '@/lib/atlantico/parseFaq'

const iconClass = 'w-6 h-6 text-ocean-600 flex-shrink-0'

const SECTION_ICONS: Record<FaqSection['type'], JSX.Element> = {
  included: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'not-included': (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  duration: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  notes: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  accessibility: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6a2 2 0 100 4 2 2 0 000-4zm0 6c-2.2 0-4 1.8-4 4v4h2v-4c0-1.1.9-2 2-2s2 .9 2 2v4h2v-4c0-2.2-1.8-4-4-4zm-2 2H6v6h4v-6zm6 0h4v6h-4v-6z" />
    </svg>
  ),
}

export function FaqSections({
  faq,
  fallbackRaw = false,
}: {
  faq: string | null | undefined
  /** When true, show raw text if no sections parsed. Default false. */
  fallbackRaw?: boolean
}) {
  const raw = decodeTextFromApi(faq || '')
  const sections = parseFaqSections(raw)

  if (sections.length === 0) {
    if (fallbackRaw && raw.trim()) {
      return <div className="text-glass-700 leading-relaxed whitespace-pre-line">{raw}</div>
    }
    return null
  }

  const cardClass = 'bg-gradient-to-br from-ocean-50 to-blue-50 rounded-xl p-4 border border-ocean-100'
  const iconBoxClass = 'w-12 h-12 bg-ocean-100 rounded-xl flex items-center justify-center flex-shrink-0'
  const titleClass = 'font-bold text-ocean-800'
  const textClass = 'text-ocean-700 text-sm'

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const IconSvg = SECTION_ICONS[section.type]

        if (section.type === 'duration' && 'text' in section) {
          return (
            <div key={idx} className={cardClass}>
              <div className="flex items-start gap-3">
                <div className={iconBoxClass}>{IconSvg}</div>
                <div className="flex-1 min-w-0">
                  <h4 className={`${titleClass} mb-2`}>{section.title}</h4>
                  <p className={textClass}>{section.text}</p>
                </div>
              </div>
            </div>
          )
        }

        if ('items' in section && section.items.length > 0) {
          return (
            <div key={idx} className={cardClass}>
              <div className="flex items-start gap-3">
                <div className={iconBoxClass}>{IconSvg}</div>
                <div className="flex-1 min-w-0">
                  <h4 className={`${titleClass} mb-2`}>{section.title}</h4>
                  <ul className="space-y-1">
                    {section.items.map((item, i) => (
                      <li key={i} className={`flex items-start gap-2 ${textClass}`}>
                        <span className="mt-0.5 text-ocean-600">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
