import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Espace affilié — Tenerife Activity',
  description:
    'Connexion à ton espace partenaire : suis tes clics, tes ventes attribuées et tes commissions en temps réel.',
}

export default function AffiliateLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; code?: string }
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-white to-ocean-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Logo + titre */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-block bg-white rounded-2xl p-3 shadow-md mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Tenerife Activity"
                width={64}
                height={64}
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ocean-900 tracking-tight">
              Espace partenaire
            </h1>
            <p className="text-sm sm:text-base text-glass-600 mt-2 max-w-sm mx-auto">
              Suis tes clics, tes réservations attribuées et tes commissions en
              temps réel.
            </p>
          </div>

          {/* Card login */}
          <div className="bg-white rounded-2xl shadow-xl border border-glass-100 p-6 sm:p-8">
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
          <div className="mt-6 rounded-xl bg-ocean-50 border border-ocean-100 p-4 text-sm text-ocean-900">
            <p className="font-medium mb-1">Pas encore d'identifiants&nbsp;?</p>
            <p className="text-ocean-800">
              Contacte ton référent Tenerife Activity par WhatsApp ou email —
              il pourra te créer un compte et te transmettre tes codes.
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-glass-500 mt-6">
            © {new Date().getFullYear()} Tenerife Activity ·{' '}
            <a href="/" className="underline hover:text-ocean-700">
              Retour au site
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
