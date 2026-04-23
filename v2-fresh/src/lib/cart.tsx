'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartItem } from '@/types'

type CartContextValue = {
  items: CartItem[]
  add: (item: CartItem) => void
  update: (itemId: string, patch: Partial<CartItem>) => void
  remove: (itemId: string) => void
  clear: () => void
  count: number
  subtotal: number
  openDrawer: boolean
  setOpenDrawer: (v: boolean) => void
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'tnf_cart_v2'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [openDrawer, setOpenDrawer] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {}
  }, [items, hydrated])

  const add = useCallback((item: CartItem) => {
    setItems((prev) => [...prev, item])
    setOpenDrawer(true)
  }, [])

  const update = useCallback((itemId: string, patch: Partial<CartItem>) => {
    setItems((prev) => prev.map((it) => (it.itemId === itemId ? { ...it, ...patch } : it)))
  }, [])

  const remove = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((it) => it.itemId !== itemId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, it) =>
          sum + it.unitAdult * it.adults + it.unitChild * it.children + it.unitInfant * (it.infants ?? 0),
        0,
      ),
    [items],
  )

  const value: CartContextValue = {
    items,
    add,
    update,
    remove,
    clear,
    count: items.length,
    subtotal,
    openDrawer,
    setOpenDrawer,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
