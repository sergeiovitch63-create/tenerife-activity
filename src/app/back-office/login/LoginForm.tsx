'use client'

import { useState } from 'react'

export default function LoginForm({ error, next }: { error?: string; next?: string }) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const errorMessage = (() => {
    if (!error) return null
    if (error === 'bad_password') return 'Mot de passe incorrect.'
    if (error === 'no_admin_password_env') return 'ADMIN_PASSWORD non configuré côté serveur.'
    if (error === 'no_database') return 'Base de données indisponible.'
    return 'Connexion impossible, réessaie.'
  })()

  return (
    <form
      method="POST"
      action="/api/admin/login"
      onSubmit={() => setSubmitting(true)}
      className="space-y-3"
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {errorMessage ? (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting || !password}
        className="w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
