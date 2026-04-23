import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin/auth'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Connexion' }

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; next?: string }
}) {
  if (await isAdminAuthenticated()) {
    redirect(searchParams?.next || '/back-office')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Back Office</h1>
          <p className="text-sm text-gray-500 mt-1">Tenerife Activity — Admin</p>
        </div>
        <LoginForm error={searchParams?.error} next={searchParams?.next} />
      </div>
    </div>
  )
}
