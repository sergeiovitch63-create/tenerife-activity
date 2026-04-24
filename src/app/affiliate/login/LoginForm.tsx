'use client'

import { useState } from 'react'

export default function LoginForm({
  error,
  defaultCode,
}: {
  error?: string
  defaultCode?: string
}) {
  const [code, setCode] = useState(defaultCode ?? '')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const errorMessage = (() => {
    if (!error) return null
    if (error === 'bad_credentials') return 'Code ou mot de passe incorrect.'
    if (error === 'inactive')
      return "Ton compte partenaire n'est pas actif. Contacte ton référent Tenerife Activity."
    if (error === 'no_database') return 'Service indisponible, réessaie dans un instant.'
    return 'Connexion impossible, réessaie.'
  })()

  return (
    <form
      method="POST"
      action="/api/affiliate/login"
      onSubmit={() => setSubmitting(true)}
      className="space-y-4"
    >
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-glass-700 mb-1.5">
          Code partenaire
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          autoFocus
          autoComplete="username"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ex: hotel-h10"
          className="block w-full rounded-lg border border-glass-300 bg-white px-4 py-2.5 text-base font-mono text-glass-900 placeholder:text-glass-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-glass-700 mb-1.5"
        >
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPwd ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="block w-full rounded-lg border border-glass-300 bg-white px-4 py-2.5 pr-12 text-base text-glass-900 placeholder:text-glass-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className="absolute inset-y-0 right-0 px-3 text-xs text-ocean-700 hover:text-ocean-900"
          >
            {showPwd ? 'Masquer' : 'Afficher'}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || !code || !password}
        className="w-full rounded-lg bg-ocean-700 text-white py-3 text-base font-medium hover:bg-ocean-800 active:bg-ocean-900 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
      >
        {submitting ? 'Connexion…' : 'Accéder à mon espace'}
      </button>
    </form>
  )
}
