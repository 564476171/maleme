import { redirect } from 'next/navigation'
import RegisterClient from '@/components/RegisterClient'
import { getCurrentUser } from '@/lib/auth'
import { getRegistrationMode } from '@/lib/settings'

export default async function RegisterPage() {
  const user = await getCurrentUser()

  if (user) {
    redirect('/')
  }

  const registrationMode = await getRegistrationMode()

  if (registrationMode === 'CLOSED') {
    redirect('/login')
  }

  return <RegisterClient registrationMode={registrationMode} />
}
