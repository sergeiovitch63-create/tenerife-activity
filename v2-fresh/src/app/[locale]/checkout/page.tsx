'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import {
  ArrowRight, ArrowLeft, ShieldCheck, Lock, Check,
  User, Mail, Phone, MapPin, Home as HomeIcon,
} from 'lucide-react'
import LocaleLink from '@/components/LocaleLink'
import { useCart } from '@/lib/cart'
import { useI18n } from '@/i18n/context'
import { formatPrice } from '@/lib/utils'
import { atlanticoLangMap } from '@/lib/locale'

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart()
  const { t, locale } = useI18n()
  const [step, setStep] = useState(0)
  const [info, setInfo] = useState({
    firstName: '', lastName: '', email: '', phone: '', country: '',
    hotel: '', room: '', notes: '',
  })
  const [processing, setProcessing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const total = subtotal
  const steps = [t.checkout.stepInfo, t.checkout.stepDetails, t.checkout.stepPayment]

  if (items.length === 0 && !processing) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="h-display text-3xl">{t.checkout.emptyTitle}</h1>
        <p className="text-ink-500 mt-2">{t.checkout.emptyHint}</p>
        <LocaleLink href="/activites" className="btn-primary mt-6 inline-flex">
          {t.cart.explore}
        </LocaleLink>
      </div>
    )
  }

  const next = () => setStep((s) => Math.min(2, s + 1))
  const prev = () => setStep((s) => Math.max(0, s - 1))

  const first = items[0]

  const submitPayment = () => {
    if (!formRef.current) return
    setProcessing(true)
    // The cart is cleared AFTER the form has left the page: we do it on beforeunload
    // since the browser will navigate to the Atlantico/Redsys gateway.
    const onLeave = () => clear()
    window.addEventListener('pagehide', onLeave, { once: true })
    formRef.current.submit()
  }

  return (
    <div className="container-x py-10">
      <nav className="text-xs text-ink-500 mb-3">
        <LocaleLink href="/" className="hover:text-ink-800">{t.activity.breadcrumbHome}</LocaleLink>
        <span className="mx-1.5">/</span>
        <LocaleLink href="/panier" className="hover:text-ink-800">{t.nav.cart}</LocaleLink>
        <span className="mx-1.5">/</span>
        <span className="text-ink-700">{t.checkout.stepPayment}</span>
      </nav>

      <h1 className="h-display text-4xl md:text-5xl mb-8">{t.checkout.title}</h1>

      <ol className="flex items-center gap-3 md:gap-6 mb-10">
        {steps.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <li key={label} className="flex-1 flex items-center gap-2 md:gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-500'
              }`}>
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm ${active ? 'text-ink-900 font-semibold' : 'text-ink-500'}`}>{label}</span>
              {i < steps.length - 1 && <span className={`flex-1 h-px ${done ? 'bg-emerald-300' : 'bg-ink-200'}`} />}
            </li>
          )
        })}
      </ol>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        <div className="card p-6 md:p-8">
          {step === 0 && (
            <section>
              <h2 className="font-display text-2xl font-bold mb-1">{t.checkout.infoTitle}</h2>
              <p className="text-sm text-ink-500 mb-5">{t.checkout.infoHint}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <Field icon={User} label={t.checkout.firstName} value={info.firstName} onChange={(v) => setInfo({ ...info, firstName: v })} />
                <Field icon={User} label={t.checkout.lastName} value={info.lastName} onChange={(v) => setInfo({ ...info, lastName: v })} />
                <Field icon={Mail} label={t.checkout.email} type="email" value={info.email} onChange={(v) => setInfo({ ...info, email: v })} className="md:col-span-2" />
                <Field icon={Phone} label={t.checkout.phone} value={info.phone} onChange={(v) => setInfo({ ...info, phone: v })} />
                <Field icon={MapPin} label={t.checkout.country} value={info.country} onChange={(v) => setInfo({ ...info, country: v })} />
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={next} disabled={!info.firstName || !info.lastName || !info.email || !info.phone} className="btn-primary disabled:opacity-50">
                  {t.checkout.next} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <h2 className="font-display text-2xl font-bold mb-1">{t.checkout.detailsTitle}</h2>
              <p className="text-sm text-ink-500 mb-5">{t.checkout.detailsHint}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <Field icon={HomeIcon} label={t.checkout.hotel} value={info.hotel} onChange={(v) => setInfo({ ...info, hotel: v })} placeholder={t.checkout.hotelHint} className="md:col-span-2" />
                <Field label={t.checkout.room} value={info.room} onChange={(v) => setInfo({ ...info, room: v })} />
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide mb-1">{t.checkout.notes}</label>
                  <textarea
                    value={info.notes}
                    onChange={(e) => setInfo({ ...info, notes: e.target.value })}
                    placeholder={t.checkout.notesHint}
                    className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-ocean-500 min-h-[96px]"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={prev} className="btn-ghost">
                  <ArrowLeft className="w-4 h-4" /> {t.checkout.back}
                </button>
                <button onClick={next} className="btn-primary">
                  {t.checkout.next} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {step === 2 && first && (
            <section>
              <h2 className="font-display text-2xl font-bold mb-1 flex items-center gap-2">
                {t.checkout.paymentTitle} <Lock className="w-4 h-4 text-ink-400" />
              </h2>
              <p className="text-sm text-ink-500 mb-5">{t.checkout.paymentHint}</p>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900 flex gap-2 mb-6">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Atlantico Excursiones · Redsys</strong>
                  <p className="text-xs mt-1 text-emerald-800">{t.checkout.paymentHint}</p>
                </div>
              </div>

              {/* Hidden form that POSTs to our /api/booking/init which pipes Atlantico's response
                  (either a 303 to Redsys, or HTML with an auto-submit form) */}
              <form ref={formRef} method="POST" action="/api/booking/init" className="hidden">
                <input type="hidden" name="userId" value="3645" />
                <input type="hidden" name="t_id" value={first.eventCode} />
                <input type="hidden" name="t_group" value={first.groupCode} />
                <input type="hidden" name="language" value={atlanticoLangMap[locale]} />
                <input type="hidden" name="tourDate" value={first.date} />
                <input type="hidden" name="sesTime" value={first.timeSlot || '00:00'} />
                <input type="hidden" name="adults" value={String(first.adults)} />
                <input type="hidden" name="childs" value={String(first.children)} />
                <input type="hidden" name="infants" value={String(first.infants)} />
                <input type="hidden" name="name" value={`${info.firstName} ${info.lastName}`.trim()} />
                <input type="hidden" name="email" value={info.email} />
                <input type="hidden" name="phone" value={info.phone} />
                {info.hotel && <input type="hidden" name="hotel" value={info.hotel} />}
                {info.room && <input type="hidden" name="room" value={info.room} />}
                {info.notes && <input type="hidden" name="notes" value={info.notes} />}
              </form>

              <div className="flex justify-between items-center">
                <button onClick={prev} className="btn-ghost" disabled={processing}>
                  <ArrowLeft className="w-4 h-4" /> {t.checkout.back}
                </button>
                <button
                  onClick={submitPayment}
                  disabled={processing}
                  className="btn-ember text-base py-3.5 px-6"
                >
                  {processing ? t.checkout.processing : `${t.checkout.payNow} ${formatPrice(total, locale)}`}
                  {!processing && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="card p-6 sticky top-20">
          <h3 className="font-display text-lg font-bold mb-4">{t.cart.summary}</h3>
          <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {items.map((it) => (
              <li key={it.itemId} className="flex gap-3">
                {it.activityImage && (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={it.activityImage} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold line-clamp-2">{it.activityTitle}</p>
                  <p className="text-[11px] text-ink-500 truncate">
                    {it.optionTitle} · {it.date} · {it.adults}A{it.children > 0 ? ` ${it.children}E` : ''}
                  </p>
                </div>
                <span className="text-xs font-semibold whitespace-nowrap">
                  {formatPrice(it.unitAdult * it.adults + it.unitChild * it.children + it.unitInfant * (it.infants ?? 0), locale)}
                </span>
              </li>
            ))}
          </ul>
          <hr className="my-4 border-ink-100" />
          <div className="flex justify-between font-bold text-lg">
            <span>{t.cart.total}</span><span>{formatPrice(total, locale)}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Field({
  icon: Icon, label, value, onChange, type = 'text', placeholder, className = '',
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wide mb-1">{label}</label>
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-ink-200 bg-white ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 text-sm outline-none focus:border-ocean-500`}
        />
      </div>
    </div>
  )
}
