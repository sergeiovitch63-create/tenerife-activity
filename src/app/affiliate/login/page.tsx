export const dynamic = 'force-dynamic'
export const metadata = { title: 'Affilié — Connexion' }

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: 'Lien invalide : paramètre « token » manquant.',
  bad_token: 'Ce lien de connexion a expiré ou a déjà été révoqué.',
}

export default function AffiliateLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const error = searchParams?.error ? ERROR_MESSAGES[searchParams.error] : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Espace affilié</h1>
          <p className="text-sm text-gray-500 mt-1">Tenerife Activity — Dashboard partenaires</p>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm space-y-2">
          <p className="font-medium text-blue-900">Connexion par lien unique</p>
          <p className="text-blue-800">
            Pour accéder à ton dashboard, demande à ton contact Tenerife Activity
            de te transmettre un lien de connexion personnalisé. Il prend la forme :
          </p>
          <code className="block bg-white rounded px-2 py-1 text-xs break-all">
            /affiliate/auth?token=…
          </code>
          <p className="text-blue-800">
            Clique dessus, tu seras connecté automatiquement (valide 30 jours).
          </p>
        </div>

        <p className="text-xs text-gray-500">
          Tu es administrateur ? Tu peux générer un lien pour un affilié depuis le
          back-office, page « Détail » de l'affilié.
        </p>
      </div>
    </div>
  )
}
