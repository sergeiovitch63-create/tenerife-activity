'use client'

import { useTranslations } from 'next-intl'

/**
 * Horizontal info bar shown at top of Overview section.
 * Displays: Reduced Group, Pickup Service, Wheelchair Accessible, Duration
 */

const iconClass = 'w-6 h-6 text-ocean-600 flex-shrink-0'

const ICONS = {
  group: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  bus: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  ),
  wheelchair: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6a2 2 0 100 4 2 2 0 000-4zm0 6c-2.2 0-4 1.8-4 4v4h2v-4c0-1.1.9-2 2-2s2 .9 2 2v4h2v-4c0-2.2-1.8-4-4-4zm-2 2H6v6h4v-6zm6 0h4v6h-4v-6z" />
    </svg>
  ),
  clock: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

/** 1_hicon-X = included (Yes), 0_hicon-X = not included (No) */
function deriveFromIcons(icons: string[]): { pickup: boolean | null; wheelchair: boolean | null } {
  let pickup: boolean | null = null
  let wheelchair: boolean | null = null
  for (const s of icons) {
    const str = String(s)
    const lower = str.toLowerCase()
    const included = str.startsWith('1_') || /^1_hicon/.test(str) || lower.includes('1_hicon')
    if (lower.includes('free_bus') || lower.includes('pickup') || lower.includes('recogida')) {
      pickup = included
    }
    if (lower.includes('discapacitados') || lower.includes('wheelchair') || lower.includes('silla')) {
      wheelchair = included
    }
  }
  return { pickup, wheelchair }
}

function deriveReducedGroup(faq: string, desc: string): boolean {
  const text = (faq + ' ' + desc).toLowerCase()
  return text.includes('grupo reducido') || text.includes('small group') || text.includes('gruppo ridotto')
}

function formatDuration(duration: string | number | null | undefined): string {
  if (duration == null) return ''
  const s = String(duration).trim()
  if (!s) return ''
  if (/^\d+-\d+/.test(s) || /\d+\s*-\s*\d+/.test(s)) {
    return s.replace(/\s*-\s*/, ' - ') + ' hrs'
  }
  const num = parseFloat(s)
  if (!isNaN(num)) return `${num} hrs`
  return s.includes('hr') ? s : `${s} hrs`
}

export interface OverviewInfoBarProps {
  icons?: string[]
  faq?: string
  desc?: string
  duration?: string | number
  lang?: string
}

export function OverviewInfoBar({ icons = [], faq = '', desc = '', duration }: OverviewInfoBarProps) {
  const t = useTranslations('overviewInfoBar')
  const { pickup, wheelchair } = deriveFromIcons(icons)
  const reducedGroup = deriveReducedGroup(faq, desc)
  const durationStr = formatDuration(duration)

  const items: Array<{ icon: JSX.Element; label: string; value: string }> = []

  items.push({
    icon: ICONS.group,
    label: t('reducedGroup'),
    value: reducedGroup ? t('yes') : t('no'),
  })
  items.push({
    icon: ICONS.bus,
    label: t('pickupService'),
    value: pickup === true ? t('yes') : pickup === false ? t('no') : t('dash'),
  })
  items.push({
    icon: ICONS.wheelchair,
    label: t('wheelchairAccessible'),
    value: wheelchair === true ? t('yes') : wheelchair === false ? t('no') : t('dash'),
  })
  if (durationStr) {
    items.push({
      icon: ICONS.clock,
      label: t('duration'),
      value: durationStr,
    })
  }

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 mb-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-glass-800">
          <span className="text-ocean-600">{item.icon}</span>
          <span>
            {item.label}: <strong>{item.value}</strong>
          </span>
        </div>
      ))}
    </div>
  )
}
