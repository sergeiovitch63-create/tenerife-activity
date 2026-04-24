/**
 * Event-Highlights card вЂ” compact "pick your flavour" comparison.
 *
 * Renders 2-3 of the richest event variants as side-by-side mini-cards
 * (name, icon chips, days/week, earliest time, price-from, one-line teaser).
 * Scoring + selection lives in
 * `src/lib/personalize/scorers/event-highlights.ts` so this component stays
 * purely presentational.
 *
 * Deliberately NOT a booking entry-point. The detailed OptionCard + calendar
 * still live in `src/components/ActivityDetailLayout.tsx`; this card only
 * tees up the "there are meaningful variants, here's the gist" read.
 */

import { Sparkles, CalendarDays, Clock, Tag } from 'lucide-react'
import { iconFor, iconLabel } from '@/data/icons'
import type { ModuleScore, ActivitySignals } from '@/lib/personalize/types'
import type {
  EventHighlight,
  EventHighlightsProps,
} from '@/lib/personalize/scorers/event-highlights'

type Props = {
  signals: ActivitySignals
  score: ModuleScore
  locale: string
}

export function EventHighlightsCard({ score: moduleScore, locale }: Props) {
  const props = moduleScore.props as EventHighlightsProps
  const labels = TRANSLATIONS[locale] ?? TRANSLATIONS.fr
  const { highlights, totalVariants } = props
  const more = totalVariants - highlights.length

  return (
    <div className="rounded-3xl border border-neutral-200 bg-gradient-to-br from-white to-brand-turquoise-50/30 p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-brand-turquoise-500 to-indigo-600 p-2.5 shadow-sm">
          <Sparkles className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900">{labels.title}</h3>
          <p className="mt-0.5 text-sm text-neutral-600">{labels.subtitle}</p>
        </div>
      </div>

      <ul
        className={`mt-4 grid gap-3 ${
          highlights.length === 1 ? 'grid-cols-1' : 'sm:grid-cols-2'
        }`}
      >
        {highlights.map((h, i) => (
          <HighlightCard key={h.code ?? i} h={h} locale={locale} labels={labels} />
        ))}
      </ul>

      {more > 0 && (
        <p className="mt-3 text-xs text-neutral-500">
          {interpolate(labels.moreVariants, { count: more })}
        </p>
      )}
    </div>
  )
}

function HighlightCard({
  h,
  locale,
  labels,
}: {
  h: EventHighlight
  locale: string
  labels: Record<string, string>
}) {
  const priceLabel =
    h.priceFrom != null
      ? new Intl.NumberFormat(locale === 'en' ? 'en-GB' : locale, {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(h.priceFrom)
      : null

  return (
    <li className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-3.5">
      <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
        {h.name}
      </h4>

      {h.teaser && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-neutral-600">
          {h.teaser}
        </p>
      )}

      {h.icons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {h.icons.slice(0, 4).map((raw, i) => {
            const Icon = iconFor(raw)
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-brand-turquoise-50 px-2 py-0.5 text-[10px] font-medium text-brand-turquoise-800 ring-1 ring-brand-turquoise-100"
              >
                <Icon className="h-3 w-3" />
                {iconLabel(raw, locale)}
              </span>
            )
          })}
          {h.icons.length > 4 && (
            <span className="inline-flex items-center rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600 ring-1 ring-neutral-200">
              +{h.icons.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[11px] text-neutral-600">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3 w-3 text-neutral-500" />
          {interpolate(labels.daysPerWeek, { count: h.daysPerWeek })}
        </span>
        {h.firstTime && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 text-neutral-500" />
            {h.firstTime}
          </span>
        )}
        {priceLabel && (
          <span className="ml-auto inline-flex items-center gap-1 font-semibold text-neutral-900">
            <Tag className="h-3 w-3 text-neutral-500" />
            {interpolate(labels.priceFrom, { price: priceLabel })}
          </span>
        )}
      </div>
    </li>
  )
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    title: 'Les variantes qui valent le dГ©tour',
    subtitle: 'Comparez en un coup d\'Е“il les formules les plus distinctes.',
    daysPerWeek: '{count} j/sem.',
    priceFrom: 'dГЁs {price}',
    moreVariants: '+{count} autre(s) formule(s) dans la liste complГЁte ci-dessous.',
  },
  en: {
    title: 'Variants worth a closer look',
    subtitle: 'Compare the most distinct formats at a glance.',
    daysPerWeek: '{count} d/wk',
    priceFrom: 'from {price}',
    moreVariants: '+{count} more option(s) in the full list below.',
  },
  es: {
    title: 'Variantes que merecen atenciГіn',
    subtitle: 'Compara las fГіrmulas mГЎs distintas de un vistazo.',
    daysPerWeek: '{count} d/sem.',
    priceFrom: 'desde {price}',
    moreVariants: '+{count} opciГіn(es) mГЎs en la lista completa abajo.',
  },
  de: {
    title: 'Varianten, die sich lohnen',
    subtitle: 'Vergleichen Sie die deutlichsten Formeln auf einen Blick.',
    daysPerWeek: '{count} T/Wo.',
    priceFrom: 'ab {price}',
    moreVariants: '+{count} weitere Option(en) in der vollstГ¤ndigen Liste unten.',
  },
  it: {
    title: 'Le varianti che valgono uno sguardo',
    subtitle: 'Confronta a colpo d\'occhio le formule piГ№ diverse.',
    daysPerWeek: '{count} g/set.',
    priceFrom: 'da {price}',
    moreVariants: '+{count} altra/e opzione/i nell\'elenco completo qui sotto.',
  },
  ru: {
    title: 'Р’Р°СЂРёР°РЅС‚С‹, РЅР° РєРѕС‚РѕСЂС‹Рµ СЃС‚РѕРёС‚ РІР·РіР»СЏРЅСѓС‚СЊ',
    subtitle: 'РЎСЂР°РІРЅРёС‚Рµ СЃР°РјС‹Рµ СЂР°Р·РЅС‹Рµ С„РѕСЂРјР°С‚С‹ РІ РѕРґРЅРѕРј РјРµСЃС‚Рµ.',
    daysPerWeek: '{count} РґРЅ./РЅРµРґ.',
    priceFrom: 'РѕС‚ {price}',
    moreVariants: 'Р•С‰С‘ +{count} РІР°СЂРёР°РЅС‚(Р°/РѕРІ) РІ РїРѕР»РЅРѕРј СЃРїРёСЃРєРµ РЅРёР¶Рµ.',
  },
}
