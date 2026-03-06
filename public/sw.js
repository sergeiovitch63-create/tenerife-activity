/**
 * Service Worker for Tenerife Activity
 * Caches critical pages and assets for instant navigation
 */

const CACHE_NAME = 'tenerife-activity-v1'
const CRITICAL_PAGES = [
  '/',
  '/get-inspired',
  '/must-see',
  '/contact',
]

const CRITICAL_ASSETS = [
  '/logo.png',
  '/images/hero-poster.jpg',
  '/icon.svg',
]

// Install event - cache critical resources
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache critical pages and assets
      return cache.addAll([...CRITICAL_PAGES, ...CRITICAL_ASSETS]).catch(err => {
        console.log('SW: Cache addAll failed, caching individually', err)
        // Fallback: cache individually
        const promises = [...CRITICAL_PAGES, ...CRITICAL_ASSETS].map(url => {
          return cache.add(url).catch(() => {
            // Silently fail for individual items
            console.log('SW: Failed to cache', url)
          })
        })
        return Promise.all(promises)
      })
    })
  )
  // Activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// Fetch event - Network First, fallback to Cache
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') return
  
  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) return
  
  // Network First strategy for instant navigation
  e.respondWith(
    fetch(request)
      .then(response => {
        // Only cache successful responses
        if (response.status === 200) {
          // Clone response for cache
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request).then(response => {
          if (response) {
            return response
          }
          // Return offline page if available
          return caches.match('/').then(fallback => {
            return fallback || new Response('Offline', { 
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            })
          })
        })
      })
  )
})

