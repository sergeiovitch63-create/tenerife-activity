import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/affiliate/session'
import { getSiteUrl } from '@/lib/site-url'
import LinkBuilder from './LinkBuilder'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Affilié — Mes liens' }

export default async function AffiliateLinksPage() {
  const session = await getCurrentAffiliate()
  if (!session) redirect('/affiliate/login')

  const siteUrl = getSiteUrl()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-glass-900">Mes liens affiliés</h1>
        <p className="text-sm text-glass-500 mt-1">
          Partage ces liens — chaque clic qui mène à une réservation dans les 30 jours
          t'attribue la commission ({session.commissionPercent}% du montant brut).
        </p>
      </div>

      <LinkBuilder code={session.affiliateCode} siteUrl={siteUrl} />

      <div className="bg-ocean-50 border border-ocean-200 rounded-md p-4 text-sm space-y-2">
        <p className="font-medium text-ocean-900">Comment ça marche</p>
        <ol className="list-decimal list-inside text-ocean-900 space-y-1">
          <li>
            Quand un visiteur clique sur ton lien, un cookie est posé (30 jours) avec
            ton code <span className="font-mono">{session.affiliateCode}</span>.
          </li>
          <li>
            S'il réserve pendant cette fenêtre (même plusieurs jours plus tard, même
            sur une autre activité), la vente t'est attribuée.
          </li>
          <li>
            Tu peux suivre tes ventes en temps réel sur le tableau de bord.
          </li>
        </ol>
      </div>
    </div>
  )
}
