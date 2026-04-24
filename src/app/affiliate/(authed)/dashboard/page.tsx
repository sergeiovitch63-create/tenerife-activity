import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSql } from '@/lib/db/postgres'
import { getCurrentAffiliate } from '@/lib/affiliate/session'
import {
  listSalesForAffiliate,
  type SaleStatus,
} from '@/lib/back-office/affiliates'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Affilié — Tableau de bord' }

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

interface DashboardStats {
  clicks30d: number
  clicksTotal: number
  salesPending: number
  salesConfirmed: number
  salesPaid: number
  commissionPending: number
  commissionConfirmed: number
  commissionPaid: number
  conversionRate: number
}

async function fetchStats(code: string): Promise<DashboardStats> {
  const sql = getSql()
  const zero: DashboardStats = {
    clicks30d: 0,
    clicksTotal: 0,
    salesPending: 0,
    salesConfirmed: 0,
    salesPaid: 0,
    commissionPending: 0,
    commissionConfirmed: 0,
    commissionPaid: 0,
    conversionRate: 0,
  }
  if (!sql) return zero

  try {
    const [clicksRows, salesRows] = await Promise.all([
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE clicked_at > now() - interval '30 days')::int AS last30
        FROM affiliate_clicks
        WHERE affiliate_code = ${code}
      `,
      sql`
        SELECT
          status,
          COUNT(*)::int AS n,
          COALESCE(SUM(commission_amount), 0)::float AS total
        FROM affiliate_sales
        WHERE affiliate_code = ${code}
        GROUP BY status
      `,
    ])

    const clicks = (clicksRows as Array<{ total: number; last30: number }>)[0] ?? { total: 0, last30: 0 }
    const byStatus = new Map<SaleStatus, { n: number; total: number }>()
    for (const r of salesRows as Array<{ status: SaleStatus; n: number; total: number }>) {
      byStatus.set(r.status, { n: r.n, total: r.total })
    }
    const salesPending = byStatus.get('pending')?.n ?? 0
    const salesConfirmed = byStatus.get('confirmed')?.n ?? 0
    const salesPaid = byStatus.get('paid')?.n ?? 0
    const allSales = salesPending + salesConfirmed + salesPaid
    const conversionRate = clicks.total > 0 ? (allSales / clicks.total) * 100 : 0

    return {
      clicks30d: clicks.last30,
      clicksTotal: clicks.total,
      salesPending,
      salesConfirmed,
      salesPaid,
      commissionPending: byStatus.get('pending')?.total ?? 0,
      commissionConfirmed: byStatus.get('confirmed')?.total ?? 0,
      commissionPaid: byStatus.get('paid')?.total ?? 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
    }
  } catch (e) {
    console.error('[affiliate/dashboard] fetchStats failed', e)
    return zero
  }
}

export default async function AffiliateDashboardPage() {
  const session = await getCurrentAffiliate()
  if (!session) redirect('/affiliate/login')

  const [stats, recentSales] = await Promise.all([
    fetchStats(session.affiliateCode),
    listSalesForAffiliate(session.affiliateCode, 10),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-glass-900">Bonjour {session.name}</h1>
        <p className="text-sm text-glass-500 mt-1">
          Ton code :{' '}
          <span className="font-mono text-glass-700">{session.affiliateCode}</span>{' '}
          · Commission : <span className="font-medium">{session.commissionPercent}%</span> du
          montant brut
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Clics (30j)" value={stats.clicks30d} sub={`${stats.clicksTotal} total`} />
        <StatCard
          label="Taux de conversion"
          value={`${stats.conversionRate}%`}
          sub="ventes / clics"
        />
        <StatCard
          label="Ventes confirmées"
          value={stats.salesConfirmed + stats.salesPaid}
          sub={`${stats.salesPending} en attente`}
        />
        <StatCard
          label="Commission gagnée"
          value={`${(stats.commissionConfirmed + stats.commissionPaid).toFixed(2)} €`}
          sub={`${stats.commissionPaid.toFixed(2)} € déjà versé`}
          highlight
        />
      </div>

      <div className="bg-white border border-glass-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-glass-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/affiliate/links"
            className="block rounded-md border border-glass-200 p-4 hover:bg-glass-50"
          >
            <div className="font-medium text-glass-900">Générer un lien</div>
            <div className="text-xs text-glass-500 mt-1">
              Partager vers une activité ou ta page d'accueil affilié
            </div>
          </Link>
          <Link
            href="/affiliate/payouts"
            className="block rounded-md border border-glass-200 p-4 hover:bg-glass-50"
          >
            <div className="font-medium text-glass-900">Mes commissions</div>
            <div className="text-xs text-glass-500 mt-1">
              Historique des ventes et versements
            </div>
          </Link>
          <Link
            href="/affiliate/settings"
            className="block rounded-md border border-glass-200 p-4 hover:bg-glass-50"
          >
            <div className="font-medium text-glass-900">Mes infos</div>
            <div className="text-xs text-glass-500 mt-1">
              Email de contact pour les versements
            </div>
          </Link>
        </div>
      </div>

      <div className="bg-white border border-glass-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-glass-100 flex items-center justify-between">
          <h2 className="text-lg font-medium text-glass-900">Ventes récentes</h2>
          <Link
            href="/affiliate/payouts"
            className="text-sm text-ocean-700 hover:underline"
          >
            Tout voir →
          </Link>
        </div>
        {recentSales.length === 0 ? (
          <div className="p-8 text-center text-glass-500 text-sm">
            Aucune vente pour le moment. Partage tes liens pour commencer ! 🚀
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-glass-50 text-glass-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Activité</th>
                <th className="text-right px-4 py-3 font-medium">Commission</th>
                <th className="text-center px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-100">
              {recentSales.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-glass-500 text-xs">
                    {new Date(s.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-glass-900 truncate max-w-xs">
                    {s.activity_name ?? '—'}
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

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: number | string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`border rounded-lg p-4 ${
        highlight ? 'bg-ocean-50 border-ocean-200' : 'bg-white border-glass-200'
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-glass-500">{label}</div>
      <div
        className={`mt-2 text-2xl font-semibold ${
          highlight ? 'text-ocean-900' : 'text-glass-900'
        }`}
      >
        {value}
      </div>
      {sub ? <div className="text-xs text-glass-500 mt-1">{sub}</div> : null}
    </div>
  )
}
