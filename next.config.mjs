import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

function hostnameFromEnvUrl(v) {
  if (!v || typeof v !== 'string' || !v.trim()) return null
  try {
    return new URL(v).hostname
  } catch {
    return null
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  
  // Note: serverExternalPackages is not available in Next.js 14.2.35
  // Using outputFileTracingExcludes instead
  
  // Exclude debug routes and heavy dependencies from production build
  // This prevents Next.js from trying to collect page data for debug routes during build
  // and reduces bundle size for API routes
  // Target: reduce Serverless Functions below 250MB limit
  ...(process.env.NODE_ENV === 'production' && {
    experimental: {
      outputFileTracingExcludes: {
        '*': [
          '**/api/debug/**',
          '**/api/atlantico/debug/**',
        ],
        // Exclude heavy dependencies from ALL API routes by default
        // This significantly reduces bundle size for Vercel Functions (250mb limit)
        // Target: reduce from ~250mb+ to under 250mb
        '**/api/**': [
          // Exclude React/React-DOM from ALL API routes (not needed) - saves ~50mb
          '**/node_modules/react/**',
          '**/node_modules/react-dom/**',
          '**/node_modules/.pnpm/**/react/**',
          '**/node_modules/.pnpm/**/react-dom/**',
          // Exclude Zustand (client-side state management, not needed in API) - saves ~5mb
          '**/node_modules/zustand/**',
          '**/node_modules/.pnpm/**/zustand/**',
          // Exclude dev dependencies from ALL API routes - saves ~100mb+
          '**/node_modules/playwright/**',
          '**/node_modules/@playwright/**',
          '**/node_modules/tsx/**',
          '**/node_modules/.pnpm/**/@playwright/**',
          '**/node_modules/.pnpm/**/playwright/**',
          '**/node_modules/.pnpm/**/tsx/**',
          // Exclude TypeScript compiler (not needed at runtime)
          '**/node_modules/typescript/**',
          '**/node_modules/.pnpm/**/typescript/**',
          // Exclude ESLint (dev only)
          '**/node_modules/eslint/**',
          '**/node_modules/.pnpm/**/eslint/**',
          // Exclude Prettier (dev only)
          '**/node_modules/prettier/**',
          '**/node_modules/.pnpm/**/prettier/**',
          // Exclude next-intl client-side code (API routes don't need it)
          '**/node_modules/next-intl/dist/client/**',
          '**/node_modules/.pnpm/**/next-intl/**/dist/client/**',
          // Exclude Tailwind CSS (not needed in API routes)
          '**/node_modules/tailwindcss/**',
          '**/node_modules/.pnpm/**/tailwindcss/**',
          '**/node_modules/autoprefixer/**',
          '**/node_modules/.pnpm/**/autoprefixer/**',
          '**/node_modules/postcss/**',
          '**/node_modules/.pnpm/**/postcss/**',
        ],
        // Exclude Supabase from routes that don't use it (most routes)
        // Only keep Supabase for routes that explicitly need it
        '**/api/atlantico/**': [
          '**/node_modules/@supabase/**',
          '**/node_modules/.pnpm/**/@supabase/**',
        ],
        '**/api/catalog/**': [
          '**/node_modules/@supabase/**',
          '**/node_modules/.pnpm/**/@supabase/**',
        ],
        '**/api/backoffice/**': [
          '**/node_modules/@supabase/**',
          '**/node_modules/.pnpm/**/@supabase/**',
        ],
        '**/api/debug/**': [
          '**/node_modules/@supabase/**',
          '**/node_modules/.pnpm/**/@supabase/**',
        ],
        // Routes that NEED Supabase - don't exclude it
        // (admin/curation/*, debug/supabase, debug/env)
        // These routes will include Supabase but still exclude React/dev deps
      },
    },
  }),
  
  // Image configuration for remote domains
  // Required for Next/Image component
  images: {
    remotePatterns: [
      // Atlantico API / assets hosts (env-driven - highest priority)
      ...[
        process.env.ATLANTICO_BASE_URL,
        process.env.ATLANTICO_ASSETS_BASE_URL,
        process.env.ATLANTICO_IMAGES_BASE_URL,
        process.env.NEXT_PUBLIC_ATLANTICO_IMAGES_BASE_URL,
        process.env.NEXT_PUBLIC_ATLANTICO_ASSETS_BASE_URL,
      ]
        .map(hostnameFromEnvUrl)
        .filter(Boolean)
        .map((hostname) => ({
          protocol: 'https',
          hostname,
          pathname: '/**',
        })),
      // Common Atlantico hostnames (tested by debug endpoint)
      {
        protocol: 'https',
        hostname: 'api.atlanticoexcursiones.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'testapi.atlanticoexcursiones.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'atlanticoexcursiones.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.atlanticoexcursiones.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'admin.atlanticoexcursiones.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'backoffice.atlanticoexcursiones.com',
        pathname: '/**',
      },
      // Legacy/alternative domains
      {
        protocol: 'https',
        hostname: 'static.atlantico-excursiones.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.atlantico-excursiones.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.atlantico-excursiones.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.tenerife-activity.com',
        pathname: '/**',
      },
    ],
  },
  
  // Disable webpack persistent filesystem cache in development to fix Windows ENOENT issues
  // This prevents file system locking problems on Windows that cause slow rebuilds and Fast Refresh issues
  webpack: (config, { dev }) => {
    if (dev) {
      // Use in-memory cache instead of filesystem cache
      // This avoids Windows file locking issues (ENOENT errors) and improves dev server performance
      config.cache = {
        type: 'memory',
      }
    }
    return config
  },
}

export default withNextIntl(nextConfig)

