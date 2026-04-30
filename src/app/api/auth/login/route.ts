import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticate, createSession, toSafeUser } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: '邮箱或密码格式不对。' }, { status: 400 })
  }

  const user = await authenticate(parsed.data.email, parsed.data.password)

  if (!user) {
    return NextResponse.json({ error: '邮箱或密码不对。' }, { status: 401 })
  }

  await createSession(user.id)

  return NextResponse.json({ user: toSafeUser(user) })
}
