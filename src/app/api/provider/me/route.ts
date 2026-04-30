import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAdminProvider, getUserProvider, providerToSummary } from '@/lib/provider'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: '请先登录。' }, { status: 401 })
  }

  const [userProvider, adminProvider] = await Promise.all([
    getUserProvider(user.id),
    getAdminProvider(),
  ])

  return NextResponse.json({
    user: providerToSummary(userProvider),
    admin: providerToSummary(adminProvider),
  })
}
