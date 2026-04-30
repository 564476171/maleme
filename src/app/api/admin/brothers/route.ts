import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, requireApiAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  id: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(40),
  mbti: z.string().trim().max(20).optional(),
  description: z.string().trim().min(1).max(500),
  catchphrase: z.string().trim().max(120).optional(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  const guard = requireApiAdmin(user)

  if (guard) {
    return guard
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: '兄弟人设参数不正确。' }, { status: 400 })
  }

  const brother = await prisma.brotherPersona.upsert({
    where: { id: parsed.data.id },
    update: {
      name: parsed.data.name,
      mbti: parsed.data.mbti || null,
      description: parsed.data.description,
      catchphrase: parsed.data.catchphrase || null,
      enabled: parsed.data.enabled,
      sortOrder: parsed.data.sortOrder,
    },
    create: {
      id: parsed.data.id,
      name: parsed.data.name,
      mbti: parsed.data.mbti || null,
      description: parsed.data.description,
      catchphrase: parsed.data.catchphrase || null,
      enabled: parsed.data.enabled,
      sortOrder: parsed.data.sortOrder,
    },
  })

  return NextResponse.json({ brother })
}
