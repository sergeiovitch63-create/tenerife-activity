import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.inspired' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function InspiredPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale })

  // We keep translations available in case you want to localize texts later
  const title = t('inspired.title')
  const subtitle = t('inspired.subtitle')

  return (
    <main className="min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#0d2b35] via-[#1a6b7c] to-[#0f3d4a] text-white relative">
      {/* Hero content with "bonhomme" asking questions */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 sm:px-8">
        <div className="max-w-5xl w-full flex flex-col gap-10 md:flex-row md:items-center">
          {/* Left: main title/subtitle */}
          <div className="flex-1 space-y-6 text-center md:text-left">
            <p className="text-sm tracking-[0.3em] uppercase text-white/70">
              Tenerife Activity
            </p>
            <h1 className="font-['Playfair_Display'] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              {title || 'Laissez Tenerife vous inspirer'}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/85 leading-relaxed font-light max-w-2xl md:max-w-none mx-auto md:mx-0">
              {subtitle ||
                "Fermez les yeux, imaginez l'océan, le Teide et une journée parfaite. Nous nous occupons du reste."}
            </p>

            {/* Small pill / tag line */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 backdrop-blur-sm border border-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e8694a]" />
              <span className="text-xs sm:text-sm font-medium tracking-wide">
                Créé sur-mesure pour vous
              </span>
            </div>
          </div>

          {/* Right: little character asking questions */}
          <div className="flex-1 flex justify-center md:justify-end">
            <div className="relative max-w-sm w-full bg-white/5 border border-white/15 rounded-3xl p-5 sm:p-6 backdrop-blur-lg shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
              {/* Avatar circle */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#f5efe6] via-[#d4a843] to-[#e8694a] flex items-center justify-center text-[#0d2b35] font-bold text-xl shadow-md">
                  M
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Marco, ton guide local</p>
                  <p className="text-xs text-white/75">Dis‑moi ce que tu aimes, je m’occupe du reste.</p>
                </div>
              </div>

              {/* Questions bubbles */}
              <div className="mt-5 space-y-3 text-sm">
                <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/10">
                  <p>Tu voyages en couple, en famille ou entre amis&nbsp;?</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-3 border border-white/5">
                  <p>Plutôt aventure, détente ou coucher de soleil romantique&nbsp;?</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-3 border border-white/5">
                  <p>Tu préfères la mer, la montagne, ou un mix des deux&nbsp;?</p>
                </div>
              </div>

              {/* Hint text */}
              <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/55">
                Une sélection d’expériences rien que pour toi
              </p>

              {/* Decorative accent */}
              <div className="pointer-events-none absolute -right-5 -bottom-5 h-20 w-20 rounded-full bg-gradient-to-tr from-[#e8694a] via-[#d4a843] to-transparent opacity-40 blur-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Decorative waves at the bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[35vh] overflow-hidden">
        <div className="absolute inset-x-[-10%] bottom-[-8%] h-[140%] bg-[radial-gradient(circle_at_20%_0,#f5efe6_0,transparent_55%),radial-gradient(circle_at_80%_10%,#d4a843_0,transparent_55%)] opacity-80 mix-blend-screen" />
        <div
          className="absolute inset-x-[-10%] bottom-[-18%] h-[160%] bg-[#0d2b35]/90"
          style={{
            clipPath:
              'path("M0,320 C160,280 320,340 480,320 C640,300 800,260 960,280 C1120,300 1280,360 1440,340 L1440,640 L0,640 Z")',
          }}
        />
      </div>
    </main>
  )
}
