import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDateKey, summarizeScore } from '@/lib/scoring'

const checkInSchema = z.object({
  answers: z.record(z.string(), z.boolean()),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: '请先登录。' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = checkInSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: '提交内容格式不对，恋爱脑可以乱，数据不能乱。' },
      { status: 400 },
    )
  }

  const dateKey = getDateKey()
  const summary = summarizeScore(parsed.data.answers)

  try {
    const checkIn = await prisma.checkIn.upsert({
      where: {
        userId_dateKey: {
          userId: user.id,
          dateKey,
        },
      },
      update: {
        answers: parsed.data.answers,
        score: summary.score,
        level: summary.level,
      },
      create: {
        userId: user.id,
        dateKey,
        answers: parsed.data.answers,
        score: summary.score,
        level: summary.level,
      },
    })

    return NextResponse.json({
      checkIn,
      summary,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: '数据库还没清醒，稍后再提交今日指数。' },
      { status: 503 },
    )
  }
}
