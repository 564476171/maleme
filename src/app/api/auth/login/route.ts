import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticate, createSession, toSafeUser } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

function loginRedirect(request: Request, error?: string) {
  const path = error ? `/login?error=${error}` : '/'
  const url = new URL(path, request.url)
  const response = NextResponse.redirect(url, { status: 303 })

  response.headers.set('Location', path)

  return response
}

export async function POST(request: Request) {
  const isJson = request.headers
    .get('content-type')
    ?.toLowerCase()
    .includes('application/json')
  const body = isJson
    ? await request.json().catch(() => null)
    : Object.fromEntries((await request.formData()).entries())
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    if (!isJson) {
      return loginRedirect(request, 'format')
    }

    return NextResponse.json({ error: '邮箱或密码格式不对。' }, { status: 400 })
  }

  const user = await authenticate(parsed.data.email, parsed.data.password)

  if (!user) {
    if (!isJson) {
      return loginRedirect(request, 'credentials')
    }

    return NextResponse.json({ error: '邮箱或密码不对。' }, { status: 401 })
  }

  await createSession(user.id)

  if (!isJson) {
    return loginRedirect(request)
  }

  return NextResponse.json({ user: toSafeUser(user) })
}
