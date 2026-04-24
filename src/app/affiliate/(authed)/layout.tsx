import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/affiliate/session'

export const dynamic = 'force-dynamic'

export default async function AffiliateAuthedLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentAffiliate()
  if (!session) {
    redirect('/affiliate/login')
  }

  return (
    <div className="min-h-screen bg-glass-50 flex flex-col">
      <header className="bg-white border-b border-glass-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          {/* Top row : logo + compte */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/affiliate/dashboard"
              className="flex items-center gap-3 min-w-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt=""
                className="w-9 h-9 rounded-lg object-contain bg-ocean-50 p-1 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="font-semibold text-glass-900 text-sm sm:text-base leading-tight truncate">
                  {session.name}
                </div>
                <div className="text-xs text-glass-500 font-mono truncate">
                  {session.affiliateCode} · {session.commissionPercent}% commission
                </div>
              </div>
            </Link>

            <form method="POST" action="/api/affiliate/logout">
              <button
                type="submit"
                className="text-xs sm:text-sm text-glass-500 hover:text-red-600 transition px-2 py-1.5 rounded-md"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <span className="hidden sm:inline">Se déconnecter</span>
                <span className="sm:hidden">↗</span>
              </button>
            </form>
          </div>

          {/* Bottom row : nav scrollable sur mobile */}
          <nav className="flex items-center gap-1 mt-3 overflow-x-auto -mx-1 px-1 pb-0.5 scrollbar-thin">
            <NavLink href="/affiliate/dashboard" label="Tableau de bord" icon="📊" />
            <NavLink href="/affiliate/links" label="Mes liens" icon="🔗" />
            <NavLink href="/affiliate/payouts" label="Commissions" icon="💶" />
            <NavLink href="/affiliate/settings" label="Paramètres" icon="⚙️" />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-glass-200 bg-white py-4">
        <p className="max-w-6xl mx-auto px-4 sm:px-6 text-xs text-glass-500 text-center">
          Tenerife Activity · Programme partenaires
        </p>
      </footer>
    </div>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-glass-600 hover:bg-ocean-50 hover:text-ocean-900 transition whitespace-nowrap"
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
