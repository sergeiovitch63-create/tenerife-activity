'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/navigation'
import { usePathname } from '@/navigation'
import { useCartStore } from '@/lib/cart/store'
import { isCartItemExpired } from '@/lib/cart/types'
import { cn } from '@/ui/lib/cn'

const CART_ICON_ID = 'header-cart-icon'

interface HeaderCartIconProps {
  isHeroVisible: boolean
}

export function HeaderCartIcon({ isHeroVisible }: HeaderCartIconProps) {
  const pathname = usePathname()
  const items = useCartStore((s) => s.items)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const count = mounted
    ? items.filter((i) => !isCartItemExpired(i)).length
    : 0

  const isCartPage = pathname?.includes('/cart') || pathname?.includes('/checkout')

  return (
    <span id={CART_ICON_ID} data-cart-icon className="inline-flex">
      <Link
        href="/cart"
        className={cn(
          'relative p-2 transition-colors rounded-lg inline-flex',
          isCartPage && 'ring-2 ring-ocean-500 ring-offset-1',
          isHeroVisible
            ? 'text-slate-900 hover:text-slate-700 hover:bg-slate-100'
            : 'text-white hover:text-ocean-200 hover:bg-white/10'
        )}
        aria-label="Panier"
      >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
      {count > 0 && (
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full',
            isHeroVisible ? 'bg-ocean-600 text-white' : 'bg-ocean-400 text-white'
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
    </span>
  )
}
