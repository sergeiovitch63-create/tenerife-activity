/**
 * TrustBar вЂ” thin social-proof band before the footer.
 *
 * Intentionally NOT lazy-loaded вЂ” trust signals that load after the
 * user scrolls to them might as well not exist. Shows four concrete
 * stats (rating, reply time, cancellation, payment) plus a reassuring
 * tagline. Deliberately no partner logos: we only advertise what we
 * can actually prove.
 */
import { ShieldCheck, Star, MessageCircle, Lock } from 'lucide-react'

type Stat = {
  value: string
  label: string
}

type Props = {
  headline: string
  stats: Stat[]
}

const ICONS = [Star, MessageCircle, ShieldCheck, Lock] as const

export function TrustBar({ headline, stats }: Props) {
  return (
    <section className="container-x mt-24 mb-20">
      <div className="rounded-3xl bg-white border border-ink-100 px-6 py-8 md:px-10 md:py-10 shadow-card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((s, i) => {
            const Icon = ICONS[i] ?? ShieldCheck
            return (
              <div key={s.label} className="flex items-start gap-3">
                <span className="mt-0.5 h-9 w-9 rounded-full bg-brand-turquoise-50 text-brand-turquoise-700 inline-flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-base font-bold text-ink-900 leading-tight">
                    {s.value}
                  </div>
                  <div className="text-xs text-ink-500 leading-snug mt-0.5">
                    {s.label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {headline && (
          <p className="mt-6 pt-5 border-t border-ink-100 text-center text-sm text-ink-500">
            {headline}
          </p>
        )}
      </div>
    </section>
  )
}
