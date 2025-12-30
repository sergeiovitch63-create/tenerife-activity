import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  
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

