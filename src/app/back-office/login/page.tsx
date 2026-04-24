import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Back Office — Tenerife Activity' }

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; next?: string }
}) {
  if (await isAdminAuthenticated()) {
    redirect(searchParams?.next || '/back-office')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-900 via-ocean-800 to-glass-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Logo + titre */}
          <div className="text-center mb-8">
            <div className="inline-block bg-white rounded-2xl p-4 shadow-xl mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Tenerife Activity"
                width={80}
                height={80}
                className="w-20 h-20 object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Back Office
            </h1>
            <p className="text-sm text-ocean-200 mt-2">
              Gestion du programme d'affiliation Tenerife Activity
            </p>
          </div>

          {/* Card login */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-glass-900">
                Connexion administrateur
              </h2>
              <p className="text-sm text-glass-500 mt-1">
                Accès réservé à l'équipe Tenerife Activity.
              </p>
            </div>
            <LoginForm error={searchParams?.error} next={searchParams?.next} />
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-ocean-200 mt-6">
            © {new Date().getFullYear()} Tenerife Activity ·{' '}
            <a href="/" className="underline hover:text-white">
              Retour au site
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
