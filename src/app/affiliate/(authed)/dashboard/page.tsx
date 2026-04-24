import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSql } from '@/lib/db/postgres'
import { getCurrentAffiliate } from '@/lib/affiliate/session'
import { listSalesForAffiliate, type SaleStatus } from '@/lib/back-office/affiliates'
import {
  getAffiliateDisplayState,
  TONE_BADGE_CLASS,
} from '@/lib/affiliate/sale-display'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tableau de bord — Tenerife Activity' }

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
        SELECT status, COUNT(*)::int AS n,
               COALESCE(SUM(commission_amount), 0)::float AS total
        FROM affiliate_sales
        WHERE affiliate_code = ${code}
        GROUP BY status
      `,
    ])
    const clicks = (clicksRows as Array<{ total: number; last30: number }>)[0] ?? {
      total: 0,
      last30: 0,
    }
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
    listSalesForAffiliate(session.affiliateCode, 5),
  ])

  const totalCommission = stats.commissionConfirmed + stats.commissionPaid

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-glass-900">
          Bonjour {session.name.split(' ')[0] || session.name}&nbsp;👋
        </h1>
        <p className="text-sm text-glass-600 mt-1">
          Tu touches <strong>{session.commissionPercent}%</strong> du montant brut
          sur chaque réservation attribuée à ton code{' '}
          <span className="font-mono bg-glass-100 px-1.5 py-0.5 rounded text-xs">
            {session.affiliateCode}
          </span>
          .
        </p>
      </div>

      {/* Hero card commission gagnée */}
      <div className="bg-gradient-to-br from-ocean-700 to-ocean-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg">
        <div className="text-xs uppercase tracking-wider text-ocean-200">
          💰 Commission gagnée à vie
        </div>
        <div className="mt-2 text-3xl sm:text-4xl font-bold">
          {totalCommission.toFixed(2)} €
        </div>
        <div className="mt-1 text-sm text-ocean-200">
          dont <strong className="text-white">{stats.commissionPaid.toFixed(2)} €</strong>{' '}
          déjà versés
        </div>
      </div>

      {/* 3 KPIs secondaires */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <StatCard icon="👆" label="Clics (30j)" value={stats.clicks30d} sub={`${stats.clicksTotal} total`} />
        <StatCard icon="📈" label="Conversion" value={`${stats.conversionRate}%`} sub="ventes / clics" />
        <StatCard
          icon="✅"
          label="Ventes OK"
          value={stats.salesConfirmed + stats.salesPaid}
          sub={stats.salesPending > 0 ? `${stats.salesPending} en attente` : undefined}
        />
      </div>

      {/* Actions */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-glass-500 mb-2.5">
          Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionCard
            href="/affiliate/links"
            icon="🔗"
            title="Générer un lien"
            desc="Créer un lien de partage + QR code pour ta page d'accueil ou une activité précise"
            primary
          />
          <ActionCard
            href="/affiliate/payouts"
            icon="💶"
            title="Mes commissions"
            desc="Historique complet des ventes et versements"
          />
          <ActionCard
            href="/affiliate/settings"
            icon="⚙️"
            title="Mes infos"
            desc="Email de contact pour recevoir tes virements"
          />
        </div>
      </section>

      {/* Ventes récentes */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-glass-900">Ventes récentes</h2>
          {recentSales.length > 0 ? (
            <Link
              href="/affiliate/payouts"
              className="text-sm text-ocean-700 hover:text-ocean-900 font-medium"
            >
              Tout voir →
            </Link>
          ) : null}
        </div>

        {recentSales.length === 0 ? (
          <div className="bg-white border border-glass-200 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3" aria-hidden>
              🚀
            </div>
            <h3 className="font-semibold text-glass-900 mb-1">Prêt à décoller ?</h3>
            <p className="text-sm text-glass-500 max-w-sm mx-auto mb-4">
              Partage ton premier lien et touche des commissions dès la première
              réservation.
            </p>
            <Link
              href="/affiliate/links"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ocean-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-ocean-800 transition"
            >
              🔗 Créer mon premier lien
            </Link>
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
                    <th className="text-right px-4 py-3 font-medium">Ta commission</th>
                    <th className="text-center px-4 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-100">
                  {recentSales.map((s) => {
                    const ds = getAffiliateDisplayState(s)
                    return (
                      <tr key={s.id} className="hover:bg-ocean-50/40 transition">
                        <td className="px-4 py-3 text-glass-500 text-xs whitespace-nowrap">
                          {new Date(s.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-glass-900 truncate max-w-xs">
                          {s.activity_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-glass-900">
                          {s.commission_amount != null
                            ? `${s.commission_amount.toFixed(2)} €`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ${TONE_BADGE_CLASS[ds.tone]}`}
                            title={ds.hint}
                          >
                            <span aria-hidden>{ds.icon}</span>
                            <span>{ds.label}</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden space-y-2.5">
              {recentSales.map((s) => {
                const ds = getAffiliateDisplayState(s)
                return (
                  <div
                    key={s.id}
                    className="bg-white border border-glass-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-glass-900 truncate">
                          {s.activity_name ?? 'Activité non renseignée'}
                        </div>
                        <div className="text-xs text-glass-500 mt-0.5">
                          Réservée le{' '}
                          {new Date(s.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </div>
                      </div>
                      <span
                        className={`flex-shrink-0 text-xs px-2 py-1 rounded-md ${TONE_BADGE_CLASS[ds.tone]}`}
                      >
                        {ds.icon}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <div className="text-lg font-bold text-ocean-900">
                        {s.commission_amount != null
                          ? `+ ${s.commission_amount.toFixed(2)} €`
                          : '—'}
                      </div>
                      <div className="text-[11px] text-glass-600 text-right truncate max-w-[55%]">
                        {ds.label}
                      </div>
                    </div>
                  </div>
                )
              })}
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
  sub,
}: {
  icon: string
  label: string
  value: number | string
  sub?: string
}) {
  return (
    <div className="bg-white border border-glass-200 rounded-xl p-3 sm:p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wide text-glass-500">
        <span aria-hidden>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl sm:text-2xl font-bold text-glass-900">{value}</div>
      {sub ? <div className="text-[10px] sm:text-xs text-glass-500 mt-0.5 truncate">{sub}</div> : null}
    </div>
  )
}

function ActionCard({
  href,
  icon,
  title,
  desc,
  primary,
}: {
  href: string
  icon: string
  title: string
  desc: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-xl p-4 sm:p-5 border shadow-sm transition ${
        primary
          ? 'bg-ocean-50 border-ocean-200 hover:border-ocean-400 hover:shadow'
          : 'bg-white border-glass-200 hover:border-ocean-300 hover:shadow'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0" aria-hidden>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-glass-900 group-hover:text-ocean-900">
            {title}
          </div>
          <div className="text-xs sm:text-sm text-glass-600 mt-1 leading-snug">
            {desc}
          </div>
        </div>
      </div>
    </Link>
  )
}
