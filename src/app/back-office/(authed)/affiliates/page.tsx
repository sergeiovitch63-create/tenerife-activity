import Link from 'next/link'
import { listAffiliates, type AffiliateStatus } from '@/lib/back-office/affiliates'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Affiliés — Back Office' }

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
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-glass-900">Affiliés</h1>
          <p className="text-sm text-glass-600 mt-1">
            {affiliates.length} {affiliates.length > 1 ? 'partenaires' : 'partenaire'}
            {statusFilter ? ` · filtre : ${STATUS_LABEL[statusFilter]}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/back-office/affiliates/payouts"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-glass-200 text-glass-700 px-3.5 py-2 text-sm font-medium hover:bg-glass-50 transition"
          >
            <span aria-hidden>💶</span> Payouts
          </Link>
          <Link
            href="/back-office/affiliates/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-ocean-700 text-white px-3.5 py-2 text-sm font-medium hover:bg-ocean-800 transition shadow-sm"
          >
            <span aria-hidden>+</span> Nouvel affilié
          </Link>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-1 text-sm overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        <span className="text-xs text-glass-500 mr-2 whitespace-nowrap">Filtrer :</span>
        <FilterTab current={statusFilter} value={undefined} label="Tous" />
        <FilterTab current={statusFilter} value="active" label="Actifs" />
        <FilterTab current={statusFilter} value="pending" label="En attente" />
        <FilterTab current={statusFilter} value="suspended" label="Suspendus" />
      </div>

      {/* Liste */}
      {affiliates.length === 0 ? (
        <div className="bg-white border border-glass-200 rounded-xl p-8 sm:p-12 text-center">
          <div className="text-4xl mb-3" aria-hidden>
            👥
          </div>
          <h2 className="text-lg font-semibold text-glass-900 mb-1">
            Aucun partenaire pour l'instant
          </h2>
          <p className="text-sm text-glass-500 max-w-sm mx-auto mb-5">
            Crée ton premier affilié (hôtel, blog, guide, influenceur…). Le système
            générera automatiquement son code et son mot de passe.
          </p>
          <Link
            href="/back-office/affiliates/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-ocean-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-ocean-800 transition shadow-sm"
          >
            + Créer le premier
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop: tableau */}
          <div className="hidden md:block bg-white border border-glass-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-glass-50 text-glass-500 text-xs uppercase tracking-wide border-b border-glass-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">Nom</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-right px-4 py-3 font-medium">Comm.</th>
                  <th className="text-right px-4 py-3 font-medium">Ventes (conf.)</th>
                  <th className="text-right px-4 py-3 font-medium">Gagné (€)</th>
                  <th className="text-center px-4 py-3 font-medium">Statut</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-100">
                {affiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-ocean-50/40 transition">
                    <td className="px-4 py-3 font-mono text-xs text-glass-700">{a.code}</td>
                    <td className="px-4 py-3 text-glass-900 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-glass-500">{a.email ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-glass-700">
                      {a.commission_percent}%
                    </td>
                    <td className="px-4 py-3 text-right text-glass-700">
                      {a.confirmedSales ?? 0}{' '}
                      <span className="text-glass-400">/ {a.totalSales ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-glass-900 font-medium">
                      {(a.confirmedCommission ?? 0).toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block text-xs px-2 py-1 rounded-md ${STATUS_CLASS[a.status]}`}
                      >
                        {STATUS_LABEL[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/back-office/affiliates/${encodeURIComponent(a.code)}`}
                        className="text-ocean-700 hover:text-ocean-900 font-medium text-sm"
                      >
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {affiliates.map((a) => (
              <Link
                key={a.id}
                href={`/back-office/affiliates/${encodeURIComponent(a.code)}`}
                className="block bg-white border border-glass-200 rounded-xl p-4 shadow-sm hover:border-ocean-300 hover:shadow transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-medium text-glass-900 truncate">{a.name}</div>
                    <div className="text-xs font-mono text-glass-500 truncate">{a.code}</div>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs px-2 py-1 rounded-md ${STATUS_CLASS[a.status]}`}
                  >
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-glass-100">
                  <div>
                    <div className="text-glass-400 text-[10px] uppercase">Comm.</div>
                    <div className="font-semibold text-glass-900 mt-0.5">
                      {a.commission_percent}%
                    </div>
                  </div>
                  <div>
                    <div className="text-glass-400 text-[10px] uppercase">Ventes</div>
                    <div className="font-semibold text-glass-900 mt-0.5">
                      {a.confirmedSales ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-glass-400 text-[10px] uppercase">Gagné</div>
                    <div className="font-semibold text-glass-900 mt-0.5">
                      {(a.confirmedCommission ?? 0).toFixed(0)} €
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
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
      className={`px-3 py-1.5 rounded-md whitespace-nowrap transition ${
        active
          ? 'bg-ocean-100 text-ocean-900 font-medium'
          : 'text-glass-600 hover:bg-glass-100'
      }`}
    >
      {label}
    </Link>
  )
}
