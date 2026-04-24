import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/affiliate/session'
import { listSalesForAffiliate, type SaleStatus } from '@/lib/back-office/affiliates'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Affilié — Commissions' }

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-glass-900">Mes commissions</h1>
        <p className="text-sm text-glass-500 mt-1">
          Suivi de toutes les ventes attribuées à ton code{' '}
          <span className="font-mono">{session.affiliateCode}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="En attente de confirmation"
          value={`${sums.pending.toFixed(2)} €`}
          tone="yellow"
          hint="Paiement encaissé mais statut à confirmer"
        />
        <SummaryCard
          label="À verser prochainement"
          value={`${sums.confirmed.toFixed(2)} €`}
          tone="green"
          hint="Confirmé, sera inclus au prochain versement"
        />
        <SummaryCard
          label="Total déjà versé"
          value={`${sums.paid.toFixed(2)} €`}
          tone="blue"
          hint="Cumulé à vie"
        />
      </div>

      <div className="bg-white border border-glass-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-glass-100">
          <h2 className="text-lg font-medium text-glass-900">
            Historique ({sales.length} vente{sales.length > 1 ? 's' : ''})
          </h2>
        </div>
        {sales.length === 0 ? (
          <div className="p-8 text-center text-glass-500 text-sm">
            Pas encore de vente. Partage tes liens pour commencer à toucher des
            commissions.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-glass-50 text-glass-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Activité</th>
                <th className="text-right px-4 py-3 font-medium">Montant vente</th>
                <th className="text-right px-4 py-3 font-medium">Ta commission</th>
                <th className="text-center px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-100">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-glass-50">
                  <td className="px-4 py-3 text-glass-500 text-xs whitespace-nowrap">
                    {new Date(s.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-glass-900 truncate max-w-xs">
                    {s.activity_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-glass-600">
                    {s.amount != null ? `${s.amount.toFixed(2)} €` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-glass-900">
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

function SummaryCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string
  tone: 'yellow' | 'green' | 'blue'
  hint: string
}) {
  const classes = {
    yellow: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-ocean-50 border-ocean-200',
  }[tone]
  return (
    <div className={`border rounded-lg p-4 ${classes}`}>
      <div className="text-xs uppercase tracking-wide text-glass-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-glass-900">{value}</div>
      <div className="text-xs text-glass-500 mt-1">{hint}</div>
    </div>
  )
}
