import { NextResponse } from 'next/server'
import { getCurrentUser, requireApiAdmin } from '@/lib/auth'
import {
  fetchModels,
  getAdminProvider,
  providerInputSchema,
  providerToSummary,
  saveProvider,
} from '@/lib/provider'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  const guard = requireApiAdmin(user)

  if (guard) {
    return guard
  }

  const parsed = providerInputSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json(
      { error: '请填写有效 URL、模型和 API Key。' },
      { status: 400 },
    )
  }

  const existingProvider = await getAdminProvider()

  if (!existingProvider && !parsed.data.apiKey) {
    return NextResponse.json(
      { error: '首次保存管理员模型时需要填写 API Key。' },
      { status: 400 },
    )
  }

  const provider = await saveProvider({
    scope: 'ADMIN',
    input: parsed.data,
  })

  return NextResponse.json({ provider: providerToSummary(provider) })
}

export async function PUT(request: Request) {
  const user = await getCurrentUser()
  const guard = requireApiAdmin(user)

  if (guard) {
    return guard
  }

  const parsed = providerInputSchema
    .pick({ url: true, apiKey: true })
    .safeParse(await request.json().catch(() => null))

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
