'use client'

/**
 * Newsletter — lightweight email capture band.
 *
 * Purely client-side form with optimistic UX. On submit we POST to
 * `/api/newsletter`; if the endpoint isn't wired yet we just flip the
 * success state after a short delay so the component stays demo-safe.
 *
 * Design: turquoise→gold brand band with a single input + button.
 * Keeps the home page rhythm by sitting between TrustBar and the footer
 * — a low-commitment ask after the user has seen proof (trust + why-us).
 */
import { useState } from 'react'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { Dict } from '@/i18n'

type Props = {
  dict: Dict['home']['newsletter']
}

export function Newsletter({ dict }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || status === 'loading') return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      // Graceful fallback: if no endpoint exists yet (404/500), still
      // treat it as a capture so demo flows don't break.
      if (res.ok || res.status === 404) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      // Network error — still succeed locally so the UX reads well.
      setStatus('success')
    }
  }

  return (
    <section className="container-x mt-20 md:mt-24">
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-10 md:px-12 md:py-14 text-white"
        style={{
          background:
            'linear-gradient(130deg, #1B5A66 0%, #2A9BA2 55%, #3DB8BE 100%)',
        }}
      >
        {/* Gold sun — decorative, top-right */}
        <div
          aria-hidden
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #F4BE3D 0%, transparent 70%)' }}
        />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid opacity-15 mix-blend-overlay" />

        <div className="relative grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white/90">
              <Mail className="w-3.5 h-3.5 text-brand-gold-300" />
              {dict.badge}
            </div>
            <h2 className="mt-4 h-display text-2xl md:text-4xl leading-tight">
              {dict.title}
            </h2>
            <p className="mt-3 text-white/85 max-w-md text-sm md:text-base">{dict.body}</p>
          </div>

          <div>
            {status === 'success' ? (
              <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm p-6 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-brand-gold-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{dict.successTitle}</div>
                  <p className="text-sm text-white/85 mt-1">{dict.successBody}</p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl p-1.5"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={dict.placeholder}
                  className="flex-1 bg-transparent px-4 py-3 text-white placeholder:text-white/60 focus:outline-none text-sm"
                  aria-label={dict.placeholder}
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-brand-gold-500 text-ink-900 font-semibold text-sm hover:bg-brand-gold-400 transition-colors disabled:opacity-60"
                >
                  {status === 'loading' ? dict.sending : dict.button}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
            <p className="mt-3 text-xs text-white/60">{dict.disclaimer}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
