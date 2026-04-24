import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Espace affilié — Tenerife Activity',
  description:
    'Connexion à ton espace partenaire : suis tes clics, tes ventes attribuées et tes commissions en temps réel.',
}

const LOGIN_BG = '/images/home/must-see/teide-by-night.jpg'

export default function AffiliateLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; code?: string }
}) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Photo du Teide au coucher du soleil */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${LOGIN_BG}')` }}
        aria-hidden
      />
      {/* Overlay chaleureux qui laisse respirer la photo tout en gardant la lisibilité */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-ocean-900/55 via-ocean-800/50 to-glass-900/70"
        aria-hidden
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md">
            {/* Logo + titre */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-block bg-white rounded-2xl p-3 shadow-xl mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Tenerife Activity"
                  width={64}
                  height={64}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-md">
                Espace partenaire
              </h1>
              <p className="text-sm sm:text-base text-ocean-100 mt-2 max-w-sm mx-auto drop-shadow-sm">
                Suis tes clics, tes réservations attribuées et tes commissions
                en temps réel.
              </p>
            </div>

            {/* Card login */}
            <div className="bg-white rounded-2xl shadow-2xl border border-white/30 p-6 sm:p-8 backdrop-blur-sm ring-1 ring-black/5">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-glass-900">Connexion</h2>
                <p className="text-sm text-glass-500 mt-1">
                  Saisis le code et le mot de passe que l'équipe Tenerife Activity
                  t'a envoyés.
                </p>
              </div>
              <LoginForm error={searchParams?.error} defaultCode={searchParams?.code} />
            </div>

            {/* Aide */}
            <div className="mt-5 sm:mt-6 rounded-xl bg-white/90 backdrop-blur-sm border border-white/40 p-4 text-sm text-ocean-900 shadow-lg">
              <p className="font-medium mb-1">Pas encore d'identifiants&nbsp;?</p>
              <p className="text-ocean-800">
                Contacte ton référent Tenerife Activity par WhatsApp ou email —
                il pourra te créer un compte et te transmettre tes codes.
              </p>
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
