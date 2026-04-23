import Link from 'next/link'
import { listAffiliates, type AffiliateStatus } from '@/lib/back-office/affiliates'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Affiliés' }

const STATUS_LABEL: Record<AffiliateStatus, string> = {
  active: 'Actif',
  pending: 'En attente',
  suspended: 'Suspendu',
}

const STATUS_CLASS: Record<AffiliateStatus, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-gray-200 text-gray-700',
}

function parseStatusFilter(raw: string | undefined): AffiliateStatus | undefined {
  if (raw === 'active' || raw === 'pending' || raw === 'suspended') return raw
  return undefined
}

export default async function AffiliatesListPage({
  searchParams,
}: {
  searchParams?: { status?: string }
}) {
  const statusFilter = parseStatusFilter(searchParams?.status)
  const affiliates = await listAffiliates(statusFilter ? { status: statusFilter } : undefined)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Affiliés</h1>
          <p className="text-sm text-gray-500 mt-1">
            {affiliates.length} {affiliates.length > 1 ? 'affiliés' : 'affilié'}
            {statusFilter ? ` (filtre : ${STATUS_LABEL[statusFilter]})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/back-office/affiliates/payouts"
            className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 px-4 py-2 text-sm hover:bg-gray-200"
          >
            Payouts
          </Link>
          <Link
            href="/back-office/affiliates/new"
            className="inline-flex items-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
          >
            + Nouvel affilié
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500 mr-2">Filtrer :</span>
        <FilterTab current={statusFilter} value={undefined} label="Tous" />
        <FilterTab current={statusFilter} value="active" label="Actifs" />
        <FilterTab current={statusFilter} value="pending" label="En attente" />
        <FilterTab current={statusFilter} value="suspended" label="Suspendus" />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {affiliates.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Aucun affilié pour le moment.{' '}
            <Link href="/back-office/affiliates/new" className="text-blue-600 hover:underline">
              Créer le premier.
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium">Nom</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-right px-4 py-3 font-medium">Commission</th>
                <th className="text-right px-4 py-3 font-medium">Ventes (conf.)</th>
                <th className="text-right px-4 py-3 font-medium">Commission gagnée</th>
                <th className="text-center px-4 py-3 font-medium">Statut</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {affiliates.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{a.code}</td>
                  <td className="px-4 py-3 text-gray-900">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.email ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{a.commission_percent}%</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {a.confirmedSales ?? 0}{' '}
                    <span className="text-gray-400">/ {a.totalSales ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {(a.confirmedCommission ?? 0).toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded ${STATUS_CLASS[a.status]}`}
                    >
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/back-office/affiliates/${encodeURIComponent(a.code)}`}
                      className="text-blue-600 hover:underline"
                    >
                      Détail
                    </Link>
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

function FilterTab({
  current,
  value,
  label,
}: {
  current: AffiliateStatus | undefined
  value: AffiliateStatus | undefined
  label: string
}) {
  const href = value ? `/back-office/affiliates?status=${value}` : '/back-office/affiliates'
  const active = current === value
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded ${
        active
          ? 'bg-blue-100 text-blue-700 font-medium'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  )
}
