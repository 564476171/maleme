import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, requireApiAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const upsertSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['DAILY_ROAST', 'DAILY_TASK']),
  content: z.string().trim().min(1).max(500),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
})

const deleteSchema = z.object({
  id: z.string(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  const guard = requireApiAdmin(user)

  if (guard) {
    return guard
  }

  const parsed = upsertSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: '内容参数不正确。' }, { status: 400 })
  }

  const item = parsed.data.id
    ? await prisma.contentItem.update({
        where: { id: parsed.data.id },
        data: {
          type: parsed.data.type,
          content: parsed.data.content,
          enabled: parsed.data.enabled,
          sortOrder: parsed.data.sortOrder,
        },
      })
    : await prisma.contentItem.create({
        data: {
          type: parsed.data.type,
          content: parsed.data.content,
          enabled: parsed.data.enabled,
          sortOrder: parsed.data.sortOrder,
        },
      })

  return NextResponse.json({ item })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  const guard = requireApiAdmin(user)

  if (guard) {
    return guard
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: '缺少内容 ID。' }, { status: 400 })
  }

  await prisma.contentItem.delete({ where: { id: parsed.data.id } })

  return NextResponse.json({ ok: true })
}
