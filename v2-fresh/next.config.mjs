/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

export default nextConfig
