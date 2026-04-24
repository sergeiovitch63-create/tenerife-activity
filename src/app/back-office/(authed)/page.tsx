import Link from 'next/link'
import { getSql } from '@/lib/db/postgres'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard — Back Office' }

interface Stats {
  totalAffiliates: number
  activeAffiliates: number
  pendingAffiliates: number
  pendingSales: number
  confirmedSales: number
  paidSales: number
  totalCommissionsOwed: number
  totalCommissionsPaid: number
  dbConnected: boolean
}

async function fetchStats(): Promise<Stats> {
  const zero: Stats = {
    totalAffiliates: 0,
    activeAffiliates: 0,
    pendingAffiliates: 0,
    pendingSales: 0,
    confirmedSales: 0,
    paidSales: 0,
    totalCommissionsOwed: 0,
    totalCommissionsPaid: 0,
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
      pendingAffiliates: byAffStatus.get('pending') ?? 0,
      pendingSales: bySaleStatus.get('pending')?.n ?? 0,
      confirmedSales: bySaleStatus.get('confirmed')?.n ?? 0,
      paidSales: bySaleStatus.get('paid')?.n ?? 0,
      totalCommissionsOwed: bySaleStatus.get('confirmed')?.total ?? 0,
      totalCommissionsPaid: bySaleStatus.get('paid')?.total ?? 0,
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
    <div className="space-y-6 sm:space-y-8">
      {/* Hero */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-glass-900">Tableau de bord</h1>
        <p className="text-sm sm:text-base text-glass-600 mt-1">
          Vue d'ensemble de ton programme d'affiliation. Les données se
          rafraîchissent à chaque visite.
        </p>
      </div>

      {!stats.dbConnected ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm">
          <p className="font-medium">Base de données non connectée</p>
          <p className="mt-1">
            La variable <code className="bg-amber-100 px-1 rounded">POSTGRES_URL</code>{' '}
            est manquante. Les statistiques ne peuvent pas être calculées.
          </p>
        </div>
      ) : null}

      {/* Stats affiliés */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-glass-500">
          Partenaires
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon="👥" label="Affiliés total" value={stats.totalAffiliates} />
          <StatCard icon="✅" label="Actifs" value={stats.activeAffiliates} tone="green" />
          <StatCard icon="⏳" label="En attente" value={stats.pendingAffiliates} tone="amber" />
        </div>
      </section>

      {/* Stats ventes */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-glass-500">
          Ventes attribuées
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            icon="🕓"
            label="En attente"
            value={stats.pendingSales}
            hint="À valider manuellement"
            tone="amber"
          />
          <StatCard
            icon="✓"
            label="Confirmées"
            value={stats.confirmedSales}
            hint="À payer"
            tone="green"
          />
          <StatCard icon="💶" label="Déjà payées" value={stats.paidSales} tone="blue" />
        </div>
      </section>

      {/* Stats commissions */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-glass-500">
          Commissions (€)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <StatCard
            icon="💰"
            label="À verser prochainement"
            value={`${stats.totalCommissionsOwed.toFixed(2)} €`}
            hint="Ventes confirmées, en attente de virement"
            tone="amber"
            size="lg"
          />
          <StatCard
            icon="✅"
            label="Total versé à vie"
            value={`${stats.totalCommissionsPaid.toFixed(2)} €`}
            hint="Cumulé sur tous les partenaires"
            tone="blue"
            size="lg"
          />
        </div>
      </section>

      {/* Actions */}
      <section className="bg-white border border-glass-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-glass-900">Actions rapides</h2>
        <p className="text-sm text-glass-500 mt-1 mb-4">
          Accède directement aux écrans de gestion les plus utilisés.
        </p>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Link
            href="/back-office/affiliates"
            className="inline-flex items-center gap-2 rounded-lg bg-ocean-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-ocean-800 transition shadow-sm"
          >
            <span aria-hidden>👥</span> Gérer les affiliés
          </Link>
          <Link
            href="/back-office/affiliates/new"
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-ocean-200 text-ocean-900 px-4 py-2.5 text-sm font-medium hover:bg-ocean-50 transition"
          >
            <span aria-hidden>+</span> Nouvel affilié
          </Link>
          <Link
            href="/back-office/affiliates/payouts"
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-glass-200 text-glass-700 px-4 py-2.5 text-sm font-medium hover:bg-glass-50 transition"
          >
            <span aria-hidden>💶</span> Payouts
          </Link>
        </div>
      </section>

      {/* Aide */}
      <section className="bg-ocean-50 border border-ocean-100 rounded-2xl p-5 sm:p-6">
        <h2 className="text-base font-semibold text-ocean-900">Comment ça marche&nbsp;?</h2>
        <ol className="mt-3 space-y-2 text-sm text-ocean-900 list-decimal list-inside">
          <li>
            Tu crées un affilié depuis <strong>Affiliés → + Nouvel affilié</strong>. Le
            système génère un code + un mot de passe que tu transmets au partenaire.
          </li>
          <li>
            Le partenaire partage ses liens{' '}
            <code className="bg-white px-1 rounded">/r/CODE</code> depuis son espace.
            Chaque clic pose un cookie 30 jours.
          </li>
          <li>
            Quand un visiteur réserve, la commission est enregistrée automatiquement en
            statut <em>« en attente »</em>.
          </li>
          <li>
            Depuis la fiche de l'affilié, tu valides les ventes (<em>« confirmées »</em>)
            puis tu cliques <em>« Payer »</em> après avoir fait le virement.
          </li>
        </ol>
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'default',
  size = 'md',
}: {
  icon: string
  label: string
  value: number | string
  hint?: string
  tone?: 'default' | 'green' | 'amber' | 'blue'
  size?: 'md' | 'lg'
}) {
  const toneBorder = {
    default: 'border-glass-200',
    green: 'border-green-200',
    amber: 'border-amber-200',
    blue: 'border-ocean-200',
  }[tone]
  const valueColor = {
    default: 'text-glass-900',
    green: 'text-green-700',
    amber: 'text-amber-700',
    blue: 'text-ocean-900',
  }[tone]
  return (
    <div className={`bg-white border ${toneBorder} rounded-xl p-4 shadow-sm`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-glass-500">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div
        className={`mt-2 font-bold ${valueColor} ${
          size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
        }`}
      >
        {value}
      </div>
      {hint ? <div className="text-xs text-glass-500 mt-1">{hint}</div> : null}
    </div>
  )
}
