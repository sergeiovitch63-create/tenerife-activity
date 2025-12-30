import { cn } from '@/ui/lib/cn'
import type { ReactNode } from 'react'

interface SectionProps {
  variant?: 'default' | 'tight' | 'loose' | 'hero'
  background?: 'default' | 'subtle' | 'accent' | 'hero'
  className?: string
  children: ReactNode
}

const variantStyles = {
  tight: 'py-16 md:py-20',
  default: 'py-20 md:py-28',
  loose: 'py-28 md:py-36',
  hero: 'py-36 md:py-56',
}

const backgroundStyles = {
  default: 'bg-transparent',
  subtle: 'bg-transparent',
  accent: 'bg-transparent',
  hero: 'bg-transparent',
}

export function Section({
  variant = 'default',
  background = 'default',
  className,
  children,
}: SectionProps) {
  return (
    <section
      className={cn(
        'w-full relative',
        variantStyles[variant],
        backgroundStyles[background],
        className
      )}
    >
      {children}
    </section>
  )
}

