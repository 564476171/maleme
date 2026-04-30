import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getUserProvider,
  providerInputSchema,
  providerToSummary,
  saveProvider,
} from '@/lib/provider'

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: '请先登录。' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = providerInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: '请填写有效 URL、模型和 API Key。' },
      { status: 400 },
    )
  }

  const existingProvider = await getUserProvider(user.id)

  if (!existingProvider && !parsed.data.apiKey) {
    return NextResponse.json(
      { error: '首次保存模型时需要填写 API Key。' },
      { status: 400 },
    )
  }

  const provider = await saveProvider({
    scope: 'USER',
    userId: user.id,
    input: parsed.data,
  })

  return NextResponse.json({ provider: providerToSummary(provider) })
}
