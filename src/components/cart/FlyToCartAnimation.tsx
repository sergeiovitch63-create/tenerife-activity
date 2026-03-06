'use client'

/**
 * Fly-to-cart animation
 * Uses Web Animations API for reliable playback on mobile.
 * Item flies from Add to Cart button upward to the cart icon.
 */

import { useEffect } from 'react'

const CART_ICON_ID = 'header-cart-icon'
const DURATION_MS = 650

function getFallbackTarget() {
  const w = typeof window !== 'undefined' ? window.innerWidth : 375
  return { x: w - 50, y: 50 }
}

function createFlyingElement() {
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
    width: 44px;
    height: 44px;
    margin-left: -22px;
    margin-top: -22px;
    border-radius: 50%;
    background: #0369a1;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 2px solid white;
  `
  el.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
    </svg>
  `
  return el
}

export function FlyToCartAnimation() {
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ sourceRect: DOMRect }>
      const rect = ev.detail?.sourceRect
      if (!rect) return

      const startX = rect.left + rect.width / 2
      const startY = rect.top + rect.height / 2

      const run = () => {
        const targetEl = document.getElementById(CART_ICON_ID)
        const tr = targetEl?.getBoundingClientRect()
        const endX = tr ? tr.left + tr.width / 2 : getFallbackTarget().x
        const endY = tr ? tr.top + tr.height / 2 : getFallbackTarget().y

        const fly = createFlyingElement()
        fly.style.left = `${startX}px`
        fly.style.top = `${startY}px`
        document.body.appendChild(fly)

        const dx = endX - startX
        const dy = endY - startY

        const anim = fly.animate(
          [
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.4)`, opacity: 0.9 },
          ],
          {
            duration: DURATION_MS,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            fill: 'forwards',
          }
        )

        anim.finished.then(() => {
          fly.remove()
        }).catch(() => {
          fly.remove()
        })
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(run)
      })
    }

    window.addEventListener('fly-to-cart', handler)
    return () => window.removeEventListener('fly-to-cart', handler)
  }, [])

  return null
}

export function dispatchFlyToCart(sourceElement: HTMLElement) {
  const rect = sourceElement.getBoundingClientRect()
  window.dispatchEvent(
    new CustomEvent('fly-to-cart', { detail: { sourceRect: rect } })
  )
}
