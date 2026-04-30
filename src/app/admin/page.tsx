import AdminClient from '@/components/AdminClient'
import { requireAdmin, toSafeUser } from '@/lib/auth'

export default async function AdminPage() {
  const user = await requireAdmin()

  return <AdminClient currentUser={toSafeUser(user)} />
}
