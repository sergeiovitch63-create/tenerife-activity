'use client'

import { useState } from 'react'

export default function LoginForm({ error, next }: { error?: string; next?: string }) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const errorMessage = (() => {
    if (!error) return null
    if (error === 'bad_password') return 'Mot de passe incorrect.'
    if (error === 'no_admin_password_env')
      return "Configuration serveur incomplète (ADMIN_PASSWORD absent). Contacte l'équipe technique."
    if (error === 'no_database') return 'Base de données indisponible, réessaie dans un instant.'
    return 'Connexion impossible, réessaie.'
  })()

  return (
    <form
      method="POST"
      action="/api/admin/login"
      onSubmit={() => setSubmitting(true)}
      className="space-y-4"
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-glass-700 mb-1.5"
        >
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full rounded-lg border border-glass-300 bg-white px-4 py-2.5 text-base text-glass-900 placeholder:text-glass-400 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 transition"
          placeholder="••••••••"
        />
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
        disabled={submitting || !password}
        className="w-full rounded-lg bg-ocean-700 text-white py-2.5 text-base font-medium hover:bg-ocean-800 active:bg-ocean-900 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
      >
        {submitting ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
