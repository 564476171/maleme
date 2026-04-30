import { redirect } from 'next/navigation'
import LoginClient from '@/components/LoginClient'
import { getCurrentUser } from '@/lib/auth'
import { getRegistrationMode } from '@/lib/settings'

export default async function LoginPage() {
  const user = await getCurrentUser()

  if (user) {
    redirect('/')
  }

  const registrationMode = await getRegistrationMode()

  return <LoginClient registrationMode={registrationMode} />
}
