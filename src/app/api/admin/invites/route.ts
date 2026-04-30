import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, requireApiAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  code: z.string().trim().min(3).max(64),
  role: z.enum(['USER', 'VIP']).default('USER'),
  maxUses: z.number().int().min(1).max(999).default(1),
})

const patchSchema = z.object({
  id: z.string(),
  disabled: z.boolean(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  const guard = requireApiAdmin(user)

  if (guard) {
    return guard
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: '邀请码参数不正确。' }, { status: 400 })
  }

  const invite = await prisma.inviteCode.create({
    data: parsed.data,
  })

  return NextResponse.json({ invite })
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  const guard = requireApiAdmin(user)

  if (guard) {
    return guard
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: '邀请码更新参数不正确。' }, { status: 400 })
  }

  const invite = await prisma.inviteCode.update({
    where: { id: parsed.data.id },
    data: { disabled: parsed.data.disabled },
  })

  return NextResponse.json({ invite })
}
