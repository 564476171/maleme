import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSession, createUser, toSafeUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRegistrationMode } from '@/lib/settings'

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  inviteCode: z.string().trim().optional(),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: '请填写有效邮箱，密码至少 8 位。' },
      { status: 400 },
    )
  }

  const registrationMode = await getRegistrationMode()

  if (registrationMode === 'CLOSED') {
    return NextResponse.json({ error: '当前未开放注册。' }, { status: 403 })
  }

  const email = parsed.data.email.toLowerCase()
  const exists = await prisma.user.findUnique({ where: { email } })

  if (exists) {
    return NextResponse.json({ error: '这个邮箱已经注册过。' }, { status: 409 })
  }

  let role: 'USER' | 'VIP' = 'USER'
  let inviteId: string | null = null

  if (registrationMode === 'INVITE') {
    if (!parsed.data.inviteCode) {
      return NextResponse.json({ error: '请填写邀请码。' }, { status: 400 })
    }

    const invite = await prisma.inviteCode.findUnique({
      where: { code: parsed.data.inviteCode },
    })

    if (
      !invite ||
      invite.disabled ||
      invite.usedCount >= invite.maxUses ||
      (invite.expiresAt && invite.expiresAt <= new Date())
    ) {
      return NextResponse.json({ error: '邀请码无效或已过期。' }, { status: 403 })
    }

    role = invite.role === 'VIP' ? 'VIP' : 'USER'
    inviteId = invite.id
  }

  const user = await createUser({
    email,
    password: parsed.data.password,
    role,
  })

  if (inviteId) {
    await prisma.inviteCode.update({
      where: { id: inviteId },
      data: { usedCount: { increment: 1 } },
    })
  }

  await createSession(user.id)

  return NextResponse.json({ user: toSafeUser(user) })
}
