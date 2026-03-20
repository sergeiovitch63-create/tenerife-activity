import '../ui/styles/globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  verification: {
    google: 's4-smfixKn_o8Q1XIVxlYmsE9JobKnxXGakJNq-NXTo',
  },
  // Optimize font loading
  other: {
    'font-display': 'swap',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body>
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  )
}
