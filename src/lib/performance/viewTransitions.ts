/**
 * View Transitions API for instant page transitions
 * Provides smooth, instant navigation between pages
 */

export function setupViewTransitions() {
  if (typeof window === 'undefined') return
  
  // Check if browser supports View Transitions API
  if (!('startViewTransition' in document)) {
    return
  }

  // Intercept clicks on internal links
  document.addEventListener('click', handleLinkClick, { passive: false })
  
  // Also handle programmatic navigation
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState
  
  history.pushState = function(...args) {
    const result = originalPushState.apply(this, args)
    triggerViewTransition()
    return result
  }
  
  history.replaceState = function(...args) {
    const result = originalReplaceState.apply(this, args)
    triggerViewTransition()
    return result
  }
  
  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    triggerViewTransition()
  })
  
  function handleLinkClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    const link = target.closest('a[href]') as HTMLAnchorElement
    
    if (!link) return
    
    // Skip if modifier keys are pressed (Ctrl/Cmd for new tab, etc.)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
    
    // Skip if link has target="_blank"
    if (link.target === '_blank') return
    
    const href = link.getAttribute('href')
    if (!href) return
    
    // Check if it's an internal link
    try {
      const url = new URL(href, window.location.origin)
      if (url.origin !== window.location.origin) {
        return // External link, let browser handle it
      }
    } catch {
      // Relative URL, treat as internal
    }
    
    // Skip hash links (same page navigation)
    if (href.startsWith('#')) return
    
    // Prevent default navigation
    e.preventDefault()
    
    // Use View Transitions API for smooth transition
    ;(document as any).startViewTransition(() => {
      window.location.href = href
    })
  }
  
  function triggerViewTransition() {
    if ('startViewTransition' in document) {
      ;(document as any).startViewTransition(() => {
        // Transition is handled by browser
      })
    }
  }
  
  // Cleanup function (returned for potential cleanup)
  return () => {
    document.removeEventListener('click', handleLinkClick)
    history.pushState = originalPushState
    history.replaceState = originalReplaceState
  }
}

