import { cn } from '@/ui/lib/cn'
import type { ReactNode } from 'react'

interface ChipProps {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}

export function Chip({ active = false, onClick, children }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2',
        active
          ? 'bg-ocean-600 text-white'
          : 'bg-glass-100 text-glass-700 hover:bg-glass-200'
      )}
    >
      {children}
    </button>
  )
}







