'use client'

import { useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'
import { Button } from './Button'
import { cn } from '@/ui/lib/cn'
import { trackingProvider } from '@/config/tracking'

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  className?: string
}

export function SearchBar({
  placeholder,
  onSearch,
  className,
}: SearchBarProps) {
  const router = useRouter()
  const t = useTranslations('common')
  const displayPlaceholder = placeholder || t('search')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const query = formData.get('query') as string
    if (query.trim()) {
      trackingProvider.track({ type: 'search_performed', query })
      // router.push() from @/navigation automatically handles locale prefixes
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      // Also call onSearch if provided (for backward compatibility)
      onSearch?.(query)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex gap-3 bg-white rounded-lg shadow-sm border border-glass-200/50 overflow-hidden',
        'focus-within:shadow-md focus-within:border-ocean-300/50 transition-all duration-200',
        className
      )}
    >
      <input
        type="text"
        name="query"
        placeholder={displayPlaceholder}
        className={cn(
          'flex-1 px-5 py-4 text-base bg-transparent text-glass-900 placeholder-glass-400',
          'focus:outline-none focus:ring-0'
        )}
      />
      <div className="flex items-center pr-1 py-1">
        <Button type="submit" variant="primary" size="md">
          {t('search')}
        </Button>
      </div>
    </form>
  )
}

