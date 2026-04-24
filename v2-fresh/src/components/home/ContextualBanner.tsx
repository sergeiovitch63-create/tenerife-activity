/**
 * ContextualBanner вЂ” server-rendered home advisory.
 *
 * Renders a thin amber bar under the hero when the current month sits
 * inside a calima window (Jul-Aug primary, Feb-Mar secondary). Island-
 * wide message, no per-activity logic here. When no advisory applies
 * the component returns null, so the home consumer can embed it
 * unconditionally without leaving empty space.
 */
import { AlertTriangle } from 'lucide-react'
import { isCalimaWindow } from '@/lib/home/contextual'

type Props = {
  title: string
  body: string
}

export function ContextualBanner({ title, body }: Props) {
  if (!isCalimaWindow()) return null

  return (
    <div className="container-x -mt-6 relative z-10">
      <div className="rounded-2xl border border-brand-gold-200 bg-brand-gold-50 px-4 py-3 md:px-5 md:py-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold-500/15 text-brand-gold-700">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-brand-gold-900">{title}</div>
          <p className="mt-0.5 text-sm text-brand-gold-800/90">{body}</p>
        </div>
      </div>
    </div>
  )
}
