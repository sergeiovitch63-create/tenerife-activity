/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude public/images from serverless function bundle.
  // local-images.ts uses fs.readdirSync on public/images/ at runtime;
  // without this exclusion Next.js output-file-tracing bundles the entire
  // images directory into the Lambda, blowing past Vercel's 300 MB limit.
  outputFileTracingExcludes: {
    '*': ['./public/images/**/*'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.atlanticoexcursiones.com' },
      { protocol: 'https', hostname: 'www.atlanticoexcursiones.com' },
      { protocol: 'https', hostname: 'atlanticoexcursiones.com' },
      { protocol: 'https', hostname: 'testapi.atlanticoexcursiones.com' },
      { protocol: 'https', hostname: 'api.tenerife-activity.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  // Belt-and-suspenders: the primary fix is the static image manifest in
  // src/lib/local-images.ts (no runtime fs). This exclude still helps if
  // anything else ever touches public/images/ via @vercel/nft-traced paths.
  // The '*' key means "apply to every route".
  outputFileTracingExcludes: {
    '*': [
      'public/images/**/*',
      '.claude/**/*',
      '**/*.map',
    ],
  },
}

export default nextConfig
