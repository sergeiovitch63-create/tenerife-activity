import { cn } from '@/ui/lib/cn'
import type { ReactNode } from 'react'

interface BadgeProps {
  variant?: 'top' | 'bestseller' | 'family' | 'new'
  children: ReactNode
}

const variantStyles = {
  top: 'bg-ocean-600 text-white',
  bestseller: 'bg-glass-700 text-white',
  family: 'bg-ocean-100 text-ocean-900',
  new: 'bg-glass-200 text-glass-900',
}

export function Badge({ variant = 'new', children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 text-xs font-medium',
        variantStyles[variant]
      )}
    >
      {children}
    </span>
  )
}







