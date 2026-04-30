import { NextResponse } from 'next/server'
import { getCurrentUser, toSafeUser } from '@/lib/auth'
import { getDailyContent, getEnabledBrothers } from '@/lib/content-db'
import { prisma } from '@/lib/prisma'
import { getAdminProvider, getUserProvider, providerToSummary } from '@/lib/provider'
import { getDateKey, getPreviousDateKey } from '@/lib/scoring'
import { getRegistrationMode } from '@/lib/settings'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: '请先登录。' }, { status: 401 })
  }

  try {
    const [
      history,
      dailyContent,
      brothers,
      userProvider,
      adminProvider,
      registrationMode,
    ] = await Promise.all([
      prisma.checkIn.findMany({
        where: { userId: user.id },
        orderBy: { dateKey: 'desc' },
        take: 30,
      }),
      getDailyContent(),
      getEnabledBrothers(),
      getUserProvider(user.id),
      getAdminProvider(),
      getRegistrationMode(),
    ])

    const todayKey = getDateKey()
    const today = history.find((item) => item.dateKey === todayKey) ?? null
    const clearDays = new Set(
      history.filter((item) => item.score <= 2).map((item) => item.dateKey),
    )

    let consecutiveClearDays = 0
    let cursor = todayKey

    while (clearDays.has(cursor)) {
      consecutiveClearDays += 1
      cursor = getPreviousDateKey(cursor)
    }

    const relapseCount = history.filter((item) => item.score >= 6).length

    return NextResponse.json({
      today,
      consecutiveClearDays,
      relapseCount,
      history,
      dailyContent,
      brothers,
      appState: {
        user: toSafeUser(user),
        providers: {
          user: providerToSummary(userProvider),
          admin: providerToSummary(adminProvider),
        },
        brothers,
        registrationMode,
      },
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: '数据库还没连上，统计暂时睡过去了。' },
      { status: 503 },
    )
  }
}
