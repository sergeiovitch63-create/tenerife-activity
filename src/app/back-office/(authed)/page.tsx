import Link from 'next/link'
import { getSql } from '@/lib/db/postgres'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Tableau de bord' }

interface Stats {
  totalAffiliates: number
  activeAffiliates: number
  pendingSales: number
  confirmedSales: number
  lifetimeCommission: number
  dbConnected: boolean
}

async function fetchStats(): Promise<Stats> {
  const zero: Stats = {
    totalAffiliates: 0,
    activeAffiliates: 0,
    pendingSales: 0,
    confirmedSales: 0,
    lifetimeCommission: 0,
    dbConnected: false,
  }
  const sql = getSql()
  if (!sql) return zero
  try {
    const [affiliatesRows, salesRows] = await Promise.all([
      sql`SELECT status, COUNT(*)::int AS n FROM affiliates GROUP BY status`,
      sql`SELECT status, COUNT(*)::int AS n, COALESCE(SUM(commission_amount),0)::float AS total FROM affiliate_sales GROUP BY status`,
    ])
    const byAffStatus = new Map<string, number>()
    for (const r of affiliatesRows as Array<{ status: string; n: number }>) {
      byAffStatus.set(r.status, r.n)
    }
    const bySaleStatus = new Map<string, { n: number; total: number }>()
    for (const r of salesRows as Array<{ status: string; n: number; total: number }>) {
      bySaleStatus.set(r.status, { n: r.n, total: r.total })
    }
    const totalAffiliates = Array.from(byAffStatus.values()).reduce((a, b) => a + b, 0)
    return {
      totalAffiliates,
      activeAffiliates: byAffStatus.get('active') ?? 0,
      pendingSales: bySaleStatus.get('pending')?.n ?? 0,
      confirmedSales: bySaleStatus.get('confirmed')?.n ?? 0,
      lifetimeCommission:
        (bySaleStatus.get('confirmed')?.total ?? 0) + (bySaleStatus.get('paid')?.total ?? 0),
      dbConnected: true,
    }
  } catch (e) {
    console.error('[admin] fetchStats failed', e)
    return zero
  }
}

export default async function AdminHomePage() {
  const stats = await fetchStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue d'ensemble du système d'affiliation.
        </p>
      </div>

      {!stats.dbConnected ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4 text-sm">
          Base de données non connectée (<code>POSTGRES_URL</code> manquant).
          Les statistiques ne sont pas disponibles.
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Affiliés total" value={stats.totalAffiliates} />
        <StatCard label="Affiliés actifs" value={stats.activeAffiliates} />
        <StatCard label="Ventes en attente" value={stats.pendingSales} />
        <StatCard label="Ventes confirmées" value={stats.confirmedSales} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Commissions à vie (confirmées + payées)"
          value={`${stats.lifetimeCommission.toFixed(2)} €`}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/back-office/affiliates"
            className="inline-flex items-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
          >
            Gérer les affiliés
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}
