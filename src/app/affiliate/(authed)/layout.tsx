import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/affiliate/session'

export const dynamic = 'force-dynamic'

export default async function AffiliateAuthedLayout({ children }: { children: ReactNode }) {
  // Sole guard for /affiliate protected pages (middleware no longer runs here).
  // Unauthed users are bounced to the login page.
  const session = await getCurrentAffiliate()
  if (!session) {
    redirect('/affiliate/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/affiliate/dashboard" className="font-semibold text-gray-900">
              Espace affilié
            </Link>
            <nav className="flex items-center gap-4 text-sm text-gray-600">
              <Link href="/affiliate/dashboard" className="hover:text-gray-900">
                Tableau de bord
              </Link>
              <Link href="/affiliate/links" className="hover:text-gray-900">
                Mes liens
              </Link>
              <Link href="/affiliate/payouts" className="hover:text-gray-900">
                Commissions
              </Link>
              <Link href="/affiliate/settings" className="hover:text-gray-900">
                Paramètres
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">
              {session.name} <span className="text-gray-400 font-mono">({session.affiliateCode})</span>
            </span>
            <form method="POST" action="/api/affiliate/logout">
              <button
                type="submit"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
