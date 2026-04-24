import Link from 'next/link'
import { getSql } from '@/lib/db/postgres'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Payouts' }

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
    <div className="space-y-6">
      <div>
        <div className="mb-2">
          <Link href="/back-office/affiliates" className="text-sm text-glass-500 hover:text-glass-700">
            ← Retour aux affiliés
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-glass-900">Payouts</h1>
        <p className="text-sm text-glass-500 mt-1">
          Commissions confirmées à verser aux affiliés. Clique « Payer » après avoir
          fait le virement réel — ça marque les ventes correspondantes comme payées.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="À payer maintenant" value={`${totalDue.toFixed(2)} €`} highlight />
        <StatCard label="Affiliés concernés" value={toPay.length} />
        <StatCard label="Déjà payé (total)" value={`${totalPaid.toFixed(2)} €`} />
      </div>

      <div className="bg-white border border-glass-200 rounded-lg overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-glass-500 text-sm">
            Aucun affilié. Crée-en un{' '}
            <Link href="/back-office/affiliates/new" className="text-ocean-700 hover:underline">
              ici
            </Link>
            .
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-glass-50 text-glass-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Affilié</th>
                <th className="text-right px-4 py-3 font-medium">Ventes confirmées</th>
                <th className="text-right px-4 py-3 font-medium">Montant dû</th>
                <th className="text-right px-4 py-3 font-medium">Déjà payé</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-100">
              {rows.map((r) => (
                <tr key={r.code} className="hover:bg-glass-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/back-office/affiliates/${encodeURIComponent(r.code)}`}
                      className="text-ocean-700 hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="text-xs text-glass-500 font-mono">{r.code}</div>
                    {r.email ? (
                      <div className="text-xs text-glass-500">{r.email}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right text-glass-700">{r.confirmedCount}</td>
                  <td className="px-4 py-3 text-right font-medium text-glass-900">
                    {r.confirmedTotal > 0 ? `${r.confirmedTotal.toFixed(2)} €` : '—'}
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
                          className="rounded-md bg-ocean-700 text-white px-3 py-1 text-xs hover:bg-ocean-800"
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
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: number | string
  highlight?: boolean
}) {
  return (
    <div
      className={`border rounded-lg p-4 ${
        highlight
          ? 'bg-ocean-50 border-ocean-200'
          : 'bg-white border-glass-200'
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
    </div>
  )
}
