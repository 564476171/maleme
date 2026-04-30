import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, requireApiAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const deleteSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('checkIn'), id: z.string() }),
  z.object({ type: z.literal('aiReflection'), id: z.string() }),
  z.object({ type: z.literal('userRecords'), userId: z.string() }),
])

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  const guard = requireApiAdmin(user)

  if (guard) {
    return guard
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: '删除参数不正确。' }, { status: 400 })
  }

  if (parsed.data.type === 'checkIn') {
    await prisma.checkIn.delete({ where: { id: parsed.data.id } })
  }

  if (parsed.data.type === 'aiReflection') {
    await prisma.aiReflection.delete({ where: { id: parsed.data.id } })
  }

  if (parsed.data.type === 'userRecords') {
    await prisma.$transaction([
      prisma.checkIn.deleteMany({ where: { userId: parsed.data.userId } }),
      prisma.aiReflection.deleteMany({ where: { userId: parsed.data.userId } }),
    ])
  }

  return NextResponse.json({ ok: true })
}
