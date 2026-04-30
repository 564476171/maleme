import { redirect } from 'next/navigation'
import LoginClient from '@/components/LoginClient'
import { getCurrentUser } from '@/lib/auth'
import { getRegistrationMode } from '@/lib/settings'

const loginErrors: Record<string, string> = {
  credentials: '邮箱或密码不对。',
  format: '邮箱或密码格式不对。',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const user = await getCurrentUser()

  if (user) {
    redirect('/')
  }

  const [registrationMode, params] = await Promise.all([
    getRegistrationMode(),
    searchParams,
  ])
  const initialError = params?.error ? loginErrors[params.error] : ''

  return (
    <LoginClient
      initialError={initialError}
      registrationMode={registrationMode}
    />
  )
}
