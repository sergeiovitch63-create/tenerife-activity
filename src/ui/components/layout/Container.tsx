import { cn } from '@/ui/lib/cn'
import type { ReactNode } from 'react'

interface ContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: boolean
  children: ReactNode
}

const sizeStyles = {
  sm: 'max-w-container-sm',
  md: 'max-w-container-md',
  lg: 'max-w-container-lg',
  xl: 'max-w-container-xl',
  full: 'max-w-full',
}

export function Container({
  size = 'lg',
  padding = true,
  children,
}: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto',
        sizeStyles[size],
        padding && 'px-4 md:px-6'
      )}
    >
      {children}
    </div>
  )
}







