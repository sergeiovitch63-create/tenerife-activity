'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Calendar, Users } from 'lucide-react'
import { useI18n } from '@/i18n/context'

export default function HeroSearch() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const [q, setQ] = useState('')
  const [when, setWhen] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        router.push(`/${locale}/activites${params.toString() ? `?${params}` : ''}`)
      }}
      className="relative bg-white rounded-2xl shadow-card p-2 flex flex-col md:flex-row items-stretch gap-1"
    >
      <label className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl hover:bg-ink-50 transition">
        <Search className="w-4 h-4 text-ink-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search.placeholder}
          className="w-full outline-none bg-transparent text-sm placeholder:text-ink-400"
        />
      </label>
      <span className="hidden md:block w-px bg-ink-100" />
      <label className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-ink-50 transition md:w-52">
        <Calendar className="w-4 h-4 text-ink-400" />
        <input
          type="date"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="w-full outline-none bg-transparent text-sm"
        />
      </label>
      <span className="hidden md:block w-px bg-ink-100" />
      <label className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-ink-50 transition md:w-44">
        <Users className="w-4 h-4 text-ink-400" />
        <select className="w-full outline-none bg-transparent text-sm" defaultValue="2">
          <option value="1">{t.search.participants.one}</option>
          <option value="2">{t.search.participants.two}</option>
          <option value="2-1">{t.search.participants.twoOneChild}</option>
          <option value="2-2">{t.search.participants.twoTwoChildren}</option>
          <option value="group">{t.search.participants.group}</option>
        </select>
      </label>
      <button type="submit" className="btn-gold px-6 md:px-8">
        {t.search.submit}
      </button>
    </form>
  )
}
