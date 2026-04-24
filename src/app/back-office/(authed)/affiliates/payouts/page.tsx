import Link from 'next/link'
import { getSql } from '@/lib/db/postgres'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Payouts — Back Office' }

interface PayoutRow {
  code: string
  name: string
  email: string | null
  confirmedCount: number
  confirmedTotal: number
  paidTotal: number
}

async function fetchPayoutSummary(): Promise<PayoutRow[]> {
  const sql = getSql()
  if (!sql) return []
  try {
    const rows = await sql`
      SELECT
        a.code, a.name, a.email,
        COUNT(s.id) FILTER (WHERE s.status = 'confirmed')::int AS confirmed_count,
        COALESCE(SUM(s.commission_amount) FILTER (WHERE s.status = 'confirmed'), 0)::float AS confirmed_total,
        COALESCE(SUM(s.commission_amount) FILTER (WHERE s.status = 'paid'), 0)::float AS paid_total
      FROM affiliates a
      LEFT JOIN affiliate_sales s ON s.affiliate_code = a.code
      GROUP BY a.code, a.name, a.email, a.created_at
      ORDER BY confirmed_total DESC, a.created_at DESC
    `
    return (rows as Array<Record<string, unknown>>).map((r) => ({
      code: String(r.code ?? ''),
      name: String(r.name ?? ''),
      email: r.email == null ? null : String(r.email),
      confirmedCount: Number(r.confirmed_count ?? 0),
      confirmedTotal: Number(r.confirmed_total ?? 0),
      paidTotal: Number(r.paid_total ?? 0),
    }))
  } catch (e) {
    console.error('[admin/payouts] fetchPayoutSummary failed', e)
    return []
  }
}

export default async function PayoutsPage() {
  const rows = await fetchPayoutSummary()

  const totalDue = rows.reduce((s, r) => s + r.confirmedTotal, 0)
  const totalPaid = rows.reduce((s, r) => s + r.paidTotal, 0)
  const toPay = rows.filter((r) => r.confirmedTotal > 0)

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <div className="mb-2">
          <Link
            href="/back-office/affiliates"
            className="text-sm text-glass-500 hover:text-glass-700"
          >
            ← Affiliés
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-glass-900">Payouts</h1>
        <p className="text-sm text-glass-600 mt-1 max-w-2xl">
          Commissions confirmées à verser aux partenaires. Clique{' '}
          <strong>« Payer »</strong> uniquement <em>après</em> avoir fait le virement
          réel — ça marque les ventes comme payées.
        </p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon="💰"
          label="À payer maintenant"
          value={`${totalDue.toFixed(2)} €`}
          highlight
        />
        <StatCard
          icon="👥"
          label="Partenaires concernés"
          value={toPay.length}
        />
        <StatCard
          icon="✅"
          label="Total déjà payé"
          value={`${totalPaid.toFixed(2)} €`}
        />
      </div>

      {/* Liste */}
      {rows.length === 0 ? (
        <div className="bg-white border border-glass-200 rounded-xl p-8 text-center text-sm text-glass-500">
          Aucun affilié.{' '}
          <Link
            href="/back-office/affiliates/new"
            className="text-ocean-700 hover:underline font-medium"
          >
            Crée-en un ici.
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop: tableau */}
          <div className="hidden md:block bg-white border border-glass-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-glass-50 text-glass-500 text-xs uppercase tracking-wide border-b border-glass-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Affilié</th>
                  <th className="text-right px-4 py-3 font-medium">Ventes conf.</th>
                  <th className="text-right px-4 py-3 font-medium">Montant dû</th>
                  <th className="text-right px-4 py-3 font-medium">Déjà payé</th>
                  <th className="text-right px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-100">
                {rows.map((r) => (
                  <tr key={r.code} className="hover:bg-ocean-50/40 transition">
                    <td className="px-4 py-3">
                      <Link
                        href={`/back-office/affiliates/${encodeURIComponent(r.code)}`}
                        className="font-medium text-glass-900 hover:text-ocean-700"
                      >
                        {r.name}
                      </Link>
                      <div className="text-xs text-glass-500 font-mono">{r.code}</div>
                      {r.email ? (
                        <div className="text-xs text-glass-500">{r.email}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right text-glass-700">
                      {r.confirmedCount}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-glass-900">
                      {r.confirmedTotal > 0
                        ? `${r.confirmedTotal.toFixed(2)} €`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-glass-500">
                      {r.paidTotal > 0 ? `${r.paidTotal.toFixed(2)} €` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.confirmedCount > 0 ? (
                        <form
                          method="POST"
                          action={`/api/admin/affiliates/${encodeURIComponent(r.code)}/payout`}
                        >
                          <button
                            type="submit"
                            className="rounded-lg bg-ocean-700 text-white px-3.5 py-1.5 text-xs font-medium hover:bg-ocean-800 transition shadow-sm whitespace-nowrap"
                          >
                            Payer {r.confirmedTotal.toFixed(2)} €
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-glass-400">Rien à payer</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {rows.map((r) => (
              <div
                key={r.code}
                className={`border rounded-xl p-4 shadow-sm ${
                  r.confirmedCount > 0
                    ? 'bg-ocean-50/30 border-ocean-200'
                    : 'bg-white border-glass-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/back-office/affiliates/${encodeURIComponent(r.code)}`}
                      className="font-semibold text-glass-900 hover:text-ocean-700 truncate block"
                    >
                      {r.name}
                    </Link>
                    <div className="text-xs font-mono text-glass-500 truncate">
                      {r.code}
                    </div>
                    {r.email ? (
                      <div className="text-xs text-glass-500 truncate">{r.email}</div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 py-3 border-y border-glass-100">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-glass-400">
                      Montant dû
                    </div>
                    <div className="text-base font-bold text-ocean-900 mt-0.5">
                      {r.confirmedTotal > 0
                        ? `${r.confirmedTotal.toFixed(2)} €`
                        : '—'}
                    </div>
                    <div className="text-[10px] text-glass-500 mt-0.5">
                      {r.confirmedCount} vente{r.confirmedCount > 1 ? 's' : ''} conf.
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-glass-400">
                      Déjà payé
                    </div>
                    <div className="text-sm text-glass-700 mt-0.5">
                      {r.paidTotal > 0 ? `${r.paidTotal.toFixed(2)} €` : '—'}
                    </div>
                  </div>
                </div>

                {r.confirmedCount > 0 ? (
                  <form
                    method="POST"
                    action={`/api/admin/affiliates/${encodeURIComponent(r.code)}/payout`}
                    className="mt-3"
                  >
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-ocean-700 text-white py-2.5 text-sm font-medium hover:bg-ocean-800 transition shadow-sm"
                    >
                      Payer {r.confirmedTotal.toFixed(2)} €
                    </button>
                  </form>
                ) : (
                  <div className="mt-3 text-center text-xs text-glass-400">
                    Rien à payer
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
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
      className={`border rounded-xl p-4 shadow-sm ${
        highlight ? 'bg-ocean-50 border-ocean-200' : 'bg-white border-glass-200'
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-glass-500">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div
        className={`mt-2 text-2xl sm:text-3xl font-bold ${
          highlight ? 'text-ocean-900' : 'text-glass-900'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
