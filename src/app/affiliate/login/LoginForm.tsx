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

  const errorMessage = (() => {
    if (!error) return null
    if (error === 'bad_credentials') return 'Code ou mot de passe incorrect.'
    if (error === 'inactive') return 'Ton compte affilié est inactif. Contacte ton référent.'
    if (error === 'no_database') return 'Service indisponible, réessaie dans un instant.'
    return 'Connexion impossible, réessaie.'
  })()

  return (
    <form
      method="POST"
      action="/api/affiliate/login"
      onSubmit={() => setSubmitting(true)}
      className="space-y-3"
    >
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Code affilié
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
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="ex: hotel-h10"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
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
        disabled={submitting || !code || !password}
        className="w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
