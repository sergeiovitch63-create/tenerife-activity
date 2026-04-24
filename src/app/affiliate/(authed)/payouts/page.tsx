import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/affiliate/session'
import { listSalesForAffiliate, type SaleStatus } from '@/lib/back-office/affiliates'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Commissions — Tenerife Activity' }

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

export default async function AffiliatePayoutsPage() {
  const session = await getCurrentAffiliate()
  if (!session) redirect('/affiliate/login')

  const sales = await listSalesForAffiliate(session.affiliateCode, 500)

  const sums = sales.reduce(
    (acc, s) => {
      const c = s.commission_amount ?? 0
      if (s.status === 'pending') acc.pending += c
      else if (s.status === 'confirmed') acc.confirmed += c
      else if (s.status === 'paid') acc.paid += c
      return acc
    },
    { pending: 0, confirmed: 0, paid: 0 },
  )

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-glass-900">Mes commissions</h1>
        <p className="text-sm text-glass-600 mt-1">
          Suivi de toutes les ventes attribuées à ton code{' '}
          <span className="font-mono bg-glass-100 px-1.5 py-0.5 rounded text-xs">
            {session.affiliateCode}
          </span>
          .
        </p>
      </div>

      {/* Résumé : 1 col mobile, 3 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard
          label="En attente de confirmation"
          value={sums.pending}
          tone="yellow"
          hint="Paiement encaissé, statut pas encore validé par l'équipe"
        />
        <SummaryCard
          label="À verser prochainement"
          value={sums.confirmed}
          tone="green"
          hint="Confirmé — sera inclus au prochain virement"
        />
        <SummaryCard
          label="Total déjà versé"
          value={sums.paid}
          tone="blue"
          hint="Cumulé à vie"
        />
      </div>

      {/* Historique : tableau desktop / cards mobile */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-glass-900">Historique</h2>
          <span className="text-xs text-glass-500">
            {sales.length} vente{sales.length > 1 ? 's' : ''}
          </span>
        </div>

        {sales.length === 0 ? (
          <div className="bg-white border border-glass-200 rounded-xl p-8 sm:p-12 text-center">
            <div className="text-4xl mb-3" aria-hidden>
              🚀
            </div>
            <h3 className="font-semibold text-glass-900 mb-1">
              Pas encore de vente
            </h3>
            <p className="text-sm text-glass-500 max-w-sm mx-auto">
              Partage tes liens pour commencer à toucher des commissions.
              Rendez-vous dans « Mes liens » pour générer ton premier lien.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: tableau */}
            <div className="hidden md:block bg-white border border-glass-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-glass-50 text-glass-500 text-xs uppercase tracking-wide border-b border-glass-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Activité</th>
                    <th className="text-right px-4 py-3 font-medium">Vente</th>
                    <th className="text-right px-4 py-3 font-medium">Ta commission</th>
                    <th className="text-center px-4 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-100">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-ocean-50/40 transition">
                      <td className="px-4 py-3 text-glass-500 text-xs whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-glass-900 truncate max-w-xs">
                        {s.activity_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-glass-600">
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

            {/* Mobile: cards empilées */}
            <div className="md:hidden space-y-2.5">
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
                      <div className="text-xs text-glass-500 mt-0.5">
                        {new Date(s.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs px-2 py-1 rounded-md ${SALE_STATUS_CLASS[s.status]}`}
                    >
                      {SALE_STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-glass-100">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-glass-400">
                        Vente
                      </div>
                      <div className="text-sm text-glass-700 mt-0.5">
                        {s.amount != null ? `${s.amount.toFixed(2)} €` : '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-glass-400">
                        Ta commission
                      </div>
                      <div className="text-base font-bold text-ocean-900 mt-0.5">
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

function SummaryCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: number
  tone: 'yellow' | 'green' | 'blue'
  hint: string
}) {
  const classes = {
    yellow: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-ocean-50 border-ocean-200',
  }[tone]
  const valueColor = {
    yellow: 'text-amber-900',
    green: 'text-green-900',
    blue: 'text-ocean-900',
  }[tone]
  return (
    <div className={`border rounded-xl p-4 ${classes}`}>
      <div className="text-xs uppercase tracking-wide text-glass-600">{label}</div>
      <div className={`mt-2 text-2xl sm:text-3xl font-bold ${valueColor}`}>
        {value.toFixed(2)} €
      </div>
      <div className="text-xs text-glass-500 mt-1.5 leading-relaxed">{hint}</div>
    </div>
  )
}
