import { NextResponse } from 'next/server'
import { getCurrentUser, requireApiAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAdminProvider, providerToSummary } from '@/lib/provider'
import { getRegistrationMode } from '@/lib/settings'

export async function GET() {
  const user = await getCurrentUser()
  const guard = requireApiAdmin(user)

  if (guard) {
    return guard
  }

  const [
    users,
    registrationMode,
    invites,
    adminProvider,
    brothers,
    content,
    checkIns,
    reflections,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        disabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            checkIns: true,
            aiReflections: true,
          },
        },
      },
    }),
    getRegistrationMode(),
    prisma.inviteCode.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    getAdminProvider(),
    prisma.brotherPersona.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
    prisma.contentItem.findMany({
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.checkIn.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { email: true } } },
    }),
    prisma.aiReflection.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { email: true } } },
    }),
  ])

  return NextResponse.json({
    users,
    registrationMode,
    invites,
    adminProvider: providerToSummary(adminProvider),
    brothers,
    content,
    checkIns,
    reflections,
  })
}
