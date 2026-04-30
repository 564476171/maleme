import { NextResponse } from 'next/server'
import { aiRequestSchema, generateAiResponse } from '@/lib/ai'
import { getCurrentUser } from '@/lib/auth'
import { getEnabledBrothers } from '@/lib/content-db'
import { prisma } from '@/lib/prisma'
import { resolveProviderForUser } from '@/lib/provider'

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: '请先登录。' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = aiRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: '描述太短或太长了，先把剧情压缩成真人能读懂的版本。' },
      { status: 400 },
    )
  }

  try {
    const allBrothers = await getEnabledBrothers()
    const selectedBrothers =
      parsed.data.mode === 'broGroup'
        ? allBrothers.filter((brother) =>
            parsed.data.brotherIds.length
              ? parsed.data.brotherIds.includes(brother.id)
              : true,
          )
        : []
    const provider = await resolveProviderForUser({
      user,
      source: parsed.data.providerSource,
    })
    const output = await generateAiResponse({
      mode: parsed.data.mode,
      input: parsed.data.input,
      provider,
      brothers: selectedBrothers,
    })

    await prisma.aiReflection.create({
      data: {
        userId: user.id,
        mode: parsed.data.mode,
        input: parsed.data.input,
        output,
      },
    })

    return NextResponse.json(output)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '骂醒服务刚刚噎住了。先别发消息，刷新重试，或者直接去洗澡。',
      },
      { status: 500 },
    )
  }
}
