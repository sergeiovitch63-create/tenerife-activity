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
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(finalUrl)}`
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
    <div className="bg-white border border-glass-200 rounded-lg p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-glass-700 mb-2">Type de lien</label>
        <div className="flex flex-wrap gap-2">
          <PillButton active={linkType === 'home'} onClick={() => setLinkType('home')}>
            Page d'accueil
          </PillButton>
          <PillButton active={linkType === 'activity'} onClick={() => setLinkType('activity')}>
            Activité spécifique
          </PillButton>
          <PillButton active={linkType === 'custom'} onClick={() => setLinkType('custom')}>
            URL personnalisée
          </PillButton>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-glass-700 mb-1">Langue du visiteur</label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="block w-full sm:w-48 rounded-md border border-glass-300 px-3 py-2 text-sm"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="de">Deutsch</option>
          <option value="it">Italiano</option>
          <option value="ru">Русский</option>
        </select>
      </div>

      {linkType === 'activity' ? (
        <div>
          <label className="block text-sm font-medium text-glass-700 mb-1">
            Code d'activité (ex : <span className="font-mono">freebird-3h</span>)
          </label>
          <input
            value={activityCode}
            onChange={(e) => setActivityCode(e.target.value)}
            placeholder="slug de l'activité"
            className="block w-full rounded-md border border-glass-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-glass-500 mt-1">
            Visible dans l'URL de la page activité (après <code>/activite/</code>).
          </p>
        </div>
      ) : null}

      {linkType === 'custom' ? (
        <div>
          <label className="block text-sm font-medium text-glass-700 mb-1">
            Chemin sur le site (ex : <span className="font-mono">/fr/categorie/plongee</span>)
          </label>
          <input
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="/fr/…"
            className="block w-full rounded-md border border-glass-300 px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      <div className="border-t border-glass-100 pt-5 space-y-3">
        <div>
          <label className="block text-sm font-medium text-glass-700 mb-1">Ton lien</label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              className="flex-1 rounded-md border border-glass-300 bg-glass-50 px-3 py-2 text-sm font-mono"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={copy}
              className="rounded-md bg-ocean-700 text-white px-4 py-2 text-sm hover:bg-ocean-800 whitespace-nowrap"
            >
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start pt-2">
          <div>
            <div className="text-xs text-glass-500 mb-2">QR code</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="QR code du lien affilié"
              width={200}
              height={200}
              className="border border-glass-200 rounded"
            />
            <a
              href={qrUrl}
              download={`qr-${code}.png`}
              className="block text-xs text-ocean-700 hover:underline mt-1"
            >
              Télécharger le QR
            </a>
          </div>
          <div className="text-sm text-glass-600 space-y-2">
            <p>
              <strong>Pour ton site / blog :</strong> copie le lien et utilise-le comme
              n'importe quel lien HTML.
            </p>
            <p>
              <strong>Pour un flyer papier :</strong> télécharge le QR code et imprime-le.
              Les visiteurs scannent, arrivent sur le site, le tracking est automatique.
            </p>
            <p>
              <strong>Pour WhatsApp / Instagram :</strong> colle directement le lien, une
              preview s'affichera.
            </p>
          </div>
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
      className={`px-3 py-1.5 rounded-full text-sm border ${
        active
          ? 'bg-ocean-700 text-white border-ocean-700'
          : 'bg-white text-glass-700 border-glass-300 hover:bg-glass-50'
      }`}
    >
      {children}
    </button>
  )
}
