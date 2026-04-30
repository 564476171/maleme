import { NextResponse } from 'next/server'
import { getCurrentUser, toSafeUser } from '@/lib/auth'
import { getAdminProvider, getUserProvider, providerToSummary } from '@/lib/provider'
import { getEnabledBrothers } from '@/lib/content-db'
import { getRegistrationMode } from '@/lib/settings'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const [userProvider, adminProvider, brothers, registrationMode] =
    await Promise.all([
      getUserProvider(user.id),
      getAdminProvider(),
      getEnabledBrothers(),
      getRegistrationMode(),
    ])

  return NextResponse.json({
    user: toSafeUser(user),
    providers: {
      user: providerToSummary(userProvider),
      admin: providerToSummary(adminProvider),
    },
    brothers,
    registrationMode,
  })
}
