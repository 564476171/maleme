import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser, requireApiAdmin } from '@/lib/auth'
import { setRegistrationMode } from '@/lib/settings'

const schema = z.object({
  registrationMode: z.enum(['OPEN', 'INVITE', 'CLOSED']),
})

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  const guard = requireApiAdmin(user)

  if (guard) {
    return guard
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: '注册策略不正确。' }, { status: 400 })
  }

  await setRegistrationMode(parsed.data.registrationMode)

  return NextResponse.json({ ok: true })
}
