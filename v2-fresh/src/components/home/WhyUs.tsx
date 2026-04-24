/**
 * WhyUs — objection-handling bloc.
 *
 * Three cards that answer the skepticism a first-time visitor has when
 * comparing us to GetYourGuide / Viator: Are you actually local? How do
 * you keep prices low? Is there a real human to talk to?
 *
 * Pure presentational component. Copy comes from the dictionary so every
 * locale renders with native phrasing.
 */
import { MapPin, Percent, Headphones } from 'lucide-react'
import type { Dict } from '@/i18n'

type Props = {
  dict: Dict['home']['whyUs']
}

const ICONS = [MapPin, Percent, Headphones]

export function WhyUs({ dict }: Props) {
  return (
    <section className="container-x mt-24">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <span className="chip-turquoise mb-2">{dict.badge}</span>
        <h2 className="h-display text-3xl md:text-4xl">{dict.title}</h2>
        <p className="text-ink-500 mt-2">{dict.subtitle}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {dict.cards.map((card, i) => {
          const Icon = ICONS[i] ?? MapPin
          return (
            <div
              key={card.title}
              className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-6 md:p-7 shadow-soft hover:shadow-card transition-all duration-300"
            >
              {/* Gold halo — behind icon, reveals on hover */}
              <div
                aria-hidden
                className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle, #F4BE3D 0%, transparent 70%)',
                }}
              />

              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(61,184,190,0.12) 0%, rgba(244,190,61,0.12) 100%)',
                }}
              >
                <Icon className="w-6 h-6 text-brand-turquoise-700" strokeWidth={2} />
              </div>

              <h3 className="font-display font-bold text-lg text-ink-900 tracking-tight">
                {card.title}
              </h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">{card.body}</p>

              {card.proof && (
                <div className="mt-4 pt-4 border-t border-ink-100 text-xs font-medium text-brand-turquoise-700 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-turquoise-500" />
                  {card.proof}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
