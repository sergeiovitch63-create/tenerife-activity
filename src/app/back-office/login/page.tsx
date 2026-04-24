import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Back Office — Tenerife Activity' }

const LOGIN_BG = '/images/home/must-see/teide-by-night.jpg'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; next?: string }
}) {
  if (await isAdminAuthenticated()) {
    redirect(searchParams?.next || '/back-office')
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Photo du Teide au coucher du soleil */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${LOGIN_BG}')` }}
        aria-hidden
      />
      {/* Overlay sombre pour la lisibilité du formulaire + fidélité à l'identité ocean */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-ocean-900/85 via-glass-900/80 to-ocean-950/90"
        aria-hidden
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md">
            {/* Logo + titre */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-block bg-white rounded-2xl p-4 shadow-xl mb-5 sm:mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Tenerife Activity"
                  width={72}
                  height={72}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">
                Back Office
              </h1>
              <p className="text-sm text-ocean-100 mt-2 drop-shadow-sm">
                Gestion du programme d'affiliation Tenerife Activity
              </p>
            </div>

            {/* Card login */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 ring-1 ring-black/5">
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
            <p className="text-center text-xs text-white/80 mt-5 sm:mt-6 drop-shadow-sm">
              © {new Date().getFullYear()} Tenerife Activity ·{' '}
              <a href="/" className="underline hover:text-white">
                Retour au site
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
