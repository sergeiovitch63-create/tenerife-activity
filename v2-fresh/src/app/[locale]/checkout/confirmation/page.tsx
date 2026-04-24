import { Check, Mail, Calendar, ArrowRight, Sparkles } from 'lucide-react'
import LocaleLink from '@/components/LocaleLink'
import { getDictionary } from '@/i18n'
import { isLocale, type Locale } from '@/lib/locale'

export default function ConfirmationPage({
  params,
  searchParams,
}: {
  params: { locale: string }
  searchParams: { ref?: string }
}) {
  const locale = (isLocale(params.locale) ? params.locale : 'fr') as Locale
  const t = getDictionary(locale)
  const ref = searchParams.ref ?? 'TNF-DEMO01'

  return (
    <div className="container-x py-20">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-6 shadow-card">
          <Check className="w-10 h-10" strokeWidth={3} />
        </div>
        <h1 className="h-display text-4xl md:text-5xl">{t.checkout.confirmTitle}</h1>
        <p className="text-ink-500 mt-3 text-lg">
          {t.checkout.confirmRef}&nbsp;: <strong className="text-ink-900">{ref}</strong>
        </p>

        <div className="card p-6 mt-8 text-left">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-brand-turquoise-600 mt-0.5 flex-shrink-0" />
              <span>{t.checkout.confirmText1}</span>
            </li>
            <li className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-brand-turquoise-600 mt-0.5 flex-shrink-0" />
              <span>{t.checkout.confirmText2}</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-brand-turquoise-600 mt-0.5 flex-shrink-0" />
              <span>{t.checkout.confirmText3}</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <LocaleLink href="/" className="btn-ghost">{t.checkout.confirmHome}</LocaleLink>
          <LocaleLink href="/activites" className="btn-primary">
            {t.checkout.confirmAnother} <ArrowRight className="w-4 h-4" />
          </LocaleLink>
        </div>
      </div>
    </div>
  )
}
