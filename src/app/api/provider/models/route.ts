import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { fetchModels } from '@/lib/provider'

const modelsSchema = z.object({
  url: z.string().trim().url(),
  apiKey: z.string().trim().optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: '请先登录。' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = modelsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: '请填写有效 URL。' }, { status: 400 })
  }

  try {
    const models = await fetchModels(parsed.data)

    return NextResponse.json({ models })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '模型列表获取失败，请手动填写。',
      },
      { status: 502 },
    )
  }
}
