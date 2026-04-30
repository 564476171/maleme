import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { type User, type UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  createSessionToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '@/lib/security'

export const sessionCookieName = 'maleme_session'
const sessionDays = 30

export type SafeUser = Pick<
  User,
  'id' | 'email' | 'role' | 'disabled' | 'createdAt'
>

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    disabled: user.disabled,
    createdAt: user.createdAt,
  }
}

export async function createSession(userId: string) {
  const token = createSessionToken()
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(sessionCookieName)?.value

  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    })
  }

  cookieStore.delete(sessionCookieName)
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(sessionCookieName)?.value

  if (!token) {
    return null
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })

  if (!session || session.expiresAt <= new Date() || session.user.disabled) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    }

    return null
  }

  return session.user
}

export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

export async function requireAdmin() {
  const user = await requireUser()

  if (user.role !== 'ADMIN') {
    redirect('/')
  }

  return user
}

export function requireApiUser(user: User | null) {
  if (!user) {
    return Response.json({ error: '请先登录。' }, { status: 401 })
  }

  return null
}

export function requireApiAdmin(user: User | null) {
  if (!user) {
    return Response.json({ error: '请先登录。' }, { status: 401 })
  }

  if (user.role !== 'ADMIN') {
    return Response.json({ error: '需要管理员权限。' }, { status: 403 })
  }

  return null
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!user || user.disabled) {
    return null
  }

  const valid = await verifyPassword(password, user.passwordHash)

  return valid ? user : null
}

export async function createUser({
  email,
  password,
  role = 'USER',
}: {
  email: string
  password: string
  role?: UserRole
}) {
  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role,
    },
  })
}

export async function setUserPassword(userId: string, password: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  })
}
