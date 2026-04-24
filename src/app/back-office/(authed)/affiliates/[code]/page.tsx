import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getAffiliateByCode,
  listSalesForAffiliate,
  type AffiliateStatus,
  type SaleStatus,
} from '@/lib/back-office/affiliates'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Détail affilié' }

const STATUS_LABEL: Record<AffiliateStatus, string> = {
  active: 'Actif',
  pending: 'En attente',
  suspended: 'Suspendu',
}
const STATUS_CLASS: Record<AffiliateStatus, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  suspended: 'bg-glass-200 text-glass-700',
}
const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  paid: 'Payée',
}
const SALE_STATUS_CLASS: Record<SaleStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  paid: 'bg-ocean-100 text-ocean-900',
}

export default async function AffiliateDetailPage({
  params,
  searchParams,
}: {
  params: { code: string }
  searchParams?: { flash?: string }
}) {
  const code = decodeURIComponent(params.code)
  const affiliate = await getAffiliateByCode(code)
  if (!affiliate) notFound()

  const sales = await listSalesForAffiliate(code, 200)

  const siteUrl = getSiteUrl()

  const loginUrl = `${siteUrl}/affiliate/login`

  type Flash =
    | { tone: 'ok'; text: string }
    | { tone: 'err'; text: string }
    | { tone: 'creds'; kind: 'new' | 'reset'; password: string }

  const flash: Flash | null = (() => {
    if (!searchParams?.flash) return null
    const v = searchParams.flash
    if (v === 'updated') return { tone: 'ok', text: 'Affilié mis à jour.' }
    if (v.startsWith('confirmed:')) {
      const n = v.split(':')[1]
      return { tone: 'ok', text: `${n} ventes marquées comme confirmées.` }
    }
    if (v.startsWith('paid:')) {
      const [, count, total] = v.split(':')
      return { tone: 'ok', text: `Payout effectué : ${count} ventes, ${total} €.` }
    }
    if (v.startsWith('newpwd:')) {
      return { tone: 'creds', kind: 'new', password: v.slice('newpwd:'.length) }
    }
    if (v.startsWith('resetpwd:')) {
      return { tone: 'creds', kind: 'reset', password: v.slice('resetpwd:'.length) }
    }
    if (v === 'error') return { tone: 'err', text: 'Erreur, réessaie.' }
    return null
  })()

  const totalGross = sales.reduce((s, r) => s + (r.amount ?? 0), 0)
  const refLink = `/r/${encodeURIComponent(affiliate.code)}`

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2">
          <Link href="/back-office/affiliates" className="text-sm text-glass-500 hover:text-glass-700">
            ← Retour aux affiliés
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-glass-900 flex items-center gap-3">
              {affiliate.name}
              <span
                className={`text-xs px-2 py-1 rounded ${STATUS_CLASS[affiliate.status]}`}
              >
                {STATUS_LABEL[affiliate.status]}
              </span>
            </h1>
            <p className="text-sm text-glass-500 mt-1 font-mono">{affiliate.code}</p>
          </div>
        </div>
      </div>

      {flash && flash.tone === 'creds' ? (
        <div className="rounded-md p-4 bg-purple-50 border border-purple-200 space-y-3">
          <p className="text-sm font-medium text-purple-900">
            🔑 {flash.kind === 'new'
              ? 'Affilié créé — voici ses identifiants de connexion'
              : 'Mot de passe réinitialisé — transmet ces nouveaux identifiants'}
          </p>
          <div className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
            <div className="text-purple-800">Page de login :</div>
            <input
              readOnly
              defaultValue={loginUrl}
              className="rounded-md border border-purple-300 bg-white px-2 py-1 text-xs font-mono"
            />
            <div className="text-purple-800">Code :</div>
            <input
              readOnly
              defaultValue={affiliate.code}
              className="rounded-md border border-purple-300 bg-white px-2 py-1 text-xs font-mono w-48"
            />
            <div className="text-purple-800">Mot de passe :</div>
            <input
              readOnly
              defaultValue={flash.password}
              className="rounded-md border border-purple-300 bg-white px-2 py-1 text-sm font-mono font-semibold w-48"
            />
          </div>
          <p className="text-xs text-purple-800">
            ⚠️ Le mot de passe n'est affiché qu'une seule fois. Copie-le maintenant
            et envoie-le à l'affilié (email, WhatsApp, SMS). Après avoir quitté
            cette page il faudra générer un nouveau mot de passe.
          </p>
        </div>
      ) : flash && flash.tone !== 'ok' && flash.tone !== 'err' ? null : flash ? (
        <div
          className={`rounded-md p-3 text-sm ${
            flash.tone === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {flash.text}
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Ventes total" value={affiliate.totalSales ?? 0} />
        <StatCard
          label="Ventes confirmées"
          value={affiliate.confirmedSales ?? 0}
        />
        <StatCard label="Chiffre généré" value={`${totalGross.toFixed(2)} €`} />
        <StatCard
          label="Commission gagnée"
          value={`${(affiliate.confirmedCommission ?? 0).toFixed(2)} €`}
        />
      </div>

      {/* Settings + actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-glass-200 rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-medium text-glass-900">Paramètres</h2>
          <form
            method="POST"
            action={`/api/admin/affiliates/${encodeURIComponent(affiliate.code)}`}
            className="space-y-3"
          >
            <input type="hidden" name="_method" value="update" />
            <SettingField
              label="Nom"
              name="name"
              defaultValue={affiliate.name}
              required
              maxLength={200}
            />
            <SettingField
              label="Email"
              name="email"
              type="email"
              defaultValue={affiliate.email ?? ''}
              maxLength={200}
            />
            <SettingField
              label="Commission (%)"
              name="commission_percent"
              type="number"
              defaultValue={String(affiliate.commission_percent)}
              min={0}
              max={100}
              step="0.01"
            />
            <div>
              <label className="block text-sm font-medium text-glass-700 mb-1">Statut</label>
              <select
                name="status"
                defaultValue={affiliate.status}
                className="block w-full rounded-md border border-glass-300 px-3 py-2 text-sm"
              >
                <option value="active">Actif</option>
                <option value="pending">En attente</option>
                <option value="suspended">Suspendu</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-ocean-700 text-white px-4 py-2 text-sm hover:bg-ocean-800"
            >
              Enregistrer
            </button>
          </form>
        </div>

        <div className="bg-white border border-glass-200 rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-medium text-glass-900">Actions</h2>

          <div>
            <p className="text-xs uppercase tracking-wide text-glass-500 mb-1">
              Lien de partage affilié
            </p>
            <div className="flex items-center gap-2 font-mono text-xs bg-glass-50 rounded p-2 border border-glass-200">
              <span className="truncate">{refLink}</span>
            </div>
            <p className="text-xs text-glass-500 mt-1">
              Exemple deep link : <code>/r/{affiliate.code}?to=/fr/activite/&lt;code&gt;</code>
            </p>
          </div>

          <div className="border-t border-glass-100 pt-4 space-y-2">
            <form
              method="POST"
              action={`/api/admin/affiliates/${encodeURIComponent(affiliate.code)}/reset-password`}
            >
              <button
                type="submit"
                className="w-full rounded-md bg-purple-50 text-purple-800 px-4 py-2 text-sm hover:bg-purple-100 text-left"
              >
                🔑 Réinitialiser le mot de passe
              </button>
              <p className="text-xs text-glass-500 mt-1">
                Génère un nouveau mot de passe. Le précédent cesse de fonctionner
                immédiatement et toutes les sessions actives de l'affilié sont
                déconnectées.
              </p>
            </form>

            <form
              method="POST"
              action={`/api/admin/affiliates/${encodeURIComponent(affiliate.code)}/mark-confirmed`}
            >
              <button
                type="submit"
                className="w-full rounded-md bg-glass-100 text-gray-800 px-4 py-2 text-sm hover:bg-glass-200 text-left"
              >
                ✓ Marquer toutes les ventes « en attente » comme confirmées
              </button>
              <p className="text-xs text-glass-500 mt-1">
                Reconciliation manuelle tant qu'il n'y a pas de webhook Atlantico.
              </p>
            </form>

            <form
              method="POST"
              action={`/api/admin/affiliates/${encodeURIComponent(affiliate.code)}/payout`}
            >
              <button
                type="submit"
                className="w-full rounded-md bg-ocean-50 text-ocean-900 px-4 py-2 text-sm hover:bg-ocean-100 text-left"
              >
                € Payout : marquer les ventes confirmées comme payées
              </button>
              <p className="text-xs text-glass-500 mt-1">
                Action à faire après virement / paiement effectif.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Sales history */}
      <div className="bg-white border border-glass-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-glass-100">
          <h2 className="text-lg font-medium text-glass-900">Historique des ventes</h2>
          <p className="text-xs text-glass-500">{sales.length} ventes total</p>
        </div>
        {sales.length === 0 ? (
          <div className="p-8 text-center text-glass-500 text-sm">
            Aucune vente attribuée à ce code pour le moment.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-glass-50 text-glass-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Ref</th>
                <th className="text-left px-4 py-3 font-medium">Activité</th>
                <th className="text-right px-4 py-3 font-medium">Montant</th>
                <th className="text-right px-4 py-3 font-medium">Commission</th>
                <th className="text-center px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-100">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-glass-50">
                  <td className="px-4 py-3 text-glass-500 text-xs">
                    {new Date(s.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-glass-700">
                    {s.booking_reference ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-glass-900 truncate max-w-xs">
                    {s.activity_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-glass-700">
                    {s.amount != null ? `${s.amount.toFixed(2)} €` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-glass-700">
                    {s.commission_amount != null
                      ? `${s.commission_amount.toFixed(2)} €`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded ${SALE_STATUS_CLASS[s.status]}`}
                    >
                      {SALE_STATUS_LABEL[s.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-glass-200 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-glass-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-glass-900">{value}</div>
    </div>
  )
}

function SettingField({
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-glass-700 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...props}
        className="block w-full rounded-md border border-glass-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
      />
    </div>
  )
}
