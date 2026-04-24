'use client'

import { useMemo, useState } from 'react'

type LinkType = 'home' | 'activity' | 'custom'

export default function LinkBuilder({ code, siteUrl }: { code: string; siteUrl: string }) {
  const [linkType, setLinkType] = useState<LinkType>('home')
  const [locale, setLocale] = useState<string>('fr')
  const [activityCode, setActivityCode] = useState('')
  const [customPath, setCustomPath] = useState('')
  const [copied, setCopied] = useState(false)

  const { url, qrUrl } = useMemo(() => {
    const base = `${siteUrl}/r/${encodeURIComponent(code)}`
    let finalUrl = base
    if (linkType === 'home') {
      finalUrl = `${base}?to=${encodeURIComponent('/' + locale)}`
    } else if (linkType === 'activity' && activityCode.trim()) {
      const slug = activityCode.trim().replace(/^\/+/, '')
      finalUrl = `${base}?to=${encodeURIComponent(`/${locale}/activite/${slug}`)}&a=${encodeURIComponent(slug)}`
    } else if (linkType === 'custom' && customPath.trim()) {
      let path = customPath.trim()
      if (!path.startsWith('/')) path = '/' + path
      finalUrl = `${base}?to=${encodeURIComponent(path)}`
    }
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(finalUrl)}`
    return { url: finalUrl, qrUrl }
  }, [linkType, locale, activityCode, customPath, siteUrl, code])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore — user can select and copy manually
    }
  }

  return (
    <div className="bg-white border border-glass-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
      {/* Type de lien */}
      <div>
        <label className="block text-sm font-medium text-glass-700 mb-2">
          Type de lien
        </label>
        <div className="flex flex-wrap gap-2">
          <PillButton active={linkType === 'home'} onClick={() => setLinkType('home')}>
            🏠 Accueil
          </PillButton>
          <PillButton active={linkType === 'activity'} onClick={() => setLinkType('activity')}>
            🎫 Activité
          </PillButton>
          <PillButton active={linkType === 'custom'} onClick={() => setLinkType('custom')}>
            🔗 URL custom
          </PillButton>
        </div>
      </div>

      {/* Langue */}
      <div>
        <label className="block text-sm font-medium text-glass-700 mb-1.5">
          Langue du visiteur
        </label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="block w-full sm:w-56 rounded-lg border border-glass-300 px-4 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
        >
          <option value="fr">🇫🇷 Français</option>
          <option value="en">🇬🇧 English</option>
          <option value="es">🇪🇸 Español</option>
          <option value="de">🇩🇪 Deutsch</option>
          <option value="it">🇮🇹 Italiano</option>
          <option value="ru">🇷🇺 Русский</option>
        </select>
      </div>

      {/* Champ conditionnel */}
      {linkType === 'activity' ? (
        <div>
          <label className="block text-sm font-medium text-glass-700 mb-1.5">
            Code de l'activité
          </label>
          <input
            value={activityCode}
            onChange={(e) => setActivityCode(e.target.value)}
            placeholder="ex: freebird-3h"
            className="block w-full rounded-lg border border-glass-300 px-4 py-2.5 text-base font-mono focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
          />
          <p className="text-xs text-glass-500 mt-1.5">
            Le slug visible dans l'URL de la page activité (après{' '}
            <code className="bg-glass-100 px-1 rounded">/activite/</code>).
          </p>
        </div>
      ) : null}

      {linkType === 'custom' ? (
        <div>
          <label className="block text-sm font-medium text-glass-700 mb-1.5">
            Chemin sur le site
          </label>
          <input
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="/fr/categorie/plongee"
            className="block w-full rounded-lg border border-glass-300 px-4 py-2.5 text-base font-mono focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
          />
        </div>
      ) : null}

      {/* Lien + copier */}
      <div className="border-t border-glass-100 pt-5">
        <label className="block text-sm font-medium text-glass-700 mb-2">
          Ton lien à partager
        </label>
        <div className="space-y-2">
          <input
            readOnly
            value={url}
            className="block w-full rounded-lg border border-glass-300 bg-glass-50 px-4 py-3 text-xs sm:text-sm font-mono break-all"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={copy}
            className="w-full sm:w-auto rounded-lg bg-ocean-700 text-white px-5 py-3 text-base font-medium hover:bg-ocean-800 transition shadow-sm"
          >
            {copied ? '✓ Copié !' : '📋 Copier le lien'}
          </button>
        </div>
      </div>

      {/* QR + usages : stack mobile, row desktop */}
      <div className="border-t border-glass-100 pt-5 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 md:gap-6">
        <div className="flex flex-col items-center md:items-start">
          <div className="text-xs uppercase tracking-wide text-glass-500 mb-2">
            QR code
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="QR code du lien affilié"
            width={200}
            height={200}
            className="w-48 h-48 sm:w-52 sm:h-52 border border-glass-200 rounded-lg"
          />
          <a
            href={qrUrl}
            download={`qr-${code}.png`}
            className="inline-flex items-center gap-1 mt-2 text-sm text-ocean-700 hover:text-ocean-900 font-medium"
          >
            ⬇ Télécharger
          </a>
        </div>

        <div className="text-sm text-glass-600 space-y-3 sm:space-y-4 pt-1">
          <Usage
            icon="🌐"
            title="Ton site / blog"
            text="Copie le lien, utilise-le comme n'importe quel lien HTML ou bouton."
          />
          <Usage
            icon="📄"
            title="Flyer papier / chambre d'hôtel"
            text="Télécharge le QR, imprime-le. Le visiteur scanne, arrive sur le site, le tracking est automatique."
          />
          <Usage
            icon="💬"
            title="WhatsApp / Instagram"
            text="Colle directement le lien — une preview avec image s'affichera."
          />
        </div>
      </div>
    </div>
  )
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-sm border transition ${
        active
          ? 'bg-ocean-700 text-white border-ocean-700 shadow-sm'
          : 'bg-white text-glass-700 border-glass-300 hover:bg-glass-50 hover:border-glass-400'
      }`}
    >
      {children}
    </button>
  )
}

function Usage({
  icon,
  title,
  text,
}: {
  icon: string
  title: string
  text: string
}) {
  return (
    <div className="flex gap-3">
      <div className="text-xl flex-shrink-0" aria-hidden>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-glass-900 text-sm">{title}</div>
        <div className="text-xs sm:text-sm text-glass-600 leading-relaxed mt-0.5">
          {text}
        </div>
      </div>
    </div>
  )
}
