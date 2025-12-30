'use client'

import { Link } from '@/navigation'
import { cn } from '@/ui/lib/cn'
import { useTranslations } from 'next-intl'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const t = useTranslations('common')
  return (
    <nav aria-label={t('breadcrumb')} className="flex items-center gap-2 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <span key={index} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-glass-600 hover:text-ocean-600 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast ? 'text-glass-900 font-medium' : 'text-glass-600'
                )}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <span className="text-glass-400" aria-hidden="true">
                /
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

