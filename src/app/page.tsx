import { redirect } from 'next/navigation'
import HomeClient from '@/components/HomeClient'
import { getCurrentUser, toSafeUser } from '@/lib/auth'

export default async function Home() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <HomeClient initialUser={toSafeUser(user)} />
}
