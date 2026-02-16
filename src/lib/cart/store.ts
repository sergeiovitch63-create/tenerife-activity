/**
 * Cart Store (Zustand)
 * 
 * Manages shopping cart state with localStorage persistence and SSR safety
 */

'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem, PriceSnapshot } from './types'
import { generateCartItemKey, isCartItemExpired, createCartItem } from './types'

interface CartState {
  items: CartItem[]
  
  // Actions
  addItem: (item: Omit<CartItem, 'itemKey' | 'addedAt' | 'expiresAt'>) => void
  removeItem: (itemKey: string) => void
  updateItem: (itemKey: string, patch: Partial<Omit<CartItem, 'itemKey'>>) => void
  clearCart: () => void
  getTotal: () => number
  getCurrency: () => string | null
  removeExpired: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (itemData) => {
        const item = createCartItem(itemData)
        
        set((state) => {
          // Remove expired items first
          const validItems = state.items.filter((i) => !isCartItemExpired(i))
          
          // Check if item with same key already exists
          const existingIndex = validItems.findIndex((i) => i.itemKey === item.itemKey)
          
          if (existingIndex >= 0) {
            // Update existing item
            const updated = [...validItems]
            updated[existingIndex] = item
            return { items: updated }
          } else {
            // Add new item
            return { items: [...validItems, item] }
          }
        })
      },

      removeItem: (itemKey) => {
        set((state) => ({
          items: state.items.filter((i) => i.itemKey !== itemKey),
        }))
      },

      updateItem: (itemKey, patch) => {
        set((state) => {
          const items = state.items.map((item) => {
            if (item.itemKey === itemKey) {
              const updated = { ...item, ...patch }
              // Regenerate key if t_group, t_id, tourDate, or sesTime changed
              if (patch.t_group || patch.t_id || patch.tourDate || patch.sesTime) {
                updated.itemKey = generateCartItemKey(updated)
              }
              return updated
            }
            return item
          })
          return { items }
        })
      },

      clearCart: () => {
        set({ items: [] })
      },

      getTotal: () => {
        const state = get()
        // Remove expired items before calculating
        const validItems = state.items.filter((i) => !isCartItemExpired(i))
        return validItems.reduce((sum, item) => sum + item.priceSnapshot.total, 0)
      },

      getCurrency: () => {
        const state = get()
        const validItems = state.items.filter((i) => !isCartItemExpired(i))
        if (validItems.length === 0) return null
        // Return currency from first item (assuming all items have same currency)
        return validItems[0]?.currency || null
      },

      removeExpired: () => {
        set((state) => ({
          items: state.items.filter((i) => !isCartItemExpired(i)),
        }))
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist items that are not expired
      partialize: (state) => ({
        items: state.items.filter((i) => !isCartItemExpired(i)),
      }),
    }
  )
)















