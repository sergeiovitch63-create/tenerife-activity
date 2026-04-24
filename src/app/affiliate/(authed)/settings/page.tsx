import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/affiliate/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Affilié — Paramètres' }

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "Email invalide.",
  db_error: "Impossible d'enregistrer. Réessaie.",
}

export default async function AffiliateSettingsPage({
  searchParams,
}: {
  searchParams?: { flash?: string; error?: string }
}) {
  const session = await getCurrentAffiliate()
  if (!session) redirect('/affiliate/login')

  const flash = searchParams?.flash === 'updated'
  const errorMsg = searchParams?.error ? ERROR_MESSAGES[searchParams.error] ?? null : null

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-glass-900">Paramètres</h1>
        <p className="text-sm text-glass-500 mt-1">
          Informations utilisées pour te contacter et t'envoyer tes commissions.
        </p>
      </div>

      {flash ? (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded p-3 text-sm">
          Tes informations ont été mises à jour.
        </div>
      ) : null}
      {errorMsg ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">
          {errorMsg}
        </div>
      ) : null}

      <form
        method="POST"
        action="/api/affiliate/settings"
        className="bg-white border border-glass-200 rounded-lg p-6 space-y-4"
      >
        <ReadOnlyField label="Nom" value={session.name} />
        <ReadOnlyField label="Code affilié" value={session.affiliateCode} />
        <ReadOnlyField label="Commission" value={`${session.commissionPercent}%`} />

        <div className="border-t border-glass-100 pt-4">
          <label htmlFor="email" className="block text-sm font-medium text-glass-700 mb-1">
            Email de contact
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={session.email ?? ''}
            placeholder="contact@hotel.com"
            className="block w-full rounded-md border border-glass-300 px-3 py-2 text-sm"
            maxLength={200}
          />
          <p className="text-xs text-glass-500 mt-1">
            On t'enverra ici la notification de versement des commissions.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="rounded-md bg-ocean-700 text-white px-4 py-2 text-sm hover:bg-ocean-800"
          >
            Enregistrer
          </button>
        </div>
      </form>

      <div className="bg-glass-50 border border-glass-200 rounded-lg p-4 text-sm text-glass-600 space-y-1">
        <p className="font-medium text-gray-800">Besoin de changer autre chose ?</p>
        <p>
          Le nom, le code affilié ou le taux de commission ne peuvent être modifiés que par
          un administrateur Tenerife Activity. Contacte-nous par email.
        </p>
      </div>
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-glass-700 mb-1">{label}</div>
      <div className="bg-glass-50 border border-glass-200 rounded-md px-3 py-2 text-sm text-glass-700">
        {value}
      </div>
    </div>
  )
}
