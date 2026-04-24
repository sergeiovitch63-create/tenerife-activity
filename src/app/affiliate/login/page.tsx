import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Affilié — Connexion' }

export default function AffiliateLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; code?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Espace affilié</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tenerife Activity — Dashboard partenaires
          </p>
        </div>

        <LoginForm error={searchParams?.error} defaultCode={searchParams?.code} />

        <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
          Tu n'as pas reçu tes identifiants ? Contacte ton référent Tenerife
          Activity qui pourra (re)générer ton code et ton mot de passe.
        </p>
      </div>
    </div>
  )
}
