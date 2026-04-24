import { cookies, headers } from 'next/headers'
import { Inter } from 'next/font/google'
import './globals.css'
import { defaultLocale, isLocale, type Locale } from '@/lib/locale'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter', display: 'swap' })

function resolveLocale(): Locale {
  const h = headers()
  const c = cookies()
  const fromHeader = h.get('x-locale')
  if (isLocale(fromHeader)) return fromHeader
  const fromCookie = c.get('locale')?.value
  if (isLocale(fromCookie)) return fromCookie
  return defaultLocale
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = resolveLocale()
  return (
    <html lang={locale} className={inter.variable}>
      <body className="font-sans text-ink-900 antialiased">{children}</body>
    </html>
  )
}
