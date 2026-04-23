import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

export default async function AdminAuthedLayout({ children }: { children: ReactNode }) {
  // Sole guard for /back-office protected pages (middleware no longer runs here).
  // Unauthed users are bounced to the login page.
  const authed = await isAdminAuthenticated()
  if (!authed) {
    redirect('/back-office/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/back-office" className="font-semibold text-gray-900">
              Tenerife Activity — Admin
            </Link>
            <nav className="flex items-center gap-4 text-sm text-gray-600">
              <Link href="/back-office" className="hover:text-gray-900">
                Tableau de bord
              </Link>
              <Link href="/back-office/affiliates" className="hover:text-gray-900">
                Affiliés
              </Link>
            </nav>
          </div>
          <form method="POST" action="/api/admin/logout">
            <button
              type="submit"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
