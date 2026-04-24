import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

export default async function AdminAuthedLayout({ children }: { children: ReactNode }) {
  const authed = await isAdminAuthenticated()
  if (!authed) {
    redirect('/back-office/login')
  }

  return (
    <div className="min-h-screen bg-glass-50">
      <header className="bg-white border-b border-glass-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo + titre */}
          <Link
            href="/back-office"
            className="flex items-center gap-3 font-semibold text-glass-900 min-w-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              className="w-9 h-9 rounded-lg object-contain bg-ocean-50 p-1 flex-shrink-0"
            />
            <span className="hidden sm:inline text-base">Back Office</span>
            <span className="sm:hidden text-sm truncate">Back Office</span>
          </Link>

          {/* Nav + logout */}
          <div className="flex items-center gap-1 sm:gap-4 text-sm">
            <nav className="flex items-center gap-1">
              <Link
                href="/back-office"
                className="px-2.5 sm:px-3 py-1.5 rounded-md text-glass-600 hover:bg-ocean-50 hover:text-ocean-900 transition text-xs sm:text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/back-office/affiliates"
                className="px-2.5 sm:px-3 py-1.5 rounded-md text-glass-600 hover:bg-ocean-50 hover:text-ocean-900 transition text-xs sm:text-sm"
              >
                Affiliés
              </Link>
            </nav>
            <form method="POST" action="/api/admin/logout">
              <button
                type="submit"
                className="text-xs sm:text-sm text-glass-500 hover:text-red-600 transition px-2 py-1.5"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <span className="hidden sm:inline">Se déconnecter</span>
                <span className="sm:hidden">↗</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
