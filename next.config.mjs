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
  
  // Exclude heavy dependencies from Serverless Functions to stay under 250MB limit
  // Using both serverExternalPackages and outputFileTracingExcludes for maximum effect
  
  // serverExternalPackages: exclude packages from Serverless Functions completely
  // Available in Next.js 14.2.0+
  serverExternalPackages: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'zustand',
    '@supabase/supabase-js',
    'playwright',
    '@playwright/test',
    'tsx',
    'typescript',
    'eslint',
    'prettier',
    'tailwindcss',
    'autoprefixer',
    'postcss',
    'next-intl',
    'clsx',
    'tailwind-merge',
  ],
  
  // Exclude debug routes and heavy dependencies from production build
  // This prevents Next.js from trying to collect page data for debug routes during build
  // and reduces bundle size for API routes
  // Target: reduce Serverless Functions below 250MB limit
  ...(process.env.NODE_ENV === 'production' && {
    experimental: {
      outputFileTracingExcludes: {
        // Exclude large static assets from ALL Serverless Functions
        // public/images/pictures is 261MB and should not be bundled in functions
        // These are static assets served directly by Vercel, not needed in functions
        '*': [
          '**/api/debug/**',
          '**/api/atlantico/debug/**',
          '**/public/images/pictures/**',
          '**/public/images/**/*.jpg',
          '**/public/images/**/*.jpeg',
          '**/public/images/**/*.png',
          '**/public/images/**/*.webp',
          '**/public/images/**/*.gif',
        ],
        // Exclude heavy dependencies from ALL API routes by default
        // This significantly reduces bundle size for Vercel Functions (250mb limit)
        // Target: reduce from ~250mb+ to under 250mb
        '**/api/**': [
          // Exclude React/React-DOM from ALL API routes (not needed) - saves ~50mb
          '**/node_modules/react/**',
          '**/node_modules/react-dom/**',
          '**/node_modules/react/jsx-runtime/**',
          '**/node_modules/.pnpm/**/react/**',
          '**/node_modules/.pnpm/**/react-dom/**',
          '**/node_modules/.pnpm/**/react/jsx-runtime/**',
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
          // Exclude next-intl completely from API routes (not needed) - saves ~10mb
          '**/node_modules/next-intl/**',
          '**/node_modules/.pnpm/**/next-intl/**',
          // Exclude Tailwind CSS (not needed in API routes)
          '**/node_modules/tailwindcss/**',
          '**/node_modules/.pnpm/**/tailwindcss/**',
          '**/node_modules/autoprefixer/**',
          '**/node_modules/.pnpm/**/autoprefixer/**',
          '**/node_modules/postcss/**',
          '**/node_modules/.pnpm/**/postcss/**',
          // Exclude clsx/tailwind-merge (not needed in API routes) - saves ~2mb
          '**/node_modules/clsx/**',
          '**/node_modules/.pnpm/**/clsx/**',
          '**/node_modules/tailwind-merge/**',
          '**/node_modules/.pnpm/**/tailwind-merge/**',
          // Exclude source files that import React (client components)
          // Only exclude if they're not needed by API routes
          '**/src/**/*.client.tsx',
          '**/src/**/*.client.ts',
          '**/src/ui/**',
          '**/src/components/**',
          // Exclude Next.js client-side code
          '**/node_modules/next/dist/client/**',
          '**/node_modules/.pnpm/**/next/**/dist/client/**',
          // Exclude other heavy dependencies that might be pulled in
          '**/node_modules/@types/**',
          '**/node_modules/.pnpm/**/@types/**',
        ],
        // Exclude Supabase from routes that don't use it (most routes)
        // Only keep Supabase for routes that explicitly need it
        '**/api/atlantico/**': [
          '**/node_modules/@supabase/**',
          '**/node_modules/.pnpm/**/@supabase/**',
          '**/src/lib/supabase/**',
        ],
        '**/api/catalog/**': [
          '**/node_modules/@supabase/**',
          '**/node_modules/.pnpm/**/@supabase/**',
          '**/src/lib/supabase/**',
        ],
        '**/api/backoffice/**': [
          '**/node_modules/@supabase/**',
          '**/node_modules/.pnpm/**/@supabase/**',
          '**/src/lib/supabase/**',
        ],
        '**/api/debug/**': [
          '**/node_modules/@supabase/**',
          '**/node_modules/.pnpm/**/@supabase/**',
          '**/src/lib/supabase/**',
        ],
        '**/api/curation/**': [
          '**/node_modules/@supabase/**',
          '**/node_modules/.pnpm/**/@supabase/**',
          '**/src/lib/supabase/**',
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

