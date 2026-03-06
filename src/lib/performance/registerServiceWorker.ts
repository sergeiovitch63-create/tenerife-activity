/**
 * Register Service Worker for offline caching and instant navigation
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined') return
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
        })
        .then(registration => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[SW] Registered successfully:', registration.scope)
          }
          
          // Check for updates periodically
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000) // Check every hour
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[SW] Registration failed:', error)
          }
        })
    })
  }
}

