import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, requireApiAdmin, setUserPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const patchSchema = z.object({
  userId: z.string(),
  role: z.enum(['USER', 'VIP', 'ADMIN']).optional(),
  disabled: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
})

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser()
  const guard = requireApiAdmin(currentUser)

  if (guard) {
    return guard
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: '用户更新参数不正确。' }, { status: 400 })
  }

  if (
    parsed.data.userId === currentUser?.id &&
    (parsed.data.disabled === true || (parsed.data.role && parsed.data.role !== 'ADMIN'))
  ) {
    return NextResponse.json(
      { error: '不能把当前管理员账号降权或禁用。' },
      { status: 400 },
    )
  }

  if (parsed.data.password) {
    await setUserPassword(parsed.data.userId, parsed.data.password)
  }

  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      role: parsed.data.role,
      disabled: parsed.data.disabled,
    },
    select: {
      id: true,
      email: true,
      role: true,
      disabled: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (parsed.data.disabled) {
    await prisma.session.deleteMany({ where: { userId: parsed.data.userId } })
  }

  return NextResponse.json({ user })
}
