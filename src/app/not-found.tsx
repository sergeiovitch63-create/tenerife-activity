/**
 * Global not-found page (outside [locale])
 * 
 * This page is used when a route doesn't match any locale structure.
 * It does NOT use next-intl because it's outside the [locale] layout.
 * For localized 404 pages, see src/app/[locale]/not-found.tsx
 */

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-glass-900">
          404 - Page Not Found
        </h1>
        <p className="text-glass-600">
          The page you are looking for does not exist.
        </p>
        <div>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-glass-900 text-white rounded-lg font-medium hover:bg-glass-800 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    </div>
  )
}

