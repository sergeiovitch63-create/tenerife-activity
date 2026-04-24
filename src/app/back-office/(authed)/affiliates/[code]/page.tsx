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
export const metadata = { title: 'Détail affilié — Back Office' }

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

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Breadcrumb + titre */}
      <div>
        <div className="mb-2">
          <Link
            href="/back-office/affiliates"
            className="text-sm text-glass-500 hover:text-glass-700"
          >
            ← Affiliés
          </Link>
        </div>
        <div className="flex items-start flex-wrap gap-x-3 gap-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-glass-900">
            {affiliate.name}
          </h1>
          <span
            className={`text-xs px-2 py-1 rounded-md mt-1.5 ${STATUS_CLASS[affiliate.status]}`}
          >
            {STATUS_LABEL[affiliate.status]}
          </span>
        </div>
        <p className="text-sm text-glass-500 mt-1 font-mono">{affiliate.code}</p>
      </div>

      {/* Flash : credentials banner (compact mobile) */}
      {flash && flash.tone === 'creds' ? (
        <div className="rounded-2xl p-4 sm:p-5 bg-purple-50 border border-purple-200 space-y-3 shadow-sm">
          <div className="flex items-start gap-2">
            <div className="text-xl flex-shrink-0" aria-hidden>
              🔑
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-900">
                {flash.kind === 'new'
                  ? 'Affilié créé — identifiants à transmettre'
                  : 'Mot de passe réinitialisé — nouveaux identifiants'}
              </p>
              <p className="text-xs text-purple-700 mt-0.5">
                ⚠️ Le mot de passe n'est affiché qu'une seule fois. Copie-le
                maintenant et envoie-le au partenaire par email / WhatsApp.
              </p>
            </div>
          </div>

          <CredField label="Page de login" value={loginUrl} mono />
          <CredField label="Code partenaire" value={affiliate.code} mono />
          <CredField label="Mot de passe" value={flash.password} mono bold />
        </div>
      ) : flash && flash.tone !== 'ok' && flash.tone !== 'err' ? null : flash ? (
        <div
          className={`rounded-xl p-3.5 text-sm ${
            flash.tone === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {flash.text}
        </div>
      ) : null}

      {/* Stats 2x2 mobile, 4x1 desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard icon="🛒" label="Ventes total" value={affiliate.totalSales ?? 0} />
        <StatCard
          icon="✓"
          label="Confirmées"
          value={affiliate.confirmedSales ?? 0}
        />
        <StatCard
          icon="💵"
          label="Chiffre généré"
          value={`${totalGross.toFixed(2)} €`}
        />
        <StatCard
          icon="💰"
          label="Commission"
          value={`${(affiliate.confirmedCommission ?? 0).toFixed(2)} €`}
          highlight
        />
      </div>

      {/* Settings + actions : 1 col mobile, 2 cols desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="bg-white border border-glass-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-semibold text-glass-900">
            Paramètres
          </h2>
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
              <label className="block text-sm font-medium text-glass-700 mb-1.5">
                Statut
              </label>
              <select
                name="status"
                defaultValue={affiliate.status}
                className="block w-full rounded-lg border border-glass-300 px-3 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              >
                <option value="active">Actif</option>
                <option value="pending">En attente</option>
                <option value="suspended">Suspendu</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto rounded-lg bg-ocean-700 text-white px-5 py-2.5 text-sm font-medium hover:bg-ocean-800 transition shadow-sm"
            >
              Enregistrer
            </button>
          </form>
        </div>

        <div className="bg-white border border-glass-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-semibold text-glass-900">Actions</h2>

          <div className="space-y-2.5">
            <ActionButton
              action={`/api/admin/affiliates/${encodeURIComponent(affiliate.code)}/reset-password`}
              icon="🔑"
              title="Réinitialiser le mot de passe"
              desc="Génère un nouveau mot de passe. L'ancien cesse de fonctionner immédiatement."
              tone="purple"
            />
            <ActionButton
              action={`/api/admin/affiliates/${encodeURIComponent(affiliate.code)}/mark-confirmed`}
              icon="✓"
              title="Marquer les ventes « en attente » comme confirmées"
              desc="Reconciliation manuelle — après avoir vérifié dans le back-office Atlantico."
              tone="gray"
            />
            <ActionButton
              action={`/api/admin/affiliates/${encodeURIComponent(affiliate.code)}/payout`}
              icon="💶"
              title="Payer les commissions confirmées"
              desc="Marque comme payées. À faire après avoir effectué le virement."
              tone="ocean"
            />
          </div>
        </div>
      </div>

      {/* Historique ventes */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-glass-900">Historique des ventes</h2>
          <span className="text-xs text-glass-500">
            {sales.length} vente{sales.length > 1 ? 's' : ''}
          </span>
        </div>

        {sales.length === 0 ? (
          <div className="bg-white border border-glass-200 rounded-xl p-8 text-center text-sm text-glass-500">
            Aucune vente attribuée à ce code pour le moment.
          </div>
        ) : (
          <>
            {/* Desktop: tableau */}
            <div className="hidden lg:block bg-white border border-glass-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-glass-50 text-glass-500 text-xs uppercase tracking-wide border-b border-glass-200">
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
                    <tr key={s.id} className="hover:bg-ocean-50/40 transition">
                      <td className="px-4 py-3 text-glass-500 text-xs whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString('fr-FR')}
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
                      <td className="px-4 py-3 text-right font-semibold text-glass-900">
                        {s.commission_amount != null
                          ? `${s.commission_amount.toFixed(2)} €`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block text-xs px-2 py-1 rounded-md ${SALE_STATUS_CLASS[s.status]}`}
                        >
                          {SALE_STATUS_LABEL[s.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="lg:hidden space-y-2.5">
              {sales.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-glass-200 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-glass-900 truncate">
                        {s.activity_name ?? 'Activité non renseignée'}
                      </div>
                      <div className="text-xs text-glass-500 mt-0.5 font-mono truncate">
                        Ref {s.booking_reference ?? '—'} ·{' '}
                        {new Date(s.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs px-2 py-1 rounded-md ${SALE_STATUS_CLASS[s.status]}`}
                    >
                      {SALE_STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-glass-100">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-glass-400">
                        Montant
                      </div>
                      <div className="text-sm text-glass-700 mt-0.5">
                        {s.amount != null ? `${s.amount.toFixed(2)} €` : '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-glass-400">
                        Commission
                      </div>
                      <div className="text-sm font-semibold text-glass-900 mt-0.5">
                        {s.commission_amount != null
                          ? `${s.commission_amount.toFixed(2)} €`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: string
  label: string
  value: number | string
  highlight?: boolean
}) {
  return (
    <div
      className={`border rounded-xl p-3 sm:p-4 shadow-sm ${
        highlight ? 'bg-ocean-50 border-ocean-200' : 'bg-white border-glass-200'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wide text-glass-500">
        <span aria-hidden>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div
        className={`mt-1.5 text-lg sm:text-xl font-bold ${
          highlight ? 'text-ocean-900' : 'text-glass-900'
        }`}
      >
        {value}
      </div>
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
      <label htmlFor={name} className="block text-sm font-medium text-glass-700 mb-1.5">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...props}
        className="block w-full rounded-lg border border-glass-300 px-3 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
      />
    </div>
  )
}

function CredField({
  label,
  value,
  mono,
  bold,
}: {
  label: string
  value: string
  mono?: boolean
  bold?: boolean
}) {
  return (
    <div>
      <div className="text-xs font-medium text-purple-800 mb-1">{label}</div>
      <input
        readOnly
        defaultValue={value}
        onFocus={(e) => e.target.select()}
        className={`w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-sm ${
          mono ? 'font-mono' : ''
        } ${bold ? 'font-bold' : ''}`}
      />
    </div>
  )
}

function ActionButton({
  action,
  icon,
  title,
  desc,
  tone,
}: {
  action: string
  icon: string
  title: string
  desc: string
  tone: 'purple' | 'gray' | 'ocean'
}) {
  const buttonClasses = {
    purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900',
    gray: 'bg-glass-100 hover:bg-glass-200 border-glass-200 text-glass-900',
    ocean: 'bg-ocean-50 hover:bg-ocean-100 border-ocean-200 text-ocean-900',
  }[tone]
  return (
    <form method="POST" action={action}>
      <button
        type="submit"
        className={`w-full rounded-xl border px-4 py-3 text-left transition ${buttonClasses}`}
      >
        <div className="flex items-start gap-2.5">
          <span className="text-lg flex-shrink-0" aria-hidden>
            {icon}
          </span>
          <div className="min-w-0">
            <div className="font-medium text-sm">{title}</div>
            <div className="text-xs opacity-80 mt-0.5 leading-snug">{desc}</div>
          </div>
        </div>
      </button>
    </form>
  )
}
