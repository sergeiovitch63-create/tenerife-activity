import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Nouvel affilié' }

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code:
    'Code invalide. Doit contenir seulement des lettres, chiffres, tirets et underscores (max 64 caractères).',
  invalid_name: 'Nom invalide (1-200 caractères requis).',
  invalid_rate: 'Commission invalide (doit être entre 0 et 100).',
  duplicate_code: 'Ce code d’affilié existe déjà.',
  no_database: 'Base de données indisponible.',
  db_error: 'Erreur base de données, réessaie.',
}

export default function NewAffiliatePage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const errorKey = searchParams?.error
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] ?? 'Erreur inattendue.' : null

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <div className="mb-2">
          <Link href="/back-office/affiliates" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux affiliés
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Nouvel affilié</h1>
        <p className="text-sm text-gray-500 mt-1">
          Créer un partenaire (hôtel, blog, guide, etc.) avec son code de tracking.
        </p>
      </div>

      <form
        method="POST"
        action="/api/admin/affiliates"
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
      >
        <Field
          label="Code (slug court, utilisé dans les liens /r/CODE)"
          name="code"
          placeholder="hotel-h10"
          required
          pattern="[a-zA-Z0-9_-]+"
          maxLength={64}
          hint="Lettres, chiffres, tirets, underscores. Pas d’espace."
        />
        <Field label="Nom" name="name" placeholder="Hotel H10" required maxLength={200} />
        <Field label="Email" name="email" placeholder="contact@hotel-h10.com" type="email" maxLength={200} />
        <Field
          label="Commission (%)"
          name="commission_percent"
          type="number"
          defaultValue="10"
          min={0}
          max={100}
          step="0.01"
          hint="Défaut : 10% du montant brut de la réservation."
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut initial</label>
          <select
            name="status"
            defaultValue="active"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="active">Actif (peut tracer dès maintenant)</option>
            <option value="pending">En attente d’approbation</option>
          </select>
        </div>

        {errorMessage ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
          >
            Créer l’affilié
          </button>
          <Link
            href="/back-office/affiliates"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  hint,
  type = 'text',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        {...props}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </div>
  )
}
